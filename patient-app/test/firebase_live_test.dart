import 'package:flutter_test/flutter_test.dart';
import 'package:mediket_patient/firebase_device.dart';

void main() {
  test(
    'Private build reads all configured Firebase feeds without server pairing',
    () async {
      final device = FirebaseDevice(const FirebaseDeviceConfig());
      addTearDown(device.close);
      expect(device.config.configured, true);
      final feed = await device.fetch();
      expect(
        feed.values.containsKey('bloodPressure'),
        true,
        reason: 'BP reading available',
      );
      expect(
        feed.values.containsKey('temperature'),
        true,
        reason: 'Independent Fahrenheit source available',
      );
      expect(
        feed.bpAt != null,
        true,
        reason: 'BP measurement timestamp preserved',
      );
      expect(
        feed.patientDetails.containsKey('patientId'),
        true,
        reason: 'Configured patient feed reachable',
      );
      expect(
        feed.controls.values.every((value) => ['ON', 'OFF'].contains(value)),
        true,
      );
      expect(feed.sourceData.length, 5);
    },
    skip: !const bool.fromEnvironment('LIVE_FIREBASE_TEST'),
  );
}
