import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mediket_patient/main.dart';
import 'package:mediket_patient/data.dart';

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  test(
    'Measurement age uses per-sensor time, not a newer shared timestamp',
    () {
      final feed = VitalFeed(
        {'heartRate': 70},
        '',
        '',
        vitalsAt: DateTime.now().toIso8601String(),
        measuredAt: {
          'heartRate': DateTime.now()
              .subtract(const Duration(hours: 1))
              .toIso8601String(),
        },
      );
      expect(feed.freshness('heartRate'), 'OLDER READING');
      expect(VitalFeed.empty.freshness('bloodPressure'), 'TIME UNKNOWN');
    },
  );
  testWidgets(
    'Nearby map filters government facilities and identifies proposed centers',
    (tester) async {
      await tester.pumpWidget(const MediKetApp());
      await tester.pumpAndSettle();
      await tester.tap(find.text('Nearby'));
      await tester.pumpAndSettle();
      expect(find.text('Care, closer to you.'), findsOneWidget);
      expect(find.text('CMCHIS · Coverage not yet verified'), findsOneWidget);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Government'));
      await tester.pumpAndSettle();
      expect(find.text('2 places in this area'), findsOneWidget);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Planned center'));
      await tester.pumpAndSettle();
      expect(find.text('3 places in this area'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('Compact 320px phone has no dashboard overflow', (tester) async {
    tester.view.physicalSize = const Size(320, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MediKetApp());
    await tester.pumpAndSettle();
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'Dashboard fits a small phone and shows all seven empty device vitals',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(const MediKetApp());
      await tester.pumpAndSettle();
      expect(find.text('AWAITING DEVICE'), findsOneWidget);
      expect(find.text('118/76'), findsNothing);
      await tester.tap(find.text('View my vitals'));
      await tester.pumpAndSettle();
      for (final label in [
        'Blood pressure',
        'Heart rate',
        'Blood oxygen',
        'Temperature',
        'Blood glucose',
        'Steps today',
        'Device stress index',
      ]) {
        expect(find.text(label), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('Health note can be added and remains in secure local storage', (
    tester,
  ) async {
    await tester.pumpWidget(const MediKetApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Records'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('+ Add note'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextFormField).at(0),
      'Follow-up questions',
    );
    await tester.enterText(
      find.byType(TextFormField).at(1),
      'Ask about the latest device readings.',
    );
    await tester.ensureVisible(find.text('Save health note'));
    await tester.tap(find.text('Save health note'));
    await tester.pumpAndSettle();
    expect(find.text('Follow-up questions'), findsOneWidget);
    final saved = await const FlutterSecureStorage().read(
      key: 'mediket-care-v1',
    );
    expect(saved, contains('Follow-up questions'));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('Schemes filter to Tamil Nadu and can be bookmarked', (
    tester,
  ) async {
    await tester.pumpWidget(const MediKetApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Schemes'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ChoiceChip, 'Tamil Nadu'));
    await tester.pumpAndSettle();
    expect(find.text('CMCHIS'), findsOneWidget);
    expect(find.text('Jan Aushadhi'), findsNothing);
    await tester.tap(find.byTooltip('Save scheme'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ChoiceChip, 'Saved'));
    await tester.pumpAndSettle();
    expect(find.text('CMCHIS'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
