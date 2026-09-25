import 'dart:convert';
import 'package:http/http.dart' as http;

class VitalFeed {
  final Map<String, dynamic> values;
  final String bpStatus, vitalsStatus;
  final String? bpAt, vitalsAt;
  final Map<String, dynamic> measuredAt;
  const VitalFeed(
    this.values,
    this.bpStatus,
    this.vitalsStatus, {
    this.bpAt,
    this.vitalsAt,
    this.measuredAt = const {},
  });
  String freshness(String key) {
    final timestamp = measuredAt.containsKey(key)
        ? measuredAt[key]
        : key == 'bloodPressure'
        ? bpAt
        : vitalsAt;
    final measured = timestamp == null ? null : DateTime.tryParse(timestamp);
    if (measured == null) return 'TIME UNKNOWN';
    final age = DateTime.now().difference(measured);
    if (age.isNegative) return 'CHECK DEVICE CLOCK';
    return age.inMinutes >= 5 ? 'OLDER READING' : 'RECENT READING';
  }

  static const empty = VitalFeed({}, 'Not connected', 'Not connected');
  static Future<VitalFeed> fetch(String base, String token) async {
    final uri = Uri.parse(base);
    if (uri.scheme != 'https' ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment) {
      throw const FormatException('Enter an HTTPS server address.');
    }
    final response = await http
        .get(
          Uri.parse('${base.replaceAll(RegExp(r'/+$'), '')}/api/mobile/vitals'),
          headers: {'Authorization': 'Bearer $token'},
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode == 401) {
      throw Exception('The pairing code is incorrect.');
    }
    if (response.statusCode != 200) {
      throw Exception('Device server is unavailable.');
    }
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return VitalFeed(
      Map<String, dynamic>.from(json['values'] ?? {}),
      json['bpStatus'] ?? 'Unavailable',
      json['vitalsStatus'] ?? 'Unavailable',
      bpAt: json['bpAt'],
      vitalsAt: json['vitalsAt'],
      measuredAt: Map<String, dynamic>.from(json['measuredAt'] ?? {}),
    );
  }
}

const schemes = [
  {
    'title': 'CMCHIS',
    'subtitle': 'Tamil Nadu health insurance',
    'region': 'Tamil Nadu',
    'benefit': 'Hospital care support',
    'body':
        'The Chief Minister’s Comprehensive Health Insurance Scheme supports eligible Tamil Nadu families for covered hospital treatments. The official eligibility page lists annual family income below ₹1,20,000. Other conditions and covered procedures apply.',
    'steps':
        'Check your family-card details and obtain the required income certificate. Visit the official scheme portal or district enrolment centre to confirm eligibility and participating hospitals.',
    'url': 'https://www.cmchistn.com/eligibility',
    'tag': 'STATE SCHEME',
  },
  {
    'title': 'Ayushman Bharat PM-JAY',
    'subtitle': 'Hospitalisation cover',
    'region': 'National',
    'benefit': 'Up to ₹5 lakh / family / year',
    'body':
        'Provides eligible families with cover for secondary and tertiary hospitalisation at empanelled hospitals. Eligibility is determined by the programme; this app cannot approve enrolment.',
    'steps':
        'Check your eligibility on the official beneficiary portal. Confirm that your hospital and planned treatment are covered before admission.',
    'url': 'https://beneficiary.nha.gov.in/',
    'tag': 'NATIONAL SCHEME',
  },
  {
    'title': 'Ayushman Vay Vandana',
    'subtitle': 'For senior citizens aged 70+',
    'region': 'National',
    'benefit': 'Health cover for age 70+',
    'body':
        'PM-JAY was expanded to citizens aged 70 and above regardless of income. Benefits of up to ₹5 lakh per year apply under the scheme’s rules, including special provisions for families already covered.',
    'steps':
        'Check enrolment and documentation on the NHA beneficiary portal. Review existing insurance arrangements and scheme conditions before choosing coverage.',
    'url':
        'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2099545&lang=2&reg=48',
    'tag': 'SENIOR CARE',
  },
  {
    'title': 'Jan Aushadhi',
    'subtitle': 'Affordable generic medicines',
    'region': 'National',
    'benefit': 'Lower-cost medicine access',
    'body':
        'Pradhan Mantri Bhartiya Janaushadhi Pariyojana provides quality generic medicines at affordable prices through dedicated Kendras. Availability varies by outlet.',
    'steps':
        'Locate a Kendra on the official website. Take your prescription and discuss any medicine substitution with your doctor or pharmacist.',
    'url': 'https://www.janaushadhi.gov.in/',
    'tag': 'MEDICINE SUPPORT',
  },
  {
    'title': 'eSanjeevani',
    'subtitle': 'Government teleconsultation',
    'region': 'National',
    'benefit': 'Online outpatient care',
    'body':
        'The Ministry of Health and Family Welfare’s national telemedicine service enables remote consultations. Services and clinic timings depend on the participating state and clinic.',
    'steps':
        'Open the official service, register or log in, select an available clinic and follow its queue and consultation instructions. This is not an emergency service.',
    'url': 'https://esanjeevani.mohfw.gov.in/',
    'tag': 'DIGITAL CARE',
  },
  {
    'title': 'ABHA',
    'subtitle': 'Your digital health identity',
    'region': 'National',
    'benefit': 'Consent-based health records',
    'body':
        'An ABHA identity can help you link and access health records in the ABDM ecosystem with your consent. ABHA is a health identity, not an insurance policy.',
    'steps':
        'Use the official ABHA portal to create or manage your identity. Create your ABHA identity and manage linked records through the official portal.',
    'url': 'https://abha.abdm.gov.in/',
    'tag': 'HEALTH RECORDS',
  },
];
