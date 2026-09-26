import 'dart:convert';
import 'package:flutter/material.dart';
import 'data.dart';
import 'firebase_device.dart';

class DevicePanel extends StatefulWidget {
  final FirebaseDevice device;
  final VitalFeed feed;
  final Future<void> Function() onRefresh;
  const DevicePanel({
    super.key,
    required this.device,
    required this.feed,
    required this.onRefresh,
  });
  @override
  State<DevicePanel> createState() => _DevicePanelState();
}

class _DevicePanelState extends State<DevicePanel> {
  final Set<String> busy = {};
  final Map<String, String> messages = {};
  Future<void> command(String device, bool on) async {
    if (busy.contains(device)) return;
    setState(() {
      busy.add(device);
      messages[device] = 'Sending command…';
    });
    try {
      if (device == 'bp' && on) {
        await widget.device.startBP();
      } else {
        await widget.device.setControl(device, on ? 'ON' : 'OFF');
      }
      if (mounted) {
        setState(
          () => messages[device] = device == 'bp' && on
              ? 'ON sent, then OFF confirmed after 2 seconds.'
              : '${on ? 'ON' : 'OFF'} saved to Firebase.',
        );
      }
      await widget.onRefresh();
    } catch (_) {
      if (mounted) {
        setState(
          () => messages[device] =
              'Command not confirmed. Check the device and retry OFF.',
        );
      }
    } finally {
      if (mounted) setState(() => busy.remove(device));
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Connected device controls',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        if (widget.feed.sourceData.isNotEmpty)
          ExpansionTile(
            title: const Text('All received Firebase fields'),
            subtitle: const Text(
              'Read-only source details, including device diagnostics',
            ),
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: SelectableText(
                  const JsonEncoder.withIndent(
                    '  ',
                  ).convert(widget.feed.sourceData),
                  style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
                ),
              ),
            ],
          ),
        const Text(
          'Commands change Firebase control state. A saved command does not confirm a completed hardware measurement.',
          style: TextStyle(fontSize: 12, color: Color(0xff607876)),
        ),
        for (final entry in {
          'bp': 'Blood pressure',
          'temperature': 'Temperature',
        }.entries)
          Card(
            margin: const EdgeInsets.only(top: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.value,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Firebase state: ${widget.feed.controls[entry.key] ?? 'UNKNOWN'}',
                  ),
                  Text(
                    entry.key == 'bp'
                        ? 'bp-and-temp · /control/state'
                        : 'temperture-89982 · /control/state',
                    style: const TextStyle(fontSize: 11),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton(
                        onPressed: busy.contains(entry.key)
                            ? null
                            : () => command(entry.key, true),
                        child: Text(
                          entry.key == 'bp' ? 'BP ON · 2s' : 'Temperature ON',
                        ),
                      ),
                      OutlinedButton(
                        onPressed: busy.contains(entry.key)
                            ? null
                            : () => command(entry.key, false),
                        child: const Text('OFF'),
                      ),
                    ],
                  ),
                  if (messages[entry.key] != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        messages[entry.key]!,
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                ],
              ),
            ),
          ),
        if (widget.feed.patientDetails.isNotEmpty)
          Card(
            margin: const EdgeInsets.only(top: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Device patient details',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const Text(
                    'Identity reported by the configured feed; separate BP and temperature feeds have no patient identifier.',
                    style: TextStyle(fontSize: 12),
                  ),
                  for (final entry in widget.feed.patientDetails.entries)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text('${entry.key}: ${entry.value}'),
                    ),
                ],
              ),
            ),
          ),
        if (widget.feed.values['bmi'] != null)
          ListTile(
            title: const Text('Device BMI'),
            subtitle: Text('${widget.feed.values['bmi']} kg/m²'),
          ),
        if (widget.feed.values['ecg'] is List)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Device ECG samples'),
                  SizedBox(
                    height: 100,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _EcgPainter(
                        List<num>.from(widget.feed.values['ecg']),
                      ),
                    ),
                  ),
                  Text(
                    '${(widget.feed.values['ecg'] as List).length} samples · device units; not a diagnostic ECG',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

class _EcgPainter extends CustomPainter {
  final List<num> samples;
  _EcgPainter(this.samples);
  @override
  void paint(Canvas canvas, Size size) {
    if (samples.length < 2) return;
    final min = samples.reduce((a, b) => a < b ? a : b);
    final max = samples.reduce((a, b) => a > b ? a : b);
    final path = Path();
    for (var i = 0; i < samples.length; i++) {
      final x = i * size.width / (samples.length - 1);
      final y = max == min
          ? size.height / 2
          : size.height -
                8 -
                (samples[i] - min) / (max - min) * (size.height - 16);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = const Color(0xff087f78)
        ..strokeWidth = 1.5
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(covariant _EcgPainter oldDelegate) => true;
}
