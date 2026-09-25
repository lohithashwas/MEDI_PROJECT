import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import 'data.dart';
import 'hospital_map.dart';

const ink = Color(0xff142c39),
    teal = Color(0xff087f78),
    mint = Color(0xffe4f4ee),
    muted = Color(0xff6c7e85),
    canvas = Color(0xfff4f7f8),
    line = Color(0xffe5ecee);
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MediKetApp());
}

class MediKetApp extends StatelessWidget {
  const MediKetApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'MediKet Care',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: canvas,
      colorScheme: ColorScheme.fromSeed(
        seedColor: teal,
        primary: teal,
        surface: Colors.white,
      ),
      fontFamily: 'Roboto',
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w800,
          color: ink,
          letterSpacing: -1.2,
        ),
        headlineSmall: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: ink,
          letterSpacing: -.6,
        ),
        titleLarge: TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: ink,
        ),
        bodyMedium: TextStyle(fontSize: 14, height: 1.5, color: ink),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: canvas,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: canvas,
        foregroundColor: ink,
        elevation: 0,
      ),
      dividerTheme: const DividerThemeData(color: line, space: 28),
    ),
    home: const PatientHome(),
  );
}

class PatientHome extends StatefulWidget {
  const PatientHome({super.key});
  @override
  State<PatientHome> createState() => _PatientHomeState();
}

class _PatientHomeState extends State<PatientHome> with WidgetsBindingObserver {
  final storage = const FlutterSecureStorage();
  final scroll = ScrollController();
  final vitalsKey = GlobalKey();
  int tab = 0, water = 0, generation = 0;
  bool loading = false, loaded = false;
  String name = 'there',
      base = const String.fromEnvironment('MEDIKET_SERVER'),
      token = '',
      connectionError = '',
      recordFilter = 'All',
      doctorFilter = 'All',
      schemeFilter = 'All';
  List<Map<String, dynamic>> records = [], appointments = [], medicines = [];
  Set<String> saved = {};
  VitalFeed feed = VitalFeed.empty;
  Timer? polling;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    restore();
    polling = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!loading &&
          base.isNotEmpty &&
          token.isNotEmpty &&
          WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        refresh();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    polling?.cancel();
    scroll.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        loaded &&
        base.isNotEmpty &&
        token.isNotEmpty)
      refresh();
  }

  String dayKey() => DateTime.now().toIso8601String().substring(0, 10);
  Future<void> restore() async {
    try {
      final raw = await storage.read(key: 'mediket-care-v1');
      if (raw != null && mounted) {
        final d = jsonDecode(raw);
        setState(() {
          name = d['name'] ?? 'there';
          base = d['base'] ?? base;
          token = d['token'] ?? '';
          records = List<Map<String, dynamic>>.from(
            (d['records'] ?? [])
                .where((x) => x['demo'] != true)
                .map((x) => Map<String, dynamic>.from(x)),
          );
          appointments = [];
          medicines = List<Map<String, dynamic>>.from(
            (d['medicines'] ?? []).map((x) => Map<String, dynamic>.from(x)),
          );
          saved = Set<String>.from(d['saved'] ?? []);
          water = d['waterDate'] == dayKey() ? (d['water'] ?? 0) : 0;
        });
      }
    } catch (_) {
      if (mounted) {
        toast('Saved data could not be opened on this device.');
      }
    }
    if (mounted) {
      setState(() => loaded = true);
      if (base.isNotEmpty && token.isNotEmpty) refresh();
    }
  }

  Future<void> persist() async {
    try {
      await storage.write(
        key: 'mediket-care-v1',
        value: jsonEncode({
          'name': name,
          'base': base,
          'token': token,
          'records': records,
          'appointments': appointments,
          'medicines': medicines,
          'saved': saved.toList(),
          'water': water,
          'waterDate': dayKey(),
        }),
      );
    } catch (_) {
      if (mounted) {
        toast('Changes could not be saved on this device.');
      }
    }
  }

  void toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  void navigate(int index) {
    setState(() => tab = index);
    if (scroll.hasClients) {
      scroll.jumpTo(0);
    }
  }

  Future<void> openLink(String value) async {
    final uri = Uri.tryParse(value);
    if (uri == null ||
        !['https', 'tel'].contains(uri.scheme) ||
        (uri.scheme == 'https' &&
            (uri.host.isEmpty || uri.userInfo.isNotEmpty))) {
      toast('Enter a valid secure HTTPS consultation link.');
      return;
    }
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
          mounted) {
        toast('No app could open this link.');
      }
    } catch (_) {
      if (mounted) {
        toast('Unable to open this link on your device.');
      }
    }
  }

  Future<void> refresh() async {
    if (base.isEmpty || token.isEmpty) {
      setState(
        () => connectionError =
            'Connect your device in Profile to receive measurements.',
      );
      return;
    }
    if (loading) return;
    final version = ++generation;
    setState(() {
      loading = true;
      connectionError = '';
    });
    try {
      final result = await VitalFeed.fetch(base, token);
      if (mounted && version == generation) {
        setState(() => feed = result);
      }
    } catch (e) {
      if (mounted && version == generation) {
        setState(() {
          feed = VitalFeed.empty;
          connectionError = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted && version == generation) {
        setState(() => loading = false);
      }
    }
  }

  Widget small(String text, {Color color = muted}) =>
      Text(text, style: TextStyle(fontSize: 12, color: color, height: 1.5));
  Widget title(String text) =>
      Text(text, style: Theme.of(context).textTheme.titleLarge);
  Widget badge(String text, {Color color = teal, Color? background}) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: background ?? color.withValues(alpha: .09),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            color: color,
            letterSpacing: .5,
          ),
        ),
      );
  Widget box(Widget child, {Color color = Colors.white, EdgeInsets? padding}) =>
      Container(
        width: double.infinity,
        padding: padding ?? const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: color == Colors.white ? line : Colors.transparent,
          ),
        ),
        child: child,
      );
  Widget heading(String text, {String? action, VoidCallback? onTap}) => Padding(
    padding: const EdgeInsets.only(top: 26, bottom: 14),
    child: Row(
      children: [
        Expanded(child: title(text)),
        if (action != null)
          TextButton(
            onPressed: onTap,
            child: Text(
              action,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
      ],
    ),
  );
  Widget iconTile(IconData icon, {Color color = teal}) => Container(
    width: 44,
    height: 44,
    decoration: BoxDecoration(
      color: color.withValues(alpha: .09),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Icon(icon, color: color, size: 22),
  );
  Widget intro(String eyebrow, String text, String subtitle) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        eyebrow,
        style: const TextStyle(
          color: teal,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.8,
        ),
      ),
      const SizedBox(height: 8),
      Text(text, style: Theme.of(context).textTheme.headlineLarge),
      const SizedBox(height: 7),
      Text(
        subtitle,
        style: const TextStyle(color: muted, fontSize: 14, height: 1.5),
      ),
      const SizedBox(height: 20),
    ],
  );
  Widget filters(
    List<String> values,
    String selected,
    void Function(String) select,
  ) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(
      children: values
          .map(
            (v) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(v),
                selected: v == selected,
                onSelected: (_) => setState(() => select(v)),
                showCheckmark: false,
                selectedColor: mint,
                side: BorderSide(
                  color: v == selected ? teal.withValues(alpha: .2) : line,
                ),
                labelStyle: TextStyle(
                  color: v == selected ? teal : muted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          )
          .toList(),
    ),
  );
  Widget empty(String text, String detail, IconData icon) => box(
    Column(
      children: [
        Icon(icon, size: 38, color: teal),
        const SizedBox(height: 12),
        title(text),
        const SizedBox(height: 6),
        Text(
          detail,
          textAlign: TextAlign.center,
          style: const TextStyle(color: muted),
        ),
      ],
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      toolbarHeight: 76,
      titleSpacing: 22,
      title: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: teal,
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Icon(
                Icons.add_rounded,
                color: Colors.white,
                size: 29,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'mediket',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 24,
                letterSpacing: -1,
              ),
            ),
            const SizedBox(width: 6),
            const Text('care', style: TextStyle(fontSize: 14, color: teal)),
          ],
        ),
      ),
      actions: [
        IconButton(
          tooltip: 'Care updates',
          onPressed: updates,
          icon: const Icon(Icons.notifications_none_rounded),
        ),
        Padding(
          padding: const EdgeInsets.only(right: 14),
          child: IconButton(
            tooltip: 'Profile and device settings',
            onPressed: settings,
            icon: CircleAvatar(
              radius: 18,
              backgroundColor: mint,
              child: Text(
                name.isEmpty ? 'A' : name[0].toUpperCase(),
                style: const TextStyle(
                  color: teal,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
    body: !loaded
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: refresh,
            child: SingleChildScrollView(
              controller: scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(22, 8, 22, 32),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 920),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ...[
                        dashboard,
                        recordsPage,
                        carePage,
                        schemesPage,
                        nearbyPage,
                      ][tab](),
                      const SizedBox(height: 28),
                      Center(child: small('MADE FOR YOUR EVERYDAY WELLBEING')),
                      const SizedBox(height: 6),
                      Center(child: small('MediKet Care · 1.1')),
                    ],
                  ),
                ),
              ),
            ),
          ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: navigate,
      backgroundColor: Colors.white,
      indicatorColor: mint,
      height: 76,
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.grid_view_outlined),
          selectedIcon: Icon(Icons.grid_view_rounded, color: teal),
          label: 'Home',
        ),
        NavigationDestination(
          icon: Icon(Icons.folder_open_rounded),
          selectedIcon: Icon(Icons.folder_rounded, color: teal),
          label: 'Records',
        ),
        NavigationDestination(
          icon: Icon(Icons.favorite_border_rounded),
          selectedIcon: Icon(Icons.favorite_rounded, color: teal),
          label: 'Care',
        ),
        NavigationDestination(
          icon: Icon(Icons.shield_outlined),
          selectedIcon: Icon(Icons.shield_rounded, color: teal),
          label: 'Schemes',
        ),
        NavigationDestination(
          icon: Icon(Icons.map_outlined),
          selectedIcon: Icon(Icons.map, color: teal),
          label: 'Nearby',
        ),
      ],
    ),
  );

  List<Widget> nearbyPage() => [const HospitalMap()];

  List<Widget> dashboard() => [
    Row(
      children: [
        Expanded(child: small('YOUR HEALTH, IN ONE PLACE')),
        badge(
          loading
              ? 'SYNCING'
              : feed.values.isEmpty
              ? 'AWAITING DEVICE'
              : 'CONNECTED',
          color: teal,
        ),
      ],
    ),
    const SizedBox(height: 10),
    Text('Hello, $name 👋', style: Theme.of(context).textTheme.headlineLarge),
    const SizedBox(height: 4),
    const Text(
      'A little care. A healthier every day.',
      style: TextStyle(color: muted, fontSize: 14),
    ),
    const SizedBox(height: 22),
    Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xff123b42), Color(0xff087f78)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                badge(
                  'YOUR PERSONAL HEALTH SPACE',
                  color: const Color(0xffbdeedd),
                  background: Colors.white.withValues(alpha: .1),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Better health starts\nwith knowing you.',
                  style: TextStyle(
                    fontSize: 25,
                    height: 1.2,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: -.6,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Your vitals, records and care team.\nAlways within reach.',
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.6,
                    color: Color(0xffc2dedb),
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: teal,
                  ),
                  onPressed: () {
                    Scrollable.ensureVisible(
                      vitalsKey.currentContext!,
                      duration: const Duration(milliseconds: 350),
                    );
                  },
                  icon: const Icon(Icons.monitor_heart_outlined, size: 18),
                  label: const Text('View my vitals'),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          const SizedBox(
            width: 54,
            height: 120,
            child: CustomPaint(painter: HealthMark()),
          ),
        ],
      ),
    ),
    const SizedBox(height: 20),
    Row(
      children: [
        quick('Nearby care', Icons.map_outlined, () => navigate(4)),
        const SizedBox(width: 10),
        quick('Video visit', Icons.videocam_outlined, videoOptions),
        const SizedBox(width: 10),
        quick('My records', Icons.description_outlined, () => navigate(1)),
      ],
    ),
    Container(
      key: vitalsKey,
      child: heading(
        'Your vital signs',
        action: loading ? 'Refreshing…' : 'Refresh ↻',
        onTap: loading ? null : refresh,
      ),
    ),
    if (base.isEmpty)
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: FilledButton.icon(
          onPressed: settings,
          icon: const Icon(Icons.sensors),
          label: const Text('Connect my device'),
        ),
      ),
    if (connectionError.isNotEmpty)
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: box(
          Text(
            connectionError,
            style: const TextStyle(color: Color(0xff9b4438)),
          ),
          color: const Color(0xffffefeb),
        ),
      ),
    LayoutBuilder(
      builder: (ctx, c) => GridView.count(
        crossAxisCount: c.maxWidth > 600 ? 3 : 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio:
            ((c.maxWidth - (c.maxWidth > 600 ? 24 : 12)) /
                (c.maxWidth > 600 ? 3 : 2)) /
            (184 * MediaQuery.textScalerOf(context).scale(1)),
        children: [
          vital(
            'Blood pressure',
            'bloodPressure',
            'mmHg',
            Icons.favorite_outline,
            const Color(0xffbf6d60),
          ),
          vital(
            'Heart rate',
            'heartRate',
            'bpm',
            Icons.monitor_heart_outlined,
            teal,
          ),
          vital(
            'Blood oxygen',
            'spo2',
            '%',
            Icons.water_drop_outlined,
            const Color(0xff578bb4),
          ),
          vital(
            'Temperature',
            'temperature',
            '°C',
            Icons.thermostat_outlined,
            const Color(0xffba8a4d),
          ),
          vital(
            'Blood glucose',
            'glucose',
            'mg/dL',
            Icons.bloodtype_outlined,
            const Color(0xff9a78b8),
          ),
          vital(
            'Steps today',
            'steps',
            'steps',
            Icons.directions_walk_rounded,
            const Color(0xff5b9174),
          ),
          vital(
            'Device stress index',
            'stressLevel',
            '%',
            Icons.self_improvement_rounded,
            const Color(0xff8178ab),
          ),
        ],
      ),
    ),
    const SizedBox(height: 12),
    box(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.sensors_rounded, size: 17, color: teal),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Two devices. One clear view.',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          small('BP · ${feed.bpStatus}'),
          small('Other vitals · ${feed.vitalsStatus}'),
          ...[
            const SizedBox(height: 6),
            small('BP measured: ${readableTime(feed.bpAt)}'),
            small('Vitals measured: ${readableTime(feed.vitalsAt)}'),
            const SizedBox(height: 6),
            small(
              'BP is a separate device reading; it is not automatically assigned to your health record.',
            ),
          ],
        ],
      ),
      padding: const EdgeInsets.all(16),
    ),
    heading('Care around you'),
    box(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          title('Kelambakkam · Thiruporur'),
          small(
            'Hospitals, scheme information and planned Mediket centers near SSN College.',
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => navigate(4),
            icon: const Icon(Icons.map_outlined),
            label: const Text('Explore nearby care'),
          ),
        ],
      ),
    ),
    heading('Your daily care', action: 'Manage', onTap: () => navigate(2)),
    box(
      Row(
        children: [
          iconTile(Icons.water_drop_outlined, color: const Color(0xff578bb4)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                title('Water check-in'),
                small('$water glasses logged today'),
                small('Follow your personal fluid advice.'),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Remove glass',
            onPressed: water > 0
                ? () {
                    setState(() => water--);
                    persist();
                  }
                : null,
            icon: const Icon(Icons.remove_circle_outline),
          ),
          IconButton(
            tooltip: 'Add glass',
            onPressed: () {
              setState(() => water++);
              persist();
            },
            icon: const Icon(Icons.add_circle, color: teal),
          ),
        ],
      ),
    ),
    heading(
      'Care that comes to you',
      action: 'View all',
      onTap: () => navigate(2),
    ),
    box(
      ListTile(
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.video_call, color: teal),
        title: const Text('Talk to a clinician'),
        subtitle: const Text('eSanjeevani and your clinic consultation links'),
        onTap: videoOptions,
      ),
    ),
    heading(
      'Support you should know',
      action: 'Explore',
      onTap: () => navigate(3),
    ),
    InkWell(
      onTap: () => schemeDetails(schemes.first),
      borderRadius: BorderRadius.circular(22),
      child: box(
        Row(
          children: [
            iconTile(Icons.shield_outlined),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  badge('TAMIL NADU'),
                  const SizedBox(height: 8),
                  title('Healthcare, within reach.'),
                  small('Explore CMCHIS and national schemes.'),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_rounded, color: teal),
          ],
        ),
        color: mint,
      ),
    ),
    const SizedBox(height: 22),
    TextButton.icon(
      onPressed: emergency,
      icon: const Icon(Icons.emergency_outlined, color: Color(0xffab5145)),
      label: const Text(
        'Emergency help',
        style: TextStyle(color: Color(0xffab5145)),
      ),
    ),
  ];
  String readableTime(String? value) {
    if (value == null || value.isEmpty) {
      return 'Timestamp unavailable';
    }
    final d = DateTime.tryParse(value)?.toLocal();
    return d == null
        ? value
        : '${d.day}/${d.month}/${d.year} · ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  Widget quick(String text, IconData icon, VoidCallback tap) => Expanded(
    child: InkWell(
      onTap: tap,
      borderRadius: BorderRadius.circular(18),
      child: box(
        Column(
          children: [
            Icon(icon, color: teal, size: 24),
            const SizedBox(height: 10),
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 6),
      ),
    ),
  );
  Widget vital(
    String label,
    String key,
    String unit,
    IconData icon,
    Color color,
  ) {
    final value = feed.values[key];
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: line),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 21),
              const Spacer(),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: value == null ? line : color,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          Text(label, style: const TextStyle(color: muted, fontSize: 12)),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value?.toString() ?? '—',
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: ink,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(width: 5),
                Text(unit, style: const TextStyle(fontSize: 11, color: muted)),
              ],
            ),
          ),
          Text(
            value == null ? 'NO READING' : feed.freshness(key),
            style: TextStyle(
              fontSize: 8,
              letterSpacing: 1,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> recordsPage() => [
    intro(
      'YOUR HEALTH STORY',
      'Everything, together.',
      'Keep your health notes organised and ready for your next visit.',
    ),
    box(
      Row(
        children: [
          iconTile(Icons.verified_user_outlined),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                title('Your private health space'),
                small('${records.length} entries · stored on this device'),
                small('Not synced to a hospital or ABHA account.'),
              ],
            ),
          ),
        ],
      ),
    ),
    heading('Health records', action: '+ Add note', onTap: addRecord),
    filters(
      ['All', 'Consultation', 'Lab report', 'Device reading', 'Personal note'],
      recordFilter,
      (s) => recordFilter = s,
    ),
    const SizedBox(height: 16),
    if (records
        .where((r) => recordFilter == 'All' || r['type'] == recordFilter)
        .isEmpty)
      empty(
        'No entries yet',
        'Add a health note to begin your timeline.',
        Icons.folder_open_rounded,
      ),
    ...records
        .where((r) => recordFilter == 'All' || r['type'] == recordFilter)
        .map(
          (r) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: () => recordDetails(r),
              borderRadius: BorderRadius.circular(20),
              child: box(
                Row(
                  children: [
                    iconTile(
                      r['type'] == 'Lab report'
                          ? Icons.science_outlined
                          : Icons.description_outlined,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            r['title'],
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          small('${r['type']} · ${r['date']}'),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: muted),
                  ],
                ),
              ),
            ),
          ),
        ),
    heading('Your ABHA identity'),
    box(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          title('Take control of your health records'),
          const SizedBox(height: 8),
          const Text(
            'Create or manage your ABHA identity through the official portal. Record linking requires your consent.',
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => openLink('https://abha.abdm.gov.in/'),
            icon: const Icon(Icons.open_in_new, size: 17),
            label: const Text('Open official ABHA portal'),
          ),
        ],
      ),
    ),
  ];
  List<Widget> carePage() => [
    intro(
      'HERE FOR YOU',
      'Your care circle.',
      'Find support, plan a visit and stay on top of your everyday care.',
    ),
    box(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          badge('ONLINE CARE'),
          const SizedBox(height: 10),
          title('A doctor visit, from your home'),
          const SizedBox(height: 8),
          const Text(
            'Connect with available clinicians through eSanjeevani or open a consultation link provided by your clinic.',
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: videoOptions,
                icon: const Icon(Icons.videocam_outlined),
                label: const Text('Video consultation'),
              ),
              OutlinedButton(
                onPressed: () => openLink('https://esanjeevani.mohfw.gov.in/'),
                child: const Text('eSanjeevani ↗'),
              ),
            ],
          ),
        ],
      ),
      color: mint,
    ),
    heading('Find hospital care'),
    box(
      ListTile(
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.local_hospital, color: teal),
        title: const Text('Hospitals near you'),
        subtitle: const Text('Compare locations and check scheme coverage'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => navigate(4),
      ),
    ),
    heading('Medicine checklist', action: '+ Add', onTap: addMedicine),
    small(
      'Track medicines already prescribed to you. No background reminders are sent.',
    ),
    const SizedBox(height: 12),
    if (medicines.isEmpty)
      empty(
        'A little help with your routine',
        'Add a prescribed medicine and mark your daily check-in.',
        Icons.medication_outlined,
      ),
    ...medicines.map(
      (m) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: box(
          Row(
            children: [
              Checkbox(
                value: m['taken'] == dayKey(),
                onChanged: (v) {
                  setState(() => m['taken'] = v! ? dayKey() : '');
                  persist();
                },
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m['name'],
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    small(m['schedule']),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Remove medicine',
                onPressed: () async {
                  if (await confirm(
                    'Remove medicine?',
                    'This removes only your local checklist entry.',
                  )) {
                    setState(() => medicines.remove(m));
                    persist();
                  }
                },
                icon: const Icon(Icons.delete_outline, size: 20, color: muted),
              ),
            ],
          ),
          padding: const EdgeInsets.all(12),
        ),
      ),
    ),
  ];
  List<Widget> schemesPage() => [
    intro(
      'CARE SHOULD BE ACCESSIBLE',
      'More support.\nLess worry.',
      'Understand Tamil Nadu and national health programmes, all in one place.',
    ),
    box(
      Row(
        children: [
          iconTile(Icons.shield_outlined),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                title('Know your options'),
                small('Official sources · reviewed 25 Sep 2026'),
                small('Confirm eligibility with the scheme.'),
              ],
            ),
          ),
        ],
      ),
      color: mint,
    ),
    const SizedBox(height: 20),
    filters(
      ['All', 'Tamil Nadu', 'National', 'Saved'],
      schemeFilter,
      (s) => schemeFilter = s,
    ),
    const SizedBox(height: 16),
    if (schemeFilter == 'Saved' && saved.isEmpty)
      empty(
        'Keep useful schemes close',
        'Tap a programme’s bookmark to save it.',
        Icons.bookmark_border,
      ),
    ...schemes
        .where(
          (s) =>
              schemeFilter == 'All' ||
              s['region'] == schemeFilter ||
              (schemeFilter == 'Saved' && saved.contains(s['title'])),
        )
        .map(
          (s) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: InkWell(
              onTap: () => schemeDetails(s),
              borderRadius: BorderRadius.circular(22),
              child: box(
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        badge(s['tag']!),
                        const Spacer(),
                        IconButton(
                          tooltip: 'Save scheme',
                          onPressed: () {
                            setState(() {
                              if (!saved.add(s['title']!)) {
                                saved.remove(s['title']);
                              }
                            });
                            persist();
                          },
                          icon: Icon(
                            saved.contains(s['title'])
                                ? Icons.bookmark
                                : Icons.bookmark_border,
                            color: teal,
                          ),
                        ),
                      ],
                    ),
                    title(s['title']!),
                    small(s['subtitle']!),
                    const SizedBox(height: 14),
                    Text(
                      s['benefit']!,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: teal,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Eligibility & how to access',
                            style: TextStyle(fontSize: 12, color: muted),
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 18,
                          color: teal,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
  ];

  Future<void> sheet(String titleText, Widget child) =>
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        builder: (ctx) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: .78,
            maxChildSize: .95,
            minChildSize: .4,
            builder: (_, controller) => SingleChildScrollView(
              controller: controller,
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 38,
                      height: 4,
                      decoration: BoxDecoration(
                        color: line,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          titleText,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        tooltip: 'Close',
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  child,
                ],
              ),
            ),
          ),
        ),
      );
  Future<bool> confirm(String text, String body) async =>
      await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(text),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Keep'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Remove'),
            ),
          ],
        ),
      ) ??
      false;
  void schemeDetails(Map<String, String> s) {
    sheet(
      s['title']!,
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          badge(s['region']!),
          const SizedBox(height: 18),
          title(s['benefit']!),
          const SizedBox(height: 12),
          Text(s['body']!),
          const Divider(),
          title('How to access'),
          const SizedBox(height: 10),
          Text(s['steps']!),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => openLink(s['url']!),
            icon: const Icon(Icons.open_in_new, size: 18),
            label: const Text('Visit official source'),
          ),
          const SizedBox(height: 16),
          small(
            'Reviewed 25 September 2026. Informational guidance, not an eligibility decision. MediKet is not a government application.',
          ),
        ],
      ),
    );
  }

  void recordDetails(Map<String, dynamic> r) {
    sheet(
      r['title'],
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          badge('PERSONAL NOTE'),
          const SizedBox(height: 12),
          small('${r['type']} · ${r['date']}'),
          const Divider(),
          Text(r['note']),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () {
              Clipboard.setData(
                ClipboardData(
                  text:
                      '${r['title']}\n${r['date']} · ${r['type']}\n${r['note']}',
                ),
              );
              toast('Record summary copied.');
            },
            icon: const Icon(Icons.copy, size: 17),
            label: const Text('Copy summary'),
          ),
          TextButton.icon(
            onPressed: () async {
              if (await confirm(
                'Delete this note?',
                'Remove the entry from this device?',
              )) {
                setState(() => records.remove(r));
                persist();
                if (mounted) {
                  Navigator.pop(context);
                }
              }
            },
            icon: const Icon(Icons.delete_outline),
            label: const Text('Delete record'),
          ),
        ],
      ),
    );
  }

  Future<void> addRecord() async {
    final label = TextEditingController(), note = TextEditingController();
    String type = 'Personal note';
    final form = GlobalKey<FormState>();
    await sheet(
      'Add a health note',
      StatefulBuilder(
        builder: (ctx, setLocal) => Form(
          key: form,
          child: Column(
            children: [
              TextFormField(
                controller: label,
                decoration: const InputDecoration(labelText: 'Title'),
                maxLength: 80,
                validator: (v) => v!.trim().isEmpty ? 'Add a title' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: type,
                decoration: const InputDecoration(labelText: 'Category'),
                items:
                    [
                          'Personal note',
                          'Consultation',
                          'Lab report',
                          'Device reading',
                        ]
                        .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                onChanged: (v) => setLocal(() => type = v!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: note,
                maxLines: 5,
                maxLength: 2000,
                decoration: const InputDecoration(
                  labelText: 'Your summary',
                  alignLabelWithHint: true,
                ),
                validator: (v) => v!.trim().isEmpty ? 'Add a summary' : null,
              ),
              const SizedBox(height: 14),
              small(
                'Saved on this device. A text note, not an uploaded medical document.',
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () {
                  if (!form.currentState!.validate()) {
                    return;
                  }
                  setState(
                    () => records.insert(0, {
                      'title': label.text.trim(),
                      'note': note.text.trim(),
                      'type': type,
                      'date': dayKey(),
                      'demo': false,
                    }),
                  );
                  persist();
                  Navigator.pop(ctx);
                  toast('Health note saved.');
                },
                child: const Text('Save health note'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> addMedicine() async {
    final medicine = TextEditingController(),
        schedule = TextEditingController();
    final form = GlobalKey<FormState>();
    await sheet(
      'Add prescribed medicine',
      Form(
        key: form,
        child: Column(
          children: [
            TextFormField(
              controller: medicine,
              maxLength: 80,
              decoration: const InputDecoration(labelText: 'Medicine name'),
              validator: (v) => v!.trim().isEmpty ? 'Enter a name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: schedule,
              maxLength: 160,
              decoration: const InputDecoration(
                labelText: 'Your prescribed schedule',
              ),
              validator: (v) =>
                  v!.trim().isEmpty ? 'Enter your prescribed schedule' : null,
            ),
            const SizedBox(height: 16),
            small(
              'Use the schedule given by your clinician. Do not change doses based on this checklist.',
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () {
                if (!form.currentState!.validate()) {
                  return;
                }
                setState(
                  () => medicines.add({
                    'name': medicine.text.trim(),
                    'schedule': schedule.text.trim(),
                    'taken': '',
                  }),
                );
                persist();
                Navigator.pop(context);
              },
              child: const Text('Add to my checklist'),
            ),
          ],
        ),
      ),
    );
  }

  void videoOptions() {
    final link = TextEditingController();
    sheet(
      'Video consultation',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          title('Have a consultation link?'),
          const SizedBox(height: 10),
          TextField(
            controller: link,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(
              hintText: 'https://your-clinic.example/visit',
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => openLink(link.text.trim()),
            child: const Text('Open consultation link ↗'),
          ),
          const Divider(),
          title('Government teleconsultation'),
          const SizedBox(height: 8),
          const Text(
            'Access available clinics through the official eSanjeevani service.',
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => openLink('https://esanjeevani.mohfw.gov.in/'),
            child: const Text('Open eSanjeevani ↗'),
          ),
        ],
      ),
    );
  }

  void updates() {
    sheet(
      'Your care updates',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          title('Welcome to your health space'),
          const SizedBox(height: 8),
          const Text(
            'Your device readings refresh automatically every five seconds while the app is open.',
          ),
          const Divider(),

          title('Your data stays with you'),
          small(
            'Notes and routines are stored securely on this device. External services open only when you select their links.',
          ),
          const Divider(),
          title('Device connection'),
          small(
            base.isEmpty
                ? 'Open profile settings to connect your device.'
                : 'Automatic refresh is enabled. Measurement timestamps show freshness.',
          ),
        ],
      ),
    );
  }

  void emergency() {
    sheet(
      'Emergency help',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'If you think you are having a medical emergency, seek urgent care. Do not wait for an online appointment.',
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xffa6443d),
            ),
            onPressed: () => openLink('tel:112'),
            icon: const Icon(Icons.call),
            label: const Text('Open dialler · 112'),
          ),
          const SizedBox(height: 12),
          small('Opens your phone dialler. You place the call.'),
        ],
      ),
    );
  }

  void settings() {
    final profile = TextEditingController(text: name),
        endpoint = TextEditingController(text: base),
        code = TextEditingController(text: token);
    final form = GlobalKey<FormState>();
    sheet(
      'Your profile & devices',
      StatefulBuilder(
        builder: (ctx, setLocal) => Form(
          key: form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: profile,
                maxLength: 32,
                decoration: const InputDecoration(
                  labelText: 'What should we call you?',
                ),
                validator: (v) => v!.trim().isEmpty ? 'Enter your name' : null,
              ),
              const SizedBox(height: 14),
              ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: endpoint,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    labelText: 'Secure device server',
                    hintText: 'https://your-server.example',
                  ),
                  validator: (v) {
                    final u = Uri.tryParse(v!.trim());
                    return u?.scheme == 'https' &&
                            u!.host.isNotEmpty &&
                            u.userInfo.isEmpty &&
                            !u.hasQuery &&
                            !u.hasFragment
                        ? null
                        : 'Enter an HTTPS address';
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: code,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Server pairing code',
                  ),
                  validator: (v) =>
                      v!.trim().isEmpty ? 'Enter the pairing code' : null,
                ),
                const SizedBox(height: 12),
                small(
                  'Firebase credentials stay on the server. BP uses its own feed; other vitals use the configured patient’s feed. Your pairing code is stored encrypted on this device.',
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () {
                  if (!form.currentState!.validate()) {
                    return;
                  }
                  generation++;
                  setState(() {
                    name = profile.text.trim();
                    base = endpoint.text.trim();
                    token = code.text.trim();
                    feed = VitalFeed.empty;
                    loading = false;
                    connectionError = '';
                  });
                  persist();
                  Navigator.pop(ctx);
                  refresh();
                },
                child: const Text('Save settings'),
              ),
              const Divider(),
              title('Privacy & local storage'),
              const SizedBox(height: 8),
              small(
                'Your profile, pairing code, notes and medicine checklists use encrypted device storage. Measurements are read from your connected devices and are not copied into notes. Alerts and medicine notifications are not enabled.',
              ),
              const SizedBox(height: 18),
              TextButton.icon(
                onPressed: () async {
                  if (await confirm(
                    'Clear local app data?',
                    'Deletes local notes, appointments, medicines, bookmarks and profile.',
                  )) {
                    generation++;
                    await storage.delete(key: 'mediket-care-v1');
                    if (!mounted) {
                      return;
                    }
                    setState(() {
                      name = 'there';
                      records = [];
                      appointments = [];
                      medicines = [];
                      saved = {};
                      water = 0;
                      base = '';
                      token = '';
                      feed = VitalFeed.empty;
                      loading = false;
                      connectionError = '';
                    });
                    if (ctx.mounted) {
                      Navigator.pop(ctx);
                    }
                  }
                },
                icon: const Icon(Icons.delete_outline),
                label: const Text('Clear local app data'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HealthMark extends CustomPainter {
  const HealthMark();
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = Colors.white.withValues(alpha: .12);
    canvas.drawCircle(Offset(size.width / 2, size.height / 2), 35, p);
    p
      ..color = const Color(0xffaee9d9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final path = Path()
      ..moveTo(0, 62)
      ..lineTo(12, 62)
      ..lineTo(21, 43)
      ..lineTo(30, 80)
      ..lineTo(39, 58)
      ..lineTo(54, 58);
    canvas.drawPath(path, p);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
