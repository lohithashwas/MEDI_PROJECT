import 'dart:convert';
import 'package:http/http.dart' as http;
import 'data.dart';

/// Only the private master build supplies credentials through a local defines file.
/// Embedded credentials are extractable; this is not a public-distribution build.
class FirebaseDeviceConfig {
  final String bpUrl,
      bpAuth,
      controlUrl,
      controlAuth,
      temperatureUrl,
      temperatureAuth,
      vitalsUrl,
      vitalsAuth,
      vitalsPath;
  const FirebaseDeviceConfig({
    this.bpUrl = const String.fromEnvironment('BP_FIREBASE_URL'),
    this.bpAuth = const String.fromEnvironment('BP_FIREBASE_AUTH'),
    this.controlUrl = const String.fromEnvironment('BP_CONTROL_FIREBASE_URL'),
    this.controlAuth = const String.fromEnvironment('BP_CONTROL_FIREBASE_AUTH'),
    this.temperatureUrl = const String.fromEnvironment(
      'TEMPERATURE_FIREBASE_URL',
    ),
    this.temperatureAuth = const String.fromEnvironment(
      'TEMPERATURE_FIREBASE_AUTH',
    ),
    this.vitalsUrl = const String.fromEnvironment('MEDIKET_FIREBASE_URL'),
    this.vitalsAuth = const String.fromEnvironment('MEDIKET_FIREBASE_AUTH'),
    this.vitalsPath = const String.fromEnvironment('MEDIKET_VITALS_PATH'),
  });
  bool get configured =>
      bpUrl.isNotEmpty &&
      bpAuth.isNotEmpty &&
      temperatureUrl.isNotEmpty &&
      temperatureAuth.isNotEmpty;
}

class FirebaseDevice {
  final FirebaseDeviceConfig config;
  final http.Client client;
  final Future<void> Function(Duration) delay;
  FirebaseDevice(
    this.config, {
    http.Client? client,
    Future<void> Function(Duration)? delay,
  }) : client = client ?? http.Client(),
       delay = delay ?? Future<void>.delayed;

  Uri endpoint(String origin, String path, String auth) {
    final base = Uri.parse(origin);
    if (base.scheme != 'https' ||
        base.userInfo.isNotEmpty ||
        !RegExp(
          r'\.(firebaseio\.com|firebasedatabase\.app)$',
        ).hasMatch(base.host) ||
        auth.isEmpty) {
      throw const FormatException('Firebase source not configured');
    }
    return base.replace(
      path: '/${path.replaceAll(RegExp(r'^/+|\.json$'), '')}.json',
      queryParameters: {'auth': auth},
      fragment: '',
    );
  }

  Future<dynamic> read(String origin, String path, String auth) async {
    final response = await client
        .get(endpoint(origin, path, auth))
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) {
      throw const FormatException('Firebase feed unavailable');
    }
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> source(
    String origin,
    String path,
    String auth,
  ) async {
    try {
      return {'ok': true, 'data': await read(origin, path, auth)};
    } catch (_) {
      return {'ok': false, 'data': null};
    }
  }

  static num? number(dynamic value, num min, num max) {
    final n = value is num
        ? value
        : value is String
        ? num.tryParse(value)
        : null;
    return n != null && n.isFinite && n >= min && n <= max ? n : null;
  }

  static String? timestamp(dynamic value) {
    if (value is num && value.isFinite) {
      try {
        return DateTime.fromMillisecondsSinceEpoch(
          (value < 1e12 ? value * 1000 : value).round(),
          isUtc: true,
        ).toIso8601String();
      } catch (_) {
        return null;
      }
    }
    return value is String && value.trim().isNotEmpty ? value : null;
  }

  Future<VitalFeed> fetch() async {
    final results = await Future.wait([
      source(config.bpUrl, 'latest', config.bpAuth),
      source(config.temperatureUrl, 'temperature', config.temperatureAuth),
      config.vitalsPath.isEmpty
          ? Future.value({'ok': false, 'data': null})
          : source(config.vitalsUrl, config.vitalsPath, config.vitalsAuth),
      source(config.controlUrl, 'control/state', config.controlAuth),
      source(config.temperatureUrl, 'control/state', config.temperatureAuth),
    ]);
    final bp = results[0]['data'] is Map ? results[0]['data'] as Map : {};
    final patient = results[2]['data'] is Map ? results[2]['data'] as Map : {};
    final values = <String, dynamic>{}, measured = <String, dynamic>{};
    final at = timestamp(patient['updatedAt'] ?? patient['timestamp']);
    final bpAt = timestamp(bp['datetime']);
    final sys = number(bp['sys'], 20, 300), dia = number(bp['dia'], 10, 200);
    if (sys != null && dia != null && sys > dia) {
      values['bloodPressure'] =
          '${sys.toStringAsFixed(0)}/${dia.toStringAsFixed(0)}';
    }
    measured['bloodPressure'] = bpAt;
    // The independent scalar source is always Fahrenheit; never infer its unit.
    final fahrenheit = number(results[1]['data'], 77, 113);
    if (fahrenheit != null) {
      values['temperature'] = double.parse(
        ((fahrenheit - 32) * 5 / 9).toStringAsFixed(2),
      );
      values['temperatureF'] = fahrenheit;
    }
    measured['temperature'] =
        null; // Scalar source provides no measurement timestamp.
    final aliases = {
      'heartRate': ['heartRate', 'heart_rate', 'Heart Rate'],
      'spo2': ['spo2', 'SpO2', 'oxygenSaturation'],
      'glucose': ['glucose', 'Glucose'],
      'stressLevel': ['stressLevel', 'Stress_Level'],
      'steps': ['steps', 'Steps'],
      'bmi': ['bmi', 'BMI'],
    };
    final ranges = {
      'heartRate': [1, 350],
      'spo2': [1, 100],
      'glucose': [10, 1500],
      'stressLevel': [0, 100],
      'steps': [0, 1000000],
      'bmi': [12, 98],
    };
    for (final entry in aliases.entries) {
      dynamic raw;
      for (final key in entry.value) {
        if (patient[key] != null) {
          raw = patient[key];
          break;
        }
      }
      final bounds = ranges[entry.key]!;
      final value = number(raw, bounds[0], bounds[1]);
      if (value != null && (entry.key != 'steps' || value == value.round())) {
        values[entry.key] = value;
        final times = patient['measuredAt'];
        measured[entry.key] = timestamp(
          times is Map ? times[entry.key] ?? at : at,
        );
      }
    }
    final ecg = patient['ecg'] is Map
        ? patient['ecg']['samples']
        : patient['ecg'];
    if (ecg is List &&
        ecg.length >= 2 &&
        ecg.every((v) => v is num && v.isFinite)) {
      values['ecg'] = ecg
          .skip(ecg.length > 1000 ? ecg.length - 1000 : 0)
          .toList();
    }
    final details = <String, dynamic>{};
    for (final key in ['name', 'patientId', 'cardUid', 'readerId']) {
      if (patient[key] is String &&
          (patient[key] as String).trim().isNotEmpty) {
        details[key] = patient[key];
      }
    }
    for (final key in ['latitude', 'longitude']) {
      final n = number(
        patient[key],
        key == 'latitude' ? -90 : -180,
        key == 'latitude' ? 90 : 180,
      );
      if (n != null) details[key] = n;
    }
    return VitalFeed(
      values,
      results[0]['ok'] != true
          ? 'BP feed unavailable'
          : values.containsKey('bloodPressure')
          ? 'project-a0538 · /latest · unassigned'
          : 'BP has no usable reading',
      results[2]['ok'] != true
          ? 'Patient feed unavailable'
          : 'Patient feed connected · ${config.vitalsPath}',
      bpAt: bpAt,
      vitalsAt: at,
      measuredAt: measured,
      patientDetails: details,
      sourceData: {
        'project-a0538 /latest': bp,
        'temperture-89982 /temperature (Fahrenheit)': results[1]['data'],
        'Patient vitals /${config.vitalsPath}': patient,
        'bp-and-temp /control/state': results[3]['data'],
        'temperture-89982 /control/state': results[4]['data'],
      },
      fetchedAt: DateTime.now(),
      temperatureStatus: results[1]['ok'] != true
          ? 'Temperature feed unavailable'
          : fahrenheit == null
          ? 'No usable temperature'
          : 'temperture-89982 · /temperature · °F source',
      controls: {
        for (final item in {'bp': 3, 'temperature': 4}.entries)
          item.key: ['ON', 'OFF'].contains(results[item.value]['data'])
              ? results[item.value]['data'] as String
              : 'UNKNOWN',
      },
    );
  }

  Future<String> setControl(String device, String action) async {
    if (!['bp', 'temperature'].contains(device) ||
        !['ON', 'OFF'].contains(action)) {
      throw const FormatException('Invalid device command');
    }
    final bp = device == 'bp';
    try {
      final response = await client
          .put(
            endpoint(
              bp ? config.controlUrl : config.temperatureUrl,
              'control/state',
              bp ? config.controlAuth : config.temperatureAuth,
            ),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(action),
          )
          .timeout(const Duration(seconds: 8));
      if (response.statusCode != 200 || jsonDecode(response.body) != action) {
        throw const FormatException();
      }
      return action;
    } catch (_) {
      throw Exception(
        'Command not confirmed. Device state is unknown; check the device and retry OFF.',
      );
    }
  }

  Future<void> startBP() async {
    try {
      await setControl('bp', 'ON');
      await delay(const Duration(seconds: 2));
    } finally {
      // Best effort even when ON times out: it may have reached the device.
      await setControl('bp', 'OFF');
    }
  }

  void close() => client.close();
}
