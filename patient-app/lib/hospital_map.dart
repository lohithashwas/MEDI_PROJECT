import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

class CarePlace {
  final String name, area, kind, source;
  final LatLng point;
  const CarePlace(this.name, this.area, this.kind, this.point, this.source);
  bool get planned => kind == 'Planned center';
  Color get color => planned
      ? const Color(0xffa57123)
      : kind == 'Government'
      ? const Color(0xff087f78)
      : const Color(0xff4a6cc3);
}

const carePlaces = [
  CarePlace(
    'Government Primary Health Centre',
    'Kelambakkam',
    'Government',
    LatLng(12.787, 80.219),
    'https://www.nhm.gov.in/images/pdf/nrhm-in-state/state-wise-information/tamilnadu/24x7_phc_tamilnadu.pdf',
  ),
  CarePlace(
    'Government Hospital, Thiruporur',
    'Thiruporur',
    'Government',
    LatLng(12.728, 80.189),
    'https://imhd.tn.gov.in/ayurveda-hospitals/',
  ),
  CarePlace(
    'Chettinad Hospital',
    'Kelambakkam / Padur',
    'Private',
    LatLng(12.797, 80.219),
    'https://www.chettinadhospital.com/contact',
  ),
  CarePlace(
    'Mediket · Kelambakkam',
    'Kelambakkam',
    'Planned center',
    LatLng(12.782, 80.215),
    '',
  ),
  CarePlace(
    'Mediket · SSN corridor',
    'Kalavakkam, near SSN College',
    'Planned center',
    LatLng(12.753, 80.203),
    '',
  ),
  CarePlace(
    'Mediket · Thiruporur',
    'Thiruporur',
    'Planned center',
    LatLng(12.733, 80.183),
    '',
  ),
];

class HospitalMap extends StatefulWidget {
  const HospitalMap({super.key});
  @override
  State<HospitalMap> createState() => _HospitalMapState();
}

class _HospitalMapState extends State<HospitalMap> {
  final controller = MapController();
  String filter = 'All', query = '', scheme = 'CMCHIS';
  CarePlace selected = carePlaces.first;
  bool tileFailed = false;
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Future<void> open(String url) async {
    try {
      if (await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication))
        return;
    } catch (_) {}
    if (mounted)
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to open this link. Please try again.'),
        ),
      );
  }

  void choose(CarePlace place) {
    setState(() => selected = place);
    controller.move(place.point, 14);
  }

  List<CarePlace> get visible => carePlaces
      .where(
        (p) =>
            (filter == 'All' || p.kind == filter) &&
            '${p.name} ${p.area}'.toLowerCase().contains(query.toLowerCase()),
      )
      .toList();
  @override
  Widget build(BuildContext context) {
    final places = visible;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Care, closer to you.',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: 8),
        const Text(
          'Kelambakkam · Thiruporur · SSN College',
          style: TextStyle(color: Color(0xff087f78)),
        ),
        const SizedBox(height: 18),
        TextField(
          onChanged: (v) => setState(() => query = v),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            hintText: 'Search hospital or area',
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 7,
          children: ['All', 'Government', 'Private', 'Planned center']
              .map(
                (v) => ChoiceChip(
                  label: Text(v),
                  selected: filter == v,
                  onSelected: (_) => setState(() => filter = v),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: SizedBox(
            height: 340,
            child: FlutterMap(
              mapController: controller,
              options: const MapOptions(
                initialCenter: LatLng(12.762, 80.208),
                initialZoom: 12.5,
                minZoom: 10,
                maxZoom: 18,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.mediket.mediket_patient',
                  maxNativeZoom: 19,
                  errorTileCallback: (_, _, _) {
                    if (!tileFailed && mounted)
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) setState(() => tileFailed = true);
                      });
                  },
                ),
                MarkerLayer(
                  markers: [
                    const Marker(
                      point: LatLng(12.751, 80.197),
                      width: 88,
                      height: 64,
                      child: Column(
                        children: [
                          Icon(Icons.school, color: Color(0xff52606a)),
                          Text(
                            'SSN College',
                            style: TextStyle(
                              fontSize: 10,
                              backgroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ...places.map(
                      (p) => Marker(
                        point: p.point,
                        width: 48,
                        height: 48,
                        child: Tooltip(
                          message: p.name,
                          child: GestureDetector(
                            onTap: () => choose(p),
                            child: Container(
                              decoration: BoxDecoration(
                                color: p.color,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: selected == p ? 4 : 2,
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Colors.black26,
                                    blurRadius: 8,
                                  ),
                                ],
                              ),
                              child: Icon(
                                p.planned
                                    ? Icons.add_location_alt
                                    : Icons.local_hospital,
                                color: Colors.white,
                                size: 23,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                RichAttributionWidget(
                  attributions: [
                    TextSourceAttribution(
                      'OpenStreetMap contributors',
                      onTap: () =>
                          open('https://www.openstreetmap.org/copyright'),
                    ),
                  ],
                ),
                Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: IconButton.filled(
                      tooltip: 'Show local area',
                      onPressed: () =>
                          controller.move(const LatLng(12.762, 80.208), 12.5),
                      icon: const Icon(Icons.center_focus_strong),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (tileFailed)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Map tiles unavailable. Hospital details and external directions remain available.',
            ),
          ),
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 10),
          child: Text(
            'Pins indicate approximate areas. Amber Mediket pins are proposed locations and are not open for patient visits.',
            style: TextStyle(fontSize: 12, color: Color(0xff6c7e85)),
          ),
        ),
        DropdownButtonFormField<String>(
          initialValue: scheme,
          decoration: const InputDecoration(labelText: 'Check a scheme'),
          items: [
            'CMCHIS',
            'PM-JAY',
            'ABHA',
          ].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
          onChanged: (v) => setState(() => scheme = v!),
        ),
        const SizedBox(height: 12),
        if (places.isNotEmpty)
          details(places.contains(selected) ? selected : places.first),
        const SizedBox(height: 20),
        Text(
          '${places.length} places in this area',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (places.isEmpty)
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text('No matching places. Try another area or filter.'),
          ),
        ...places.map(
          (p) => Card(
            elevation: 0,
            color: Colors.white,
            child: ListTile(
              isThreeLine: true,
              leading: Icon(
                p.planned ? Icons.add_location_alt : Icons.local_hospital,
                color: p.color,
              ),
              title: Text(p.name),
              subtitle: Text('${p.area}\n${p.kind}'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => choose(p),
            ),
          ),
        ),
      ],
    );
  }

  Widget details(CarePlace p) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: p.color.withValues(alpha: .3)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          p.kind.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: p.color,
          ),
        ),
        const SizedBox(height: 8),
        Text(p.name, style: Theme.of(context).textTheme.titleLarge),
        Text(p.area),
        const Divider(),
        Text(
          p.planned
              ? 'Not available · planned location'
              : scheme == 'ABHA'
              ? 'ABHA is a health identity, not insurance cover'
              : '$scheme · Coverage not yet verified',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Text(
          p.planned
              ? 'This proposed Mediket center does not provide services or scheme benefits yet.'
              : 'Confirm current hospital empanelment, your eligibility and the specific treatment package with the scheme helpdesk before admission.',
        ),
        if (!p.planned)
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              TextButton.icon(
                onPressed: () => open(
                  'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent('${p.name} ${p.area} Tamil Nadu')}',
                ),
                icon: const Icon(Icons.directions),
                label: const Text('Find directions'),
              ),
              TextButton(
                onPressed: () => open(
                  scheme == 'CMCHIS'
                      ? 'https://www.cmchistn.com/'
                      : scheme == 'ABHA'
                      ? 'https://abha.abdm.gov.in/'
                      : 'https://beneficiary.nha.gov.in/',
                ),
                child: const Text('Official scheme portal ↗'),
              ),
              TextButton(
                onPressed: () => open(p.source),
                child: const Text('Facility source ↗'),
              ),
            ],
          ),
      ],
    ),
  );
}
