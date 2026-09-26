import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mediket_patient/data.dart';
import 'package:mediket_patient/firebase_device.dart';
import 'package:mediket_patient/device_panel.dart';

void main() {
  testWidgets(
    'Master controls fit a compact phone and confirm mocked temperature commands',
    (tester) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var refreshes = 0;
      final requests = <String>[];
      final device = FirebaseDevice(
        const FirebaseDeviceConfig(
          temperatureUrl: 'https://temperature.firebaseio.com',
          temperatureAuth: 'test-only',
        ),
        client: MockClient((request) async {
          requests.add(request.body);
          return http.Response(request.body, 200);
        }),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DevicePanel(
                device: device,
                feed: const VitalFeed(
                  {},
                  '',
                  '',
                  controls: {'bp': 'OFF', 'temperature': 'OFF'},
                  sourceData: {
                    'BP diagnostics': {'mov': false, 'ihb': false},
                  },
                  patientDetails: {'patientId': 'test'},
                ),
                onRefresh: () async {
                  refreshes++;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Temperature ON'));
      await tester.tap(find.text('Temperature ON'));
      await tester.pumpAndSettle();
      expect(requests, ['"ON"']);
      expect(refreshes, 1);
      expect(find.text('ON saved to Firebase.'), findsOneWidget);
      await tester.ensureVisible(find.text('All received Firebase fields'));
      await tester.tap(find.text('All received Firebase fields'));
      await tester.pumpAndSettle();
      expect(find.textContaining('"mov"'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
