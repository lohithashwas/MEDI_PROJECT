import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mediket_patient/firebase_device.dart';

const config = FirebaseDeviceConfig(
  bpUrl: 'https://bp.firebaseio.com/latest.json',
  bpAuth: 'bp-test',
  controlUrl: 'https://control.firebaseio.com',
  controlAuth: 'control-test',
  temperatureUrl: 'https://temperature.firebaseio.com',
  temperatureAuth: 'temperature-test',
  vitalsUrl: 'https://patient.firebaseio.com',
  vitalsAuth: 'patient-test',
  vitalsPath: 'users/test/vitals/latest',
);

void main() {
  test(
    'Exact independent paths, Fahrenheit conversion, metadata and zero handling',
    () async {
      final paths = <String>[];
      final device = FirebaseDevice(
        config,
        client: MockClient((request) async {
          paths.add('${request.url.host}${request.url.path}');
          dynamic data;
          switch (request.url.host) {
            case 'bp.firebaseio.com':
              expect(request.url.queryParameters['auth'], 'bp-test');
              data = {
                'sys': 120,
                'dia': 80,
                'datetime': '2026-09-25T12:00:00Z',
                'bpm': 999,
              };
            case 'temperature.firebaseio.com':
              expect(request.url.queryParameters['auth'], 'temperature-test');
              data = request.url.path == '/temperature.json' ? 98.6 : 'OFF';
            case 'patient.firebaseio.com':
              data = {
                'heartRate': 0,
                'spo2': 98,
                'steps': 0,
                'stressLevel': 0,
                'temperature': 555,
                'patientId': 'test',
                'name': 'Example',
                'ecg': [0, 1, 0],
                'updatedAt': 1750000000000,
              };
            default:
              data = 'ON';
          }
          return http.Response(jsonEncode(data), 200);
        }),
      );
      final feed = await device.fetch();
      expect(feed.values['bloodPressure'], '120/80');
      expect(feed.values['temperature'], 37);
      expect(feed.values['temperatureF'], 98.6);
      expect(feed.values.containsKey('heartRate'), false);
      expect(feed.values['steps'], 0);
      expect(feed.values['stressLevel'], 0);
      expect(feed.measuredAt['temperature'], null);
      expect(feed.freshness('temperature'), 'TIME UNKNOWN');
      expect(feed.bpAt, '2026-09-25T12:00:00Z');
      expect(feed.patientDetails['patientId'], 'test');
      expect(feed.controls, {'bp': 'ON', 'temperature': 'OFF'});
      expect(paths.toSet(), {
        'bp.firebaseio.com/latest.json',
        'temperature.firebaseio.com/temperature.json',
        'patient.firebaseio.com/users/test/vitals/latest.json',
        'control.firebaseio.com/control/state.json',
        'temperature.firebaseio.com/control/state.json',
      });
    },
  );
  test(
    'One failed source preserves the other independently measured fields',
    () async {
      final device = FirebaseDevice(
        config,
        client: MockClient(
          (request) async => request.url.path == '/temperature.json'
              ? http.Response('98.6', 200)
              : http.Response('denied', 401),
        ),
      );
      final feed = await device.fetch();
      expect(feed.values, {'temperature': 37.0, 'temperatureF': 98.6});
      expect(feed.controls, {'bp': 'UNKNOWN', 'temperature': 'UNKNOWN'});
      expect(feed.bpStatus, 'BP feed unavailable');
    },
  );
  test('Invalid values and malformed JSON never become readings', () async {
    final device = FirebaseDevice(
      config,
      client: MockClient(
        (request) async => http.Response(
          request.url.path == '/latest.json' ? '{"sys":70,"dia":120}' : '{bad',
          200,
        ),
      ),
    );
    expect((await device.fetch()).values, isEmpty);
    expect(FirebaseDevice.number(true, 0, 100), null);
    expect(FirebaseDevice.number('NaN', 0, 100), null);
  });
  test('BP writes ON then OFF only to the BP control database', () async {
    final states = <String>[];
    final device = FirebaseDevice(
      config,
      delay: (duration) async => expect(duration, const Duration(seconds: 2)),
      client: MockClient((request) async {
        expect(request.method, 'PUT');
        expect(request.url.host, 'control.firebaseio.com');
        expect(request.url.path, '/control/state.json');
        expect(request.url.queryParameters['auth'], 'control-test');
        states.add(jsonDecode(request.body));
        return http.Response(request.body, 200);
      }),
    );
    await device.startBP();
    expect(states, ['ON', 'OFF']);
  });
  test('BP still attempts OFF when ON acknowledgement fails', () async {
    final states = <String>[];
    final device = FirebaseDevice(
      config,
      client: MockClient((request) async {
        states.add(jsonDecode(request.body));
        return http.Response(request.body, states.length == 1 ? 500 : 200);
      }),
    );
    await expectLater(device.startBP(), throwsException);
    expect(states, ['ON', 'OFF']);
  });
  test(
    'Temperature control uses its own credential and validates acknowledgement',
    () async {
      final device = FirebaseDevice(
        config,
        client: MockClient((request) async {
          expect(request.url.host, 'temperature.firebaseio.com');
          expect(request.url.queryParameters['auth'], 'temperature-test');
          expect(request.body, '"ON"');
          return http.Response('"OFF"', 200);
        }),
      );
      await expectLater(
        device.setControl('temperature', 'ON'),
        throwsException,
      );
    },
  );
  test('Non-Firebase endpoints and invalid commands are rejected', () async {
    final device = FirebaseDevice(config);
    expect(
      () => device.endpoint('https://example.com', 'latest', 'secret'),
      throwsFormatException,
    );
    await expectLater(device.setControl('other', 'ON'), throwsFormatException);
  });
}
