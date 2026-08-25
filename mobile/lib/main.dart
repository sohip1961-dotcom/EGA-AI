import 'dart:convert';
import 'dart:math';
import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/gestures.dart' show TapGestureRecognizer;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:ui' as ui;
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:xml/xml.dart';
import 'package:file_picker/file_picker.dart';


// ─── Design Tokens ───────────────────────────────────────────────────────────
const Color primaryOlive    = Color(0xFF7DA146);
const Color accentOlive     = Color(0xFF91B854);
const Color darkOlive       = Color(0xFF5C7A34);
const Color secondaryBeige  = Color(0xFFEAD7B7);

// App version — keep in sync with pubspec.yaml's `version:` (X.Y.Z+CODE).
// Compared against admin-managed app_versions.version_code for force-update.
const int kAppVersionCode = 1;
const String kAppVersionName = '1.0.0';

/// Safely resolves the API website link for web and mobile platforms.
/// Replaces `localhost` with production domain `https://www.egsaiedu.com` on physical mobile devices,
/// enforces HTTPS scheme and canonical `www` domain to avoid 308 Permanent Redirects from Vercel.
String resolveWebsiteLink(String? link) {
  if (link == null || link.trim().isEmpty) {
    return kIsWeb ? 'http://localhost:3000' : 'https://www.egsaiedu.com';
  }
  var clean = link.trim().replaceAll(RegExp(r'/$'), '');
  if (!kIsWeb) {
    if (clean == 'http://localhost:3000' || clean == 'http://127.0.0.1:3000' || clean == 'localhost:3000' || clean == 'localhost') {
      return 'https://www.egsaiedu.com';
    }
  }
  if (clean.startsWith('http://') && !clean.contains('localhost') && !clean.contains('127.0.0.1') && !clean.contains('10.0.2.2') && !clean.contains('192.168.')) {
    clean = clean.replaceFirst('http://', 'https://');
  } else if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://$clean';
  }
  if (clean.contains('egsaiedu.com') && !clean.contains('www.egsaiedu.com')) {
    clean = clean.replaceFirst('egsaiedu.com', 'www.egsaiedu.com');
  }
  return clean;
}

/// Safely decodes JSON responses and handles HTTP redirect/non-JSON error pages gracefully.
Map<String, dynamic> parseJsonResponse(http.Response res) {
  final bodyStr = utf8.decode(res.bodyBytes).trim();
  if (res.statusCode == 301 || res.statusCode == 302 || res.statusCode == 307 || res.statusCode == 308 || bodyStr.startsWith('Redirecting')) {
    throw Exception('تمت إعادة توجيه الطلب إلى عنوان غير صالح. يرجى التحقق من الرابط المستهدف (HTTPS).');
  }
  try {
    final decoded = jsonDecode(bodyStr);
    if (decoded is Map<String, dynamic>) return decoded;
    throw Exception('استجابة الخادم غير صالحة.');
  } catch (e) {
    if (e.toString().contains('FormatException')) {
      throw Exception('تعذر قراءة استجابة الخادم ($bodyStr)');
    }
    rethrow;
  }
}

Color get bgDeep          => EgsTheme.current.bgDeep;
Color get bgSurface       => EgsTheme.current.bgSurface;
Color get bgCard          => EgsTheme.current.bgCard;
Color get bgElevated      => EgsTheme.current.bgElevated;
Color get bgInput         => EgsTheme.current.bgInput;
Color get borderSubtle    => EgsTheme.current.borderSubtle;
Color get textPrimary     => EgsTheme.current.textPrimary;
Color get textSecondary   => EgsTheme.current.textSecondary;
Color get textMuted       => EgsTheme.current.textMuted;
LinearGradient get heroBg => EgsTheme.current.heroBg;

class EgsTheme {
  final Color bgDeep;
  final Color bgSurface;
  final Color bgCard;
  final Color bgElevated;
  final Color bgInput;
  final Color borderSubtle;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final LinearGradient heroBg;

  const EgsTheme({
    required this.bgDeep,
    required this.bgSurface,
    required this.bgCard,
    required this.bgElevated,
    required this.bgInput,
    required this.borderSubtle,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.heroBg,
  });

  static const dark = EgsTheme(
    bgDeep: Color(0xFF0A0B08),
    bgSurface: Color(0xFF0D0E0B),
    bgCard: Color(0xFF141510),
    bgElevated: Color(0xFF1A1C14),
    bgInput: Color(0xFF181A13),
    borderSubtle: Color(0xFF252720),
    textPrimary: Color(0xFFEEEEEE),
    textSecondary: Color(0xFF9A9A8A),
    textMuted: Color(0xFF5A5A4A),
    heroBg: LinearGradient(
      colors: [Color(0xFF0D0E0B), Color(0xFF111410), Color(0xFF0D0F0A)],
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
    ),
  );

  static const light = EgsTheme(
    bgDeep: Color(0xFFF4F6F0),
    bgSurface: Color(0xFFF7F9F3),
    bgCard: Color(0xFFFFFFFF),
    bgElevated: Color(0xFFF1F3EB),
    bgInput: Color(0xFFECEFE6),
    borderSubtle: Color(0xFFE2E6D9),
    textPrimary: Color(0xFF1B1D16),
    textSecondary: Color(0xFF5D6153),
    textMuted: Color(0xFF8E9382),
    heroBg: LinearGradient(
      colors: [Color(0xFFF7F9F3), Color(0xFFECEFE6), Color(0xFFF7F9F3)],
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
    ),
  );

  static EgsTheme current = dark;
}

final ValueNotifier<ThemeMode> themeModeNotifier = ValueNotifier<ThemeMode>(ThemeMode.system);

const LinearGradient olivGradient = LinearGradient(
  colors: [primaryOlive, accentOlive],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// ─── App Entry ───────────────────────────────────────────────────────────────
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: bgDeep,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  await Supabase.initialize(
    url: 'https://hzszwiuthmwmlmaujwdt.supabase.co',
    publishableKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c3p3aXV0aG13bWxtYXVqd2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMxMzU3MiwiZXhwIjoyMDk4ODg5NTcyfQ.kPSLtKisDWPd3YszMNSQk1QeCQ-Mw1J-RwwN3Zjus_k',
  );
  runApp(const EgsApp());
}

class EgsApp extends StatefulWidget {
  const EgsApp({super.key});
  @override
  State<EgsApp> createState() => _EgsAppState();
}

class _EgsAppState extends State<EgsApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initTheme();
    themeModeNotifier.addListener(_onThemeChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    themeModeNotifier.removeListener(_onThemeChanged);
    super.dispose();
  }

  Future<void> _initTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final savedModeStr = prefs.getString('theme_mode') ?? 'system';
    ThemeMode savedMode = ThemeMode.system;
    if (savedModeStr == 'light') savedMode = ThemeMode.light;
    if (savedModeStr == 'dark') savedMode = ThemeMode.dark;
    themeModeNotifier.value = savedMode;
    _updateTheme();
  }

  void _onThemeChanged() {
    _updateTheme();
  }

  void _updateTheme() {
    final mode = themeModeNotifier.value;
    setState(() {
      bool isDark = true;
      if (mode == ThemeMode.system) {
        isDark = WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
      } else {
        isDark = mode == ThemeMode.dark;
      }
      EgsTheme.current = isDark ? EgsTheme.dark : EgsTheme.light;
      
      // Update system UI overlay
      SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: bgDeep,
        systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      ));
    });
  }

  @override
  void didChangePlatformBrightness() {
    super.didChangePlatformBrightness();
    if (themeModeNotifier.value == ThemeMode.system) {
      _updateTheme();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeModeNotifier,
      builder: (context, mode, child) {
        return MaterialApp(
          title: 'EGS AI',
          debugShowCheckedModeBanner: false,
          locale: const Locale('ar', 'EG'),
          themeMode: mode,
          theme: ThemeData(
            brightness: Brightness.light,
            primaryColor: primaryOlive,
            scaffoldBackgroundColor: bgSurface,
            useMaterial3: true,
            fontFamily: 'Cairo',
            colorScheme: ColorScheme.light(
              primary: primaryOlive,
              secondary: accentOlive,
              surface: bgSurface,
            ),
            cardTheme: CardThemeData(
              color: bgCard,
              margin: EdgeInsets.zero,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            pageTransitionsTheme: const PageTransitionsTheme(
              builders: {
                TargetPlatform.android: CupertinoPageTransitionsBuilder(),
                TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
              },
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: bgInput,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: borderSubtle),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: primaryOlive, width: 1.5),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Colors.redAccent, width: 1),
              ),
              hintStyle: TextStyle(color: textMuted, fontSize: 13.5, fontFamily: 'Cairo'),
              labelStyle: TextStyle(color: textSecondary, fontSize: 13.5),
            ),
            snackBarTheme: SnackBarThemeData(
              backgroundColor: bgElevated,
              contentTextStyle: TextStyle(color: textPrimary, fontFamily: 'Cairo'),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              behavior: SnackBarBehavior.floating,
            ),
          ),
          darkTheme: ThemeData(
            brightness: Brightness.dark,
            primaryColor: primaryOlive,
            scaffoldBackgroundColor: bgSurface,
            useMaterial3: true,
            fontFamily: 'Cairo',
            colorScheme: ColorScheme.dark(
              primary: primaryOlive,
              secondary: accentOlive,
              surface: bgSurface,
            ),
            cardTheme: CardThemeData(
              color: bgCard,
              margin: EdgeInsets.zero,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            pageTransitionsTheme: const PageTransitionsTheme(
              builders: {
                TargetPlatform.android: CupertinoPageTransitionsBuilder(),
                TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
              },
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: bgInput,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: borderSubtle),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: primaryOlive, width: 1.5),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Colors.redAccent, width: 1),
              ),
              hintStyle: TextStyle(color: textMuted, fontSize: 13.5, fontFamily: 'Cairo'),
              labelStyle: TextStyle(color: textSecondary, fontSize: 13.5),
            ),
            snackBarTheme: SnackBarThemeData(
              backgroundColor: bgElevated,
              contentTextStyle: TextStyle(color: textPrimary, fontFamily: 'Cairo'),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              behavior: SnackBarBehavior.floating,
            ),
          ),
          home: const ChatHomeScreen(),
        );
      },
    );
  }
}

// ─── API / Helpers (business logic — unchanged) ───────────────────────────────
class ApiClient {
  String baseUrl = 'https://hzszwiuthmwmlmaujwdt.supabase.co';
  String? token;
  String? deviceId;

  ApiClient() { _loadSettings(); }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('auth_token');
    deviceId = prefs.getString('device_id');
    if (deviceId == null) {
      deviceId =
          'mobile_device_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (9000 * (DateTime.now().microsecond / 1000000))).toInt()}';
      await prefs.setString('device_id', deviceId!);
    }
  }
}

String generateUUID() {
  final random     = Random();
  final hexDigits  = '0123456789abcdef';
  final charCodes  = List<int>.generate(36, (index) {
    if (index == 8 || index == 13 || index == 18 || index == 23) return 45;
    int value;
    if (index == 14) {
      value = 4;
    } else if (index == 19) {
      value = (random.nextInt(4) + 8);
    } else {
      value = random.nextInt(16);
    }
    return hexDigits.codeUnitAt(value);
  });
  return String.fromCharCodes(charCodes);
}

String stripAudioPrefix(String msg) {
  var text = msg;
  if (text.startsWith('[AUDIO_MESSAGE:')) {
    final closingIndex = text.indexOf(']');
    if (closingIndex != -1) {
      text = text.substring(closingIndex + 1);
    }
  }
  if (text.startsWith('[IMAGE_MESSAGE:')) {
    final closingIndex = text.indexOf(']');
    if (closingIndex != -1) {
      text = text.substring(closingIndex + 1);
    }
  }
  return text;
}

Stream<Map<String, dynamic>> generateChatResponseStream({
  required String websiteLink,
  required String userQuery,
  required String gradeLevel,
  required String subjectName,
  required String sessionId,
  required String model,
  required bool thinking,
  required List<Map<String, dynamic>> history,
  String mode = 'detailed',
  String? authToken,
  String? deviceId,
}) async* {
  final cleanLink = websiteLink.trim().replaceAll(RegExp(r'/$'), '');
  final url = Uri.parse('$cleanLink/api/chat');

  final List<Map<String, dynamic>> recentHistory = [];
  for (var msg in history) {
    recentHistory.add({
      'sender': msg['sender'] == 'user' ? 'user' : 'ai',
      'message': stripAudioPrefix(msg['message'] ?? ''),
    });
  }

  final Map<String, dynamic> requestBody = {
    'message': userQuery,
    'grade_level': gradeLevel,
    'subject_name': subjectName,
    'session_id': sessionId.isEmpty ? null : sessionId,
    'model': model,
    'thinking': thinking,
    'mode': mode,
    if (authToken == null || authToken.isEmpty) 'history': recentHistory,
  };

  final request = http.Request('POST', url)
    ..headers.addAll({
      'Content-Type': 'application/json',
      if (authToken != null && authToken.isNotEmpty) 'Authorization': 'Bearer $authToken',
      if (deviceId != null && deviceId.isNotEmpty) 'x-device-id': deviceId,
      'Accept-Encoding': 'identity',
    })
    ..body = jsonEncode(requestBody);

  final client = http.Client();
  try {
    final response = await client.send(request).timeout(const Duration(seconds: 45));
    if (response.statusCode != 200) {
      final bodyStr = await response.stream.bytesToString();
      String errText = 'Server error: ${response.statusCode}';
      try {
        final errJson = jsonDecode(bodyStr);
        errText = errJson['error'] ?? errJson['message'] ?? errText;
      } catch (_) {
        if (bodyStr.isNotEmpty) errText = bodyStr;
      }
      yield {'type': 'error', 'content': errText};
      client.close();
      return;
    }
    final stream = response.stream.transform(utf8.decoder).transform(const LineSplitter());
    await for (final line in stream) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) continue;
      if (trimmed == 'data: [DONE]') break;
      if (trimmed.startsWith('data: ')) {
        try {
          final data = jsonDecode(trimmed.substring(6));
          yield Map<String, dynamic>.from(data);
        } catch (_) {}
      }
    }
  } catch (e) {
    yield {'type': 'error', 'content': e.toString()};
  } finally {
    client.close();
  }
}

Map<String, dynamic> parseMessageContent(String message) {
  if (message.startsWith('<thought')) {
    final closeIdx = message.indexOf('</thought>');
    if (closeIdx != -1) {
      final startIdx = message.indexOf('>');
      if (startIdx != -1 && startIdx < closeIdx) {
        final thought  = message.substring(startIdx + 1, closeIdx);
        final content  = message.substring(closeIdx + '</thought>'.length);
        int duration   = 0;
        final dMatch   = RegExp(r'duration="(\d+)"').firstMatch(message.substring(0, startIdx + 1));
        if (dMatch != null) duration = int.tryParse(dMatch.group(1) ?? '') ?? 0;
        return {'thought': thought, 'message': content, 'duration': duration};
      }
    }
  }
  return {'thought': '', 'message': message, 'duration': 0};
}

// ─── Plan Names ───────────────────────────────────────────────────────────────
const Map<String, String> _planNames = {
  'free': 'الباقة المجانية',
  'pro':  'الباقة المميزة',
  'max':  'الباقة القصوى',
};

const Map<String, String> _gradeNames = {
  '1_middle': 'الصف الأول الإعدادي',
  '2_middle': 'الصف الثاني الإعدادي',
  '3_middle': 'الصف الثالث الإعدادي',
  '1_high':   'الصف الأول الثانوي',
  '2_high':   'الصف الثاني الثانوي',
  '3_high':   'الصف الثالث الثانوي',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
class ChatHomeScreen extends StatefulWidget {
  const ChatHomeScreen({super.key});
  @override
  State<ChatHomeScreen> createState() => _ChatHomeScreenState();
}

class _ChatHomeScreenState extends State<ChatHomeScreen> with TickerProviderStateMixin {
  final ApiClient             _apiClient        = ApiClient();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController      _scrollController  = ScrollController();
  final FocusNode             _inputFocus        = FocusNode();

  bool                         _isLoading         = false;
  bool                         _isInit            = false;
  Map<String, dynamic>?        _userProfile;
  int                          _guestMessagesCount = 0;
  List<Map<String, dynamic>>   _messages           = [];
  String?                      _activeSessionId;
  String?                      _lastUserQuery;
  DateTime                     _lastScrollTime = DateTime.fromMillisecondsSinceEpoch(0);
  List<Map<String, dynamic>>   _sessions           = [];
  bool                         _sessionsLoading    = false;
  String                       _selectedGrade      = '3_high';
  String                       _selectedSubject    = 'الفيزياء';
  String                       _webPaymentLink     = resolveWebsiteLink(null);
  List<String>                 _activeGradeLevels  = [];
  List<String>                 _activeCurriculumIds = [];
  List<Map<String, dynamic>>   _allCurriculums     = [];

  // Input text tracking for send button animation
  bool _hasText = false;

  // Points / Coins & Model States
  String                       _selectedModel      = 'flash';
  bool                         _thinkingEnabled    = false;
  String                       _chatMode           = 'detailed';
  double                       _coins              = 5.0;
  double                       _points             = 0.0;

  // Notifications
  List<Map<String, dynamic>> _notifications = [];
  List<String> _dismissedNotificationIds = [];

  @override
  void initState() {
    super.initState();
    _messageController.addListener(() {
      final has = _messageController.text.trim().isNotEmpty;
      if (has != _hasText) setState(() => _hasText = has);
    });
    _initApp();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  Future<void> _initApp() async {
    await _apiClient._loadSettings();
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _selectedGrade   = prefs.getString('selected_grade')   ?? '3_high';
      _selectedSubject = prefs.getString('selected_subject') ?? 'الفيزياء';
      final savedMode  = prefs.getString('chat_mode');
      if (savedMode == 'socratic' || savedMode == 'detailed' || savedMode == 'summary') {
        _chatMode = savedMode!;
      }
      _isInit          = true;
    });
    _loadLocalProfile();
    _fetchUserProfile();
    _fetchSystemConfig();
    await _fetchSessions();
    // Default startup to a new chat session (_activeSessionId = null)
    _updateGuestMessageCount();
    _fetchNotifications();
    _checkForceUpdate();
  }

  Future<void> _checkForceUpdate() async {
    try {
      final data = await Supabase.instance.client
          .from('app_versions')
          .select()
          .eq('platform', 'android')
          .eq('active', true)
          .order('version_code', ascending: false)
          .limit(1)
          .maybeSingle();

      if (data == null) return;
      final int latestCode = data['version_code'] as int;
      if (latestCode <= kAppVersionCode) return;

      final bool mandatory = data['mandatory'] != false;
      final String versionName = data['version_name'] ?? '';
      final String releaseNotes = data['release_notes'] ?? '';
      final String downloadUrl = data['download_url'] ?? '';

      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => PopScope(
          canPop: !mandatory,
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Dialog(
              backgroundColor: bgCard,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(gradient: olivGradient, shape: BoxShape.circle),
                        child: const Icon(Icons.system_update_rounded, color: Colors.white, size: 30),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('يتوفر تحديث جديد!', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: textPrimary, fontFamily: 'Cairo')),
                    const SizedBox(height: 6),
                    if (versionName.isNotEmpty)
                      Text('الإصدار $versionName', textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: textMuted, fontFamily: 'Cairo')),
                    if (releaseNotes.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: bgElevated, borderRadius: BorderRadius.circular(12)),
                        child: Text(releaseNotes, style: TextStyle(fontSize: 12.5, color: textSecondary, fontFamily: 'Cairo', height: 1.6)),
                      ),
                    ],
                    const SizedBox(height: 20),
                    _GradientButton(
                      label: 'تحديث الآن',
                      icon: Icons.download_rounded,
                      onTap: () async {
                        if (downloadUrl.isNotEmpty) {
                          final uri = Uri.parse(downloadUrl);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                        }
                      },
                    ),
                    if (!mandatory) ...[
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text('لاحقاً', style: TextStyle(fontFamily: 'Cairo', color: textMuted)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    } catch (e) {
      // Silent failure — version check is non-critical to app startup
    }
  }

  Future<void> _fetchNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedDismissed = prefs.getString('dismissed_notifications');
      List<String> dismissed = [];
      if (storedDismissed != null) {
        dismissed = List<String>.from(jsonDecode(storedDismissed));
      }

      final data = await Supabase.instance.client
          .from('notifications')
          .select()
          .eq('active', true)
          .order('created_at', ascending: false);

      final list = List<Map<String, dynamic>>.from(data)
          .where((n) => n['target'] == 'both' || n['target'] == 'phone')
          .toList();

      if (mounted) {
        setState(() {
          _notifications = list;
          _dismissedNotificationIds = dismissed;
        });
      }
    } catch (e) {
      // Silent failure — notifications are non-critical
    }
  }

  Future<void> _dismissNotification(String id) async {
    final updated = [..._dismissedNotificationIds, id];
    setState(() => _dismissedNotificationIds = updated);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dismissed_notifications', jsonEncode(updated));
  }

  void _showNotificationCenter() {
    final undismissed = _notifications.where((n) => !_dismissedNotificationIds.contains(n['id'])).toList();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (context) => Directionality(
        textDirection: TextDirection.rtl,
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
          decoration: BoxDecoration(
            color: bgCard,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border.all(color: borderSubtle, width: 1.2),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: borderSubtle, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Text('الإشعارات', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: textPrimary, fontFamily: 'Cairo')),
              const SizedBox(height: 14),
              Flexible(
                child: undismissed.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(vertical: 30),
                        child: Text('لا توجد إشعارات جديدة', textAlign: TextAlign.center, style: TextStyle(color: textMuted, fontFamily: 'Cairo')),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        itemCount: undismissed.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final n = undismissed[index];
                          return StatefulBuilder(
                            builder: (context, setSheetState) => Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: bgElevated,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: borderSubtle),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(n['title'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: textPrimary, fontFamily: 'Cairo')),
                                        const SizedBox(height: 4),
                                        Text(n['body'] ?? '', style: TextStyle(fontSize: 12.5, color: textSecondary, fontFamily: 'Cairo', height: 1.5)),
                                      ],
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      _dismissNotification(n['id']);
                                      setSheetState(() => undismissed.removeAt(index));
                                    },
                                    child: Icon(Icons.close_rounded, size: 16, color: textMuted),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _fetchUserProfile() async {
    final userId = _apiClient.token;
    if (userId == null) return;
    try {
      final supabase = Supabase.instance.client;
      final profile = await supabase.from('profiles').select().eq('id', userId).single();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_user', jsonEncode(profile));
      setState(() {
        _userProfile = profile;
        _coins = double.tryParse(profile['coins']?.toString() ?? '50.0') ?? 50.0;
        if (_userProfile != null) {
          _selectedGrade = _userProfile!['grade_level'] ?? _selectedGrade;
        }
      });
    } catch (e) {
      debugPrint('Error fetching user profile: $e');
    }
  }

  Future<void> _loadLocalProfile() async {
    final prefs    = await SharedPreferences.getInstance();
    final userJson = prefs.getString('auth_user');
    if (userJson != null) {
      setState(() {
        _userProfile = jsonDecode(userJson);
        if (_userProfile != null) {
          _selectedGrade = _userProfile!['grade_level'] ?? _selectedGrade;
          _coins = double.tryParse(_userProfile!['coins']?.toString() ?? '50.0') ?? 50.0;
        }
      });
    }
  }

  List<Map<String, dynamic>> getActiveSubjectsForGrade(String grade) {
    final filtered = _allCurriculums.where((c) => c['grade_level'] == grade).toList();
    if (_activeCurriculumIds.isEmpty) return [];
    return filtered.where((c) => _activeCurriculumIds.contains(c['id'].toString())).toList();
  }

  Future<void> _fetchSystemConfig() async {
    try {
      final supabase = Supabase.instance.client;
      final resp     = await supabase.from('system_settings').select('value').eq('key', 'website_link').maybeSingle();
      if (resp != null) setState(() => _webPaymentLink = resolveWebsiteLink(resp['value']));

      final gradesResp = await supabase.from('system_settings').select('value').eq('key', 'active_grade_levels').maybeSingle();
      List<String> activeGrades = [];
      if (gradesResp != null && gradesResp['value'] != null) {
        activeGrades = List<String>.from(jsonDecode(gradesResp['value']));
      } else {
        activeGrades = ['1_middle', '2_middle', '3_middle', '1_high', '2_high', '3_high'];
      }

      final currsResp = await supabase.from('system_settings').select('value').eq('key', 'active_curriculum_ids').maybeSingle();
      List<String> activeCurrs = [];
      if (currsResp != null && currsResp['value'] != null) {
        activeCurrs = List<String>.from(jsonDecode(currsResp['value']));
      }

      final curriculumsResp = await supabase.from('curriculums').select();
      final allCurrs        = List<Map<String, dynamic>>.from(curriculumsResp);

      setState(() {
        _activeGradeLevels   = activeGrades;
        _activeCurriculumIds = activeCurrs;
        _allCurriculums      = allCurrs;
      });

      final currentGrade = _userProfile != null ? (_userProfile!['grade_level'] ?? _selectedGrade) : _selectedGrade;
      if (activeGrades.isNotEmpty && !activeGrades.contains(currentGrade)) {
        if (_userProfile == null) setState(() => _selectedGrade = activeGrades.first);
      }
      final resolvedGrade = _userProfile != null ? (_userProfile!['grade_level'] ?? _selectedGrade) : _selectedGrade;
      final activeSubjs   = getActiveSubjectsForGrade(resolvedGrade);
      if (activeSubjs.isNotEmpty && !activeSubjs.any((s) => s['subject_name'] == _selectedSubject)) {
        setState(() => _selectedSubject = activeSubjs.first['subject_name'].toString());
      }
    } catch (e) {
      debugPrint('Error fetching system config: $e');
    }
  }

  Future<void> _updateGuestMessageCount() async {
    try {
      final deviceId = _apiClient.deviceId;
      if (_apiClient.token == null && deviceId != null) {
        final supabase    = Supabase.instance.client;
        final guestRecord = await supabase.from('device_guests').select().eq('device_id', deviceId).maybeSingle();
        setState(() {
          _guestMessagesCount = guestRecord != null ? (guestRecord['free_message_count'] ?? 0) : 0;
          _coins = guestRecord != null ? (double.tryParse(guestRecord['coins']?.toString() ?? '5.0') ?? 5.0) : 5.0;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchSessions() async {
    setState(() => _sessionsLoading = true);
    try {
      final supabase = Supabase.instance.client;
      final userId   = _apiClient.token;
      final deviceId = _apiClient.deviceId;
      List<dynamic> response = [];
      if (userId != null) {
        response = await supabase.from('chat_sessions').select().eq('user_id', userId).order('created_at', ascending: false);
      } else if (deviceId != null) {
        response = await supabase
            .from('chat_sessions')
            .select()
            .eq('device_id', deviceId)
            .isFilter('user_id', null)
            .order('created_at', ascending: false);
      }
      setState(() => _sessions = List<Map<String, dynamic>>.from(response));
    } catch (_) {
    } finally {
      setState(() => _sessionsLoading = false);
    }
  }

  Future<void> _fetchChatHistory() async {
    if (_activeSessionId == null) {
      setState(() => _messages = []);
      return;
    }
    try {
      final supabase = Supabase.instance.client;
      final history  = await supabase.from('chat_history').select().eq('session_id', _activeSessionId!).order('created_at', ascending: true);
      setState(() {
        _messages = history.map((h) {
          final sender = h['sender'];
          final rawMsg = h['message'] ?? '';
          if (sender == 'ai') {
            final parsed = parseMessageContent(rawMsg);
            return {
              'sender':     'ai',
              'message':    parsed['message'],
              'thought':    parsed['thought'],
              'duration':   parsed['duration'],
              'isThinking': false,
            };
          }
          return {'sender': 'user', 'message': rawMsg};
        }).toList();
      });
      _scrollToBottom();
    } catch (_) {}
  }

  Future<void> _deleteSession(String sessionId) async {
    try {
      await Supabase.instance.client.from('chat_sessions').delete().eq('id', sessionId);
      if (_activeSessionId == sessionId) {
        setState(() { _activeSessionId = null; _messages = []; });
      }
      _fetchSessions();
    } catch (_) {}
  }

  void _startNewChat() {
    HapticFeedback.lightImpact();
    setState(() { _activeSessionId = null; _messages = []; });
  }

  Future<void> _sendMessage({String? customText}) async {
    final text = customText ?? _messageController.text.trim();
    if (text.isEmpty || _isLoading) return;
    HapticFeedback.mediumImpact();
    if (customText == null) {
      _messageController.clear();
    }
    _lastUserQuery = text;
    setState(() {
      _messages.add({'sender': 'user', 'message': text});
      _isLoading = true;
    });
    _scrollToBottom();

    Timer?    timer;
    Stopwatch stopwatch  = Stopwatch();
    bool      isThinking = true;

    try {
      final supabase = Supabase.instance.client;
      final userId   = _apiClient.token;
      final deviceId = _apiClient.deviceId;

      // Verify coin balance
      if (_coins <= 0) {
        setState(() {
          _messages.add({
            'sender':  'ai',
            'message': '⚠️ **انتهى الرصيد المتاح!**\n\nلقد استنفدت رصيد النقاط المتاح لك لهذا اليوم. سيتجدد رصيدك تلقائياً غداً.',
          });
          _isLoading = false;
        });
        _scrollToBottom();
        if (userId == null) {
          _showAuthDialog();
        }
        return;
      }

      // Beta: Pro model + Thinking are unlocked for all registered users (no payment tiers yet).
      if (_userProfile == null && (_selectedModel == 'pro' || _thinkingEnabled)) {
        setState(() {
          _messages.add({
            'sender':  'ai',
            'message': '⚠️ **يلزم تسجيل الدخول**\n\nنموذج المحترفين وميزة التفكير متاحة فقط للمستخدمين المسجلين.',
          });
          _isLoading = false;
        });
        _scrollToBottom();
        return;
      }

      // Resolve grade
      String targetGrade = _selectedGrade;
      if (userId != null) {
        final profile = await supabase.from('profiles').select('grade_level').eq('id', userId).single();
        targetGrade = profile['grade_level'] ?? _selectedGrade;
      }

      // Verify syllabus uploaded
      final hasCurriculum = _allCurriculums.any((c) =>
          c['subject_name'] == _selectedSubject &&
          c['grade_level'] == targetGrade);
      if (!hasCurriculum) {
        setState(() {
          _messages.add({
            'sender':  'ai',
            'message': '⚠️ **المنهج غير متوفر**\n\nالمنهج الدراسي غير متوفر حالياً لهذه المادة. (The course is unavailable.)',
          });
          _isLoading = false;
        });
        _scrollToBottom();
        return;
      }

      // Check if session course is valid
      if (_activeSessionId != null) {
        Map<String, dynamic>? session;
        for (final s in _sessions) {
          if (s['id'] == _activeSessionId) {
            session = s;
            break;
          }
        }
        if (session != null) {
          final sessionCurrValid = _allCurriculums.any((c) =>
              c['subject_name'] == session!['subject_name'] &&
              c['grade_level'] == session['grade_level'] &&
              _activeCurriculumIds.contains(c['id'].toString()));
          if (!sessionCurrValid) {
            setState(() {
              _messages.add({
                'sender':  'ai',
                'message': 'Please continue in another chat because the course has changed or been deleted.',
              });
              _isLoading = false;
            });
            _scrollToBottom();
            return;
          }
        }
      }

      // Create session if needed (only for logged-in users, guests use local dummy session ID)
      String currentSessionId = _activeSessionId ?? '';
      if (_activeSessionId == null) {
        final newSessionId = generateUUID();
        if (userId != null) {
          final plainText    = stripAudioPrefix(text);
          final title        = plainText.length > 30 ? '${plainText.substring(0, 30)}...' : plainText;
          await supabase.from('chat_sessions').insert({
            'id':           newSessionId,
            'user_id':      userId,
            'device_id':    null,
            'title':        title,
            'subject_name': _selectedSubject,
            'grade_level':  targetGrade,
            'created_at':   DateTime.now().toIso8601String(),
          });
        }
        currentSessionId = newSessionId;
        setState(() => _activeSessionId = newSessionId);
        if (userId != null) {
          _fetchSessions();
        }
      }

      final listWithoutCurrent = _messages.sublist(0, _messages.length - 1);
      final recentHistory = listWithoutCurrent.length > 6
          ? listWithoutCurrent.sublist(listWithoutCurrent.length - 6)
          : listWithoutCurrent;

      // Streaming placeholder
      setState(() {
        _messages.add({
          'sender': 'ai',
          'message': '',
          'thought': '',
          'isThinking': true,
          'duration': 0,
          'searchSteps': <Map<String, String>>[]
        });
        _isLoading = false;
      });
      final aiMsgIndex = _messages.length - 1;
      _scrollToBottom();
      stopwatch.start();
      timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (isThinking) {
          setState(() => _messages[aiMsgIndex]['duration'] = stopwatch.elapsed.inSeconds);
        } else {
          t.cancel();
        }
      });

      String fullThought = '', fullContent = '';
      final stream = generateChatResponseStream(
        websiteLink: _webPaymentLink,
        userQuery: text,
        gradeLevel: targetGrade,
        subjectName: _selectedSubject,
        sessionId: currentSessionId,
        model: _selectedModel,
        thinking: _thinkingEnabled,
        mode: _chatMode,
        history: recentHistory,
        authToken: _apiClient.token,
        deviceId: _apiClient.deviceId,
      );

      await for (final chunk in stream) {
        final type = chunk['type'];
        if (type == 'error') {
          throw Exception(chunk['message'] ?? chunk['content'] ?? 'حدث خطأ في الاتصال بالخادم');
        } else if (type == 'search_step') {
          setState(() {
            final steps = List<Map<String, String>>.from(_messages[aiMsgIndex]['searchSteps'] ?? []);
            steps.add({
              'step': chunk['step']?.toString() ?? '',
              'icon': chunk['icon']?.toString() ?? '',
              'message': chunk['message']?.toString() ?? '',
            });
            _messages[aiMsgIndex]['searchSteps'] = steps;
          });
        } else if (type == 'thought') {
          final content = chunk['content'] ?? '';
          fullThought += content;
          setState(() {
            _messages[aiMsgIndex]['thought']  = fullThought;
            _messages[aiMsgIndex]['duration'] = stopwatch.elapsed.inSeconds;
          });
          _smoothScrollToBottom();
        } else if (type == 'content') {
          if (isThinking) {
            isThinking = false;
            stopwatch.stop();
            timer.cancel();
          }
          final content = chunk['content'] ?? '';
          fullContent += content;
          setState(() {
            _messages[aiMsgIndex]['message']    = fullContent;
            _messages[aiMsgIndex]['isThinking'] = false;
          });
          _smoothScrollToBottom();
        } else if (type == 'done') {
          final serverSessionId = chunk['session_id'];
          if (serverSessionId != null && serverSessionId.toString().isNotEmpty) {
            setState(() => _activeSessionId = serverSessionId.toString());
          }
          final serverCoins = double.tryParse(chunk['remaining_coins']?.toString() ?? '');
          if (serverCoins != null) {
            setState(() => _coins = serverCoins);
          }
        }
      }

      isThinking = false;
      stopwatch.stop();
      timer.cancel();

      final finalDuration = stopwatch.elapsed.inSeconds;

      // Sync local profile or guest coins state from Supabase to ensure accurate balances
      if (userId != null) {
        try {
          final updatedProfile = await supabase.from('profiles').select().eq('id', userId).single();
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('auth_user', jsonEncode(updatedProfile));
          setState(() {
            _userProfile = updatedProfile;
            _coins = double.tryParse(updatedProfile['coins']?.toString() ?? '') ?? _coins;
          });
        } catch (e) {
          debugPrint('Error syncing profile coins: $e');
        }
      } else if (deviceId != null) {
        try {
          final guestRecord = await supabase.from('device_guests').select().eq('device_id', deviceId).maybeSingle();
          if (guestRecord != null) {
            setState(() {
              _coins = double.tryParse(guestRecord['coins']?.toString() ?? '') ?? _coins;
            });
          }
        } catch (e) {
          debugPrint('Error syncing guest coins: $e');
        }
      }

      setState(() {
        _messages[aiMsgIndex]['message']    = fullContent;
        _messages[aiMsgIndex]['thought']    = fullThought;
        _messages[aiMsgIndex]['duration']   = finalDuration;
        _messages[aiMsgIndex]['isThinking'] = false;
      });
      _scrollToBottom();
    } catch (e) {
      debugPrint('Error in _sendMessage: $e');
      timer?.cancel();
      stopwatch.stop();

      final errText = e.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
      String displayMsg;
      if (e is SocketException || e is TimeoutException || errText.contains('SocketException') || errText.contains('TimeoutException') || errText.contains('Failed host lookup') || errText.contains('No route to host')) {
        displayMsg = '⚠️ **حدث خطأ في الاتصال بالشبكة!**\n\nيرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.';
      } else {
        displayMsg = '⚠️ **حدث خطأ!**\n\n${errText.isNotEmpty ? errText : "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً."}';
      }

      setState(() {
        if (_messages.isNotEmpty && _messages.last['sender'] == 'ai') {
          _messages.last['message']    = displayMsg;
          _messages.last['isThinking'] = false;
          _messages.last['hasError']   = true;
        } else {
          _messages.add({
            'sender': 'ai',
            'message': displayMsg,
            'hasError': true
          });
        }
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  void _smoothScrollToBottom() {
    final now = DateTime.now();
    if (now.difference(_lastScrollTime).inMilliseconds > 120) {
      _lastScrollTime = now;
      _scrollToBottom();
    }
  }

  void _showAuthDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.72,
        maxChildSize: 0.92,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => AuthSheetWidget(
          apiClient: _apiClient,
          activeGradeLevels: _activeGradeLevels,
          websiteLink: _webPaymentLink,
          onSuccess: (token, user) async {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('auth_token', token);
            await prefs.setString('auth_user', jsonEncode(user));
            _apiClient.token = token;
            setState(() {
              _userProfile    = user;
              _selectedGrade  = user['grade_level'] ?? _selectedGrade;
              _coins          = double.tryParse(user['coins']?.toString() ?? '50.0') ?? 50.0;
              _messages       = [];
              _activeSessionId = null;
            });
            await _fetchSessions();
            if (_sessions.isNotEmpty) {
              setState(() => _activeSessionId = _sessions.first['id']);
              _fetchChatHistory();
            } else {
              _fetchChatHistory();
            }
            if (!context.mounted) return;
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('مرحباً بك يا ${user['name']}!'),
                backgroundColor: primaryOlive.withValues(alpha: 0.9),
              ),
            );
          },
        ),
      ),
    );
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
    _apiClient.token = null;
    setState(() {
      _userProfile        = null;
      _messages.clear();
      _activeSessionId    = null;
      _guestMessagesCount = 0;
      _coins              = 5.0;
    });
    await _updateGuestMessageCount();
    await _fetchSessions();
    if (_sessions.isNotEmpty) {
      setState(() => _activeSessionId = _sessions.first['id']);
      _fetchChatHistory();
    } else {
      _fetchChatHistory();
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم تسجيل الخروج بنجاح.')),
      );
    }
  }

  void _showSubscriptionsBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: borderSubtle, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(Icons.star_rounded, color: primaryOlive, size: 24),
                const SizedBox(width: 8),
                Text('باقات الاشتراك الرسمية', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary, fontFamily: 'Cairo')),
              ],
            ),
            const SizedBox(height: 6),
            Text('اختر باقة الاشتراك المناسبة واستمتع بكافة ميزات نموذج Pro وميزة التفكير', style: TextStyle(fontSize: 12, color: textMuted, fontFamily: 'Cairo')),
            const SizedBox(height: 20),

            // Plan 1: 50 EGP
            _buildMobilePlanCard(
              title: 'اشتراك شهر (Pro)',
              price: '50 ج.م / شهرياً',
              badge: 'الباقة الأكثر شعبية',
              features: 'وصول لنموذج Pro • ميزة التفكير • تجديد رصيد النقاط',
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('الاشتراك عبر متجر Google Play (Google Play Billing). جاري التجهيز...')),
                );
              },
            ),
            const SizedBox(height: 12),

            // Plan 2: 100 EGP
            _buildMobilePlanCard(
              title: 'اشتراك شهرين',
              price: '100 ج.م / شهرين',
              badge: null,
              features: 'جميع ميزات باقة Pro لمدة 60 يوماً متواصلة',
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('الاشتراك عبر متجر Google Play (Google Play Billing). جاري التجهيز...')),
                );
              },
            ),
            const SizedBox(height: 12),

            // Plan 3: 250 EGP
            _buildMobilePlanCard(
              title: 'اشتراك 3 أشهر',
              price: '250 ج.م / 3 أشهر',
              badge: 'أفضل قيمة',
              features: 'جميع ميزات باقة Pro لمدة 90 يوماً + دعم أولوية',
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('الاشتراك عبر متجر Google Play (Google Play Billing). جاري التجهيز...')),
                );
              },
            ),
            const SizedBox(height: 16),

            // Policy & Refund Note
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: bgElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderSubtle),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: primaryOlive, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'تتم المعاملات المباشرة عبر Google Play Billing. تتاح طلبات الاسترجاع خلال 3 أيام (72 ساعة) بشرط عدم استخدام أي من نقاط الباقة.',
                      style: TextStyle(fontSize: 11, color: textSecondary, fontFamily: 'Cairo', height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildMobilePlanCard({required String title, required String price, String? badge, required String features, required VoidCallback onTap}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: badge != null ? primaryOlive : borderSubtle, width: badge != null ? 1.5 : 1),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textPrimary, fontFamily: 'Cairo')),
                    if (badge != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: primaryOlive, borderRadius: BorderRadius.circular(10)),
                        child: Text(badge, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'Cairo')),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(price, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryOlive, fontFamily: 'Cairo')),
                const SizedBox(height: 4),
                Text(features, style: TextStyle(fontSize: 11, color: textMuted, fontFamily: 'Cairo')),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryOlive,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            child: const Text('اشتراك', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
          ),
        ],
      ),
    );
  }

  void _showContactSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: borderSubtle, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            Text('تواصل مع فريق الدعم', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary, fontFamily: 'Cairo')),
            const SizedBox(height: 6),
            Text('نحن في خدمتك دائماً لمساعدتك في الاستفسارات والاشتراكات', style: TextStyle(fontSize: 12, color: textMuted, fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.phone_rounded, color: primaryOlive),
              title: Text('الهاتف والواتساب', style: TextStyle(fontWeight: FontWeight.bold, color: textPrimary, fontFamily: 'Cairo', fontSize: 14)),
              subtitle: const Text('01037220587', style: TextStyle(color: primaryOlive, fontWeight: FontWeight.bold)),
              onTap: () {},
            ),
            Divider(color: borderSubtle),
            ListTile(
              leading: const Icon(Icons.email_rounded, color: primaryOlive),
              title: Text('البريد الإلكتروني الرسمـي', style: TextStyle(fontWeight: FontWeight.bold, color: textPrimary, fontFamily: 'Cairo', fontSize: 14)),
              subtitle: Text('sohaib572010@gmail.com', style: TextStyle(color: textSecondary, fontSize: 12)),
              onTap: () {},
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _openUpgradeFlow() {
    if (_userProfile == null) {
      _showAuthDialog();
    } else {
      _showSubscriptionsBottomSheet();
    }
  }

  void _showProfileSheet() {
    if (_userProfile == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (context) => ProfileBottomSheet(
        userProfile: _userProfile!,
        activeGradeLevels: _activeGradeLevels,
        gradeNames: _gradeNames,
        websiteLink: _webPaymentLink,
        onProfileUpdated: (updated) async {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('auth_user', jsonEncode(updated));
          setState(() {
            _userProfile = updated;
            _selectedGrade = updated['grade_level'] ?? _selectedGrade;
            _messages.clear();
            _activeSessionId = null;
          });
          await _fetchSessions();
          _fetchChatHistory();
        },
      ),
    );
  }

  // ── BUILD ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (!_isInit) {
      return Scaffold(
        backgroundColor: bgDeep,
        body: Center(child: _BootLoader()),
      );
    }

    // Guest mode now opens the main interface normally

    final String gradeName = _userProfile != null
        ? (_gradeNames[_userProfile!['grade_level']] ?? 'المنهج الدراسي')
        : (_gradeNames[_selectedGrade] ?? 'المنهج الدراسي');

    final isGuest = _userProfile == null;
    final bool inputEnabled = !_isLoading && !isGuest;
    final String inputHint = isGuest
        ? 'يرجى تسجيل الدخول للمتابعة'
        : 'اسأل عن درس، قانون أو حل مسألة...';

    // Read _guestMessagesCount to prevent unused field warning
    if (isGuest && _guestMessagesCount > 0) {
      debugPrint('Guest messages count: $_guestMessagesCount');
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgSurface,
        extendBodyBehindAppBar: false,
        appBar: _buildPremiumAppBar(),
        endDrawer: _buildPremiumDrawer(gradeName),
        body: Column(
          children: [
            // Messages area
            Expanded(
              child: _messages.isEmpty
                  ? _WelcomeScreen(
                      selectedSubject: _selectedSubject,
                      gradeName:       gradeName,
                      userProfile:     _userProfile,
                      coins:           _coins,
                      activeGradeLevels:   _activeGradeLevels,
                      allCurriculums:      _allCurriculums,
                      activeCurriculumIds: _activeCurriculumIds,
                      selectedGrade:   _selectedGrade,
                      gradeNames:      _gradeNames,
                      onChipTap: (prompt) => setState(() => _messageController.text = prompt),
                      onLoginTapped:   _showAuthDialog,
                      onGradeChanged: (val) async {
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.setString('selected_grade', val);
                        setState(() => _selectedGrade = val);
                        final subjs = getActiveSubjectsForGrade(val);
                        if (subjs.isNotEmpty) {
                          final firstSubj = subjs.first['subject_name'].toString();
                          await prefs.setString('selected_subject', firstSubj);
                          setState(() => _selectedSubject = firstSubj);
                        }
                      },
                      onSubjectChanged: (val) async {
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.setString('selected_subject', val);
                        setState(() => _selectedSubject = val);
                      },
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final msg    = _messages[index];
                        final isUser = msg['sender'] == 'user';
                        String? precedingUserQuery;
                        for (int i = index - 1; i >= 0; i--) {
                          if (_messages[i]['sender'] == 'user') {
                            precedingUserQuery = _messages[i]['message'] as String?;
                            break;
                          }
                        }
                        return ChatBubbleWidget(
                          key:    ValueKey('msg_$index'),
                          msg:    msg,
                          isUser: isUser,
                          userQuery: precedingUserQuery,
                          onAnswerSubmit: (answer) {},
                          onGoToExams: (exam) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ExamsScreen(initialExam: exam, websiteLink: _webPaymentLink),
                              ),
                            );
                          },
                          onRetry: _lastUserQuery != null ? () => _sendMessage(customText: _lastUserQuery) : null,
                        );
                      },
                    ),
            ),

            // Thinking indicator
            if (_isLoading)
              Padding(
                padding: const EdgeInsets.only(right: 16, left: 16, bottom: 4),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: _ThinkingBadge(),
                ),
              ),

            // Input bar
            _PremiumInputBar(
              controller:    _messageController,
              focusNode:     _inputFocus,
              hasText:       _hasText,
              isLoading:     _isLoading,
              onSend:        _sendMessage,
              enabled:       inputEnabled,
              hintText:      inputHint,
              selectedModel:   _selectedModel,
              thinkingEnabled: _thinkingEnabled,
              chatMode:        _chatMode,
              // Beta: Pro model + Thinking are unlocked for all registered users (no payment tiers yet).
              userPlan:        _userProfile == null ? 'guest' : 'registered',
              websiteLink:     _webPaymentLink,
              onModelChanged: (model) {
                if (model == 'lock_upgrade') {
                  _openUpgradeFlow();
                } else {
                  setState(() => _selectedModel = model);
                }
              },
              onThinkingChanged: (enabled) {
                if (_userProfile == null) {
                  _openUpgradeFlow();
                } else {
                  setState(() => _thinkingEnabled = enabled);
                }
              },
              onModeChanged: (mode) async {
                setState(() => _chatMode = mode);
                final prefs = await SharedPreferences.getInstance();
                await prefs.setString('chat_mode', mode);
              },
            ),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildPremiumAppBar() {
    return PreferredSize(
      preferredSize: const Size.fromHeight(60),
      child: ClipRect(
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: BoxDecoration(
              color: bgCard.withValues(alpha: 0.85),
              border: Border(
                bottom: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Row(
                  children: [
                    // New chat button
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: bgElevated,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: borderSubtle),
                        ),
                        child: Icon(Icons.add, color: textSecondary, size: 18),
                      ),
                      onPressed: _startNewChat,
                      tooltip: 'محادثة جديدة',
                    ),
                    // Title
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              ShaderMask(
                                shaderCallback: (bounds) => olivGradient.createShader(bounds),
                                child: const Text(
                                  'EGS AI',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 17,
                                    color: Colors.white,
                                    fontFamily: 'Cairo',
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: primaryOlive.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: primaryOlive.withValues(alpha: 0.3)),
                                ),
                                child: const Text(
                                  'BETA',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: primaryOlive, fontFamily: 'Cairo', letterSpacing: 0.3),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            _selectedSubject,
                            style: TextStyle(fontSize: 11, color: textSecondary, fontFamily: 'Cairo'),
                          ),
                        ],
                      ),
                    ),
                    // Notifications bell button
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: bgElevated,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: borderSubtle),
                        ),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Icon(Icons.notifications_outlined, color: textSecondary, size: 18),
                            if (_notifications.where((n) => !_dismissedNotificationIds.contains(n['id'])).isNotEmpty)
                              Positioned(
                                top: -2, left: -2,
                                child: Container(
                                  width: 8, height: 8,
                                  decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                                ),
                              ),
                          ],
                        ),
                      ),
                      onPressed: _showNotificationCenter,
                      tooltip: 'الإشعارات',
                    ),
                    // Menu button
                    Builder(
                      builder: (ctx) => IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: bgElevated,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: borderSubtle),
                          ),
                          child: Icon(Icons.menu_rounded, color: textSecondary, size: 18),
                        ),
                        onPressed: () => Scaffold.of(ctx).openEndDrawer(),
                        tooltip: 'القائمة',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }


  Widget _buildPremiumDrawer(String gradeName) {
    final isGuest   = _userProfile == null;
    final planType  = _userProfile?['plan_type'] ?? 'free';
    final userName  = _userProfile?['name'] ?? '';
    final initials  = userName.isNotEmpty ? userName.trim()[0] : '؟';

    return Drawer(
      backgroundColor: bgCard,
      width: MediaQuery.of(context).size.width * 0.82,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primaryOlive.withValues(alpha: 0.12), Colors.transparent],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                border: Border(bottom: BorderSide(color: borderSubtle)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Avatar ring
                      Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: isGuest ? null : olivGradient,
                          color: isGuest ? bgElevated : null,
                          border: isGuest ? Border.all(color: borderSubtle) : null,
                        ),
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isGuest ? bgElevated : bgCard,
                          ),
                          child: Center(
                            child: isGuest
                                ? Icon(Icons.person_outline, color: textMuted, size: 22)
                                : Text(
                                    initials,
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: primaryOlive,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isGuest ? 'زائر' : userName,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: textPrimary,
                                fontFamily: 'Cairo',
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            if (!isGuest) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  gradient: planType == 'max'
                                      ? const LinearGradient(colors: [Color(0xFFFFD700), Color(0xFFFFA500)])
                                      : planType == 'pro'
                                          ? olivGradient
                                          : null,
                                  color: planType == 'free' ? bgElevated : null,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  _planNames[planType] ?? 'مجاني',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: planType == 'free' ? textSecondary : Colors.white,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'الرصيد: ${_coins.toStringAsFixed(1)} عملة | ${_points.toInt()} نقاط الترتيب',
                                style: TextStyle(fontSize: 10.5, color: textSecondary, fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                              ),
                            ] else ...[
                              Text(
                                'الرصيد التجريبي: ${_coins.toStringAsFixed(1)} عملة',
                                style: TextStyle(fontSize: 10.5, color: textSecondary, fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Menu items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.only(top: 8),
                children: [
                  _DrawerTile(
                    icon: Icons.school_rounded,
                    title: 'السنة الدراسية',
                    subtitle: gradeName,
                    onTap: () async {
                      final allowed = _userProfile == null
                          ? _activeGradeLevels.where((g) => _allCurriculums.any((c) => c['grade_level'] == g)).toList()
                          : null;
                      final result = await showDialog<String>(
                        context: context,
                        builder: (context) => _GradePickerDialog(
                          gradeNames:  _gradeNames,
                          currentGrade: _selectedGrade,
                          allowedGrades: allowed,
                        ),
                      );
                      if (result != null) {
                        final prefs = await SharedPreferences.getInstance();
                        if (_userProfile != null) {
                          try {
                            await Supabase.instance.client.from('profiles').update({'grade_level': result}).eq('id', _userProfile!['id']);
                            final updated = Map<String, dynamic>.from(_userProfile!);
                            updated['grade_level'] = result;
                            await prefs.setString('auth_user', jsonEncode(updated));
                            setState(() { _userProfile = updated; _selectedGrade = result; _messages.clear(); _activeSessionId = null; });
                          } catch (_) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('فشل تحديث السنة الدراسية')));
                            }
                            return;
                          }
                        } else {
                          await prefs.setString('selected_grade', result);
                          setState(() { _selectedGrade = result; _messages.clear(); _activeSessionId = null; });
                        }
                        await _fetchSessions();
                        _fetchChatHistory();
                      }
                    },
                  ),

                  ValueListenableBuilder<ThemeMode>(
                    valueListenable: themeModeNotifier,
                    builder: (context, currentMode, child) {
                      String modeText = 'تلقائي حسب النظام';
                      IconData modeIcon = Icons.brightness_auto_rounded;
                      if (currentMode == ThemeMode.light) {
                        modeText = 'الوضع المضيء';
                        modeIcon = Icons.light_mode_rounded;
                      } else if (currentMode == ThemeMode.dark) {
                        modeText = 'الوضع المظلم';
                        modeIcon = Icons.dark_mode_rounded;
                      }

                      return _DrawerTile(
                        icon: modeIcon,
                        title: 'مظهر التطبيق',
                        subtitle: modeText,
                        onTap: () async {
                          final result = await showDialog<ThemeMode>(
                            context: context,
                            builder: (context) => _ThemePickerDialog(currentMode: currentMode),
                          );
                          if (result != null) {
                            final prefs = await SharedPreferences.getInstance();
                            String savedModeStr = 'system';
                            if (result == ThemeMode.light) savedModeStr = 'light';
                            if (result == ThemeMode.dark) savedModeStr = 'dark';
                            await prefs.setString('theme_mode', savedModeStr);
                            themeModeNotifier.value = result;
                          }
                        },
                      );
                    },
                  ),

                  _DrawerTile(
                    icon: Icons.assignment_turned_in_rounded,
                    title: 'الامتحانات والاختبارات',
                    subtitle: 'التقييمات الذكية وسجل الدرجات',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => ExamsScreen(websiteLink: _webPaymentLink)),
                      );
                    },
                  ),

                  if (!isGuest) ...[
                    _DrawerTile(
                      icon: Icons.psychology_rounded,
                      title: 'المدرب الذكي (الكروت)',
                      subtitle: 'مراجعة المفاهيم والتعلم الفعال',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => FlashcardsScreen(websiteLink: _webPaymentLink)),
                        );
                      },
                    ),
                    _DrawerTile(
                      icon: Icons.emoji_events_rounded,
                      title: 'لوحة المتصدرين',
                      subtitle: 'ترتيب وتصنيف الطلاب المتفوقين',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => LeaderboardScreen(websiteLink: _webPaymentLink)),
                        );
                      },
                    ),
                  ],

                  _DrawerTile(
                    icon: Icons.privacy_tip_rounded,
                    title: 'الخصوصية والشروط',
                    subtitle: 'سياسة الخصوصية وشروط الاستخدام',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const PrivacyPolicyScreen()),
                      );
                    },
                  ),

                  if (!isGuest) ...[
                    _DrawerTile(
                      icon:  Icons.person_rounded,
                      title: 'الملف الشخصي',
                      subtitle: 'تعديل الاسم وكلمة المرور',
                      onTap: () { Navigator.pop(context); _showProfileSheet(); },
                    ),
                    _DrawerTile(
                      icon:      Icons.star_rounded,
                      iconColor: primaryOlive,
                      title:     'باقات الاشتراك',
                      subtitle:  'باقة برو 50 ج.م / 100 ج.م / 250 ج.م',
                      onTap:     () { Navigator.pop(context); _openUpgradeFlow(); },
                    ),
                    _DrawerTile(
                      icon:      Icons.support_agent_rounded,
                      iconColor: primaryOlive,
                      title:     'تواصل معنا',
                      subtitle:  'الهاتف والواتساب والبريد الرسمي',
                      onTap:     () { Navigator.pop(context); _showContactSheet(); },
                    ),
                  ],

                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      children: [
                        Icon(Icons.history_rounded, size: 14, color: primaryOlive),
                        SizedBox(width: 6),
                        Text('سجل المحادثات', style: TextStyle(fontWeight: FontWeight.bold, color: primaryOlive, fontSize: 12, fontFamily: 'Cairo')),
                      ],
                    ),
                  ),

                  if (_sessionsLoading)
                    const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: primaryOlive, strokeWidth: 2))),
                    )
                  else if (_sessions.isEmpty)
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Text('لا يوجد محادثات سابقة', style: TextStyle(fontSize: 12, color: textMuted, fontFamily: 'Cairo')),
                    )
                  else
                    ..._sessions
                        .where((session) => session['grade_level'] == _selectedGrade)
                        .map((session) {
                      final isSelected = _activeSessionId == session['id'];
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                        decoration: BoxDecoration(
                          color:        isSelected ? primaryOlive.withValues(alpha: 0.08) : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          border:       Border.all(color: isSelected ? primaryOlive.withValues(alpha: 0.25) : Colors.transparent),
                        ),
                        child: ListTile(
                          dense: true,
                          leading: Icon(Icons.chat_bubble_outline_rounded, size: 16, color: isSelected ? primaryOlive : textMuted),
                          title: Text(
                            session['title'] ?? 'محادثة',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              color:      isSelected ? textPrimary : textSecondary,
                              fontFamily: 'Cairo',
                            ),
                          ),
                          subtitle: Text(
                            '${session['subject_name'] ?? ''} · ${_gradeNames[session['grade_level']] ?? ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 10, color: isSelected ? primaryOlive.withValues(alpha: 0.8) : textMuted, fontFamily: 'Cairo'),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, size: 16, color: Colors.redAccent),
                            onPressed: () => _deleteSession(session['id']),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                          onTap: () {
                            if (session['grade_level'] != _selectedGrade) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('لا يمكنك متابعة هذه المحادثة لأنها تنتمي لصف دراسي آخر.')),
                              );
                              return;
                            }
                            setState(() {
                              _activeSessionId = session['id'];
                              _selectedSubject = session['subject_name'] ?? _selectedSubject;
                              final sessionMode = session['mode']?.toString();
                              if (sessionMode == 'socratic' || sessionMode == 'detailed' || sessionMode == 'summary') {
                                _chatMode = sessionMode!;
                              }
                            });
                            _fetchChatHistory();
                            Navigator.pop(context);
                          },
                        ),
                      );
                    }),
                ],
              ),
            ),

            // Footer action
            Padding(
              padding: const EdgeInsets.all(16),
              child: isGuest
                  ? _GradientButton(
                      label:    'تسجيل دخول / إنشاء حساب',
                      icon:     Icons.login_rounded,
                      onTap:    () { Navigator.pop(context); _showAuthDialog(); },
                    )
                  : GestureDetector(
                      onTap: () { Navigator.pop(context); _logout(); },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color:        const Color(0xFF2A1212),
                          borderRadius: BorderRadius.circular(12),
                          border:       Border.all(color: const Color(0xFF3D1919)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.logout_rounded, color: Color(0xFFFF7070), size: 18),
                            SizedBox(width: 10),
                            Text('تسجيل الخروج', style: TextStyle(color: Color(0xFFFF7070), fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
                          ],
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME / EMPTY STATE SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
class _WelcomeScreen extends StatefulWidget {
  final String selectedSubject;
  final String gradeName;
  final Map<String, dynamic>? userProfile;
  final double coins;
  final List<String> activeGradeLevels;
  final List<Map<String, dynamic>> allCurriculums;
  final List<String> activeCurriculumIds;
  final String selectedGrade;
  final Map<String, String> gradeNames;
  final Function(String) onChipTap;
  final Function(String) onGradeChanged;
  final Function(String) onSubjectChanged;
  final VoidCallback onLoginTapped;

  const _WelcomeScreen({
    required this.selectedSubject,
    required this.gradeName,
    required this.userProfile,
    required this.coins,
    required this.activeGradeLevels,
    required this.allCurriculums,
    required this.activeCurriculumIds,
    required this.selectedGrade,
    required this.gradeNames,
    required this.onChipTap,
    required this.onGradeChanged,
    required this.onSubjectChanged,
    required this.onLoginTapped,
  });

  @override
  State<_WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<_WelcomeScreen> with TickerProviderStateMixin {
  late AnimationController _orbController;
  late AnimationController _fadeController;
  late Animation<double>   _fadeAnim;

  @override
  void initState() {
    super.initState();
    _orbController = AnimationController(vsync: this, duration: const Duration(seconds: 8))..repeat(reverse: true);
    _fadeController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _fadeAnim = CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);
    _fadeController.forward();
  }

  @override
  void dispose() {
    _orbController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _getActiveSubjects() {
    final filtered = widget.allCurriculums.where((c) => c['grade_level'] == widget.selectedGrade).toList();
    if (widget.activeCurriculumIds.isEmpty) return [];
    return filtered.where((c) => widget.activeCurriculumIds.contains(c['id'].toString())).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isGuest      = widget.userProfile == null;
    final activeSubjs  = _getActiveSubjects();
    final filteredGrades = widget.activeGradeLevels
        .where((g) => widget.allCurriculums.any((c) => c['grade_level'] == g))
        .toList();

    return FadeTransition(
      opacity: _fadeAnim,
      child: Stack(
        children: [
          // Floating orbs background
          AnimatedBuilder(
            animation: _orbController,
            builder: (context, _) {
              return CustomPaint(
                painter: _OrbPainter(_orbController.value),
                size: Size.infinite,
              );
            },
          ),
          // Content
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 32, 20, 20),
            child: Column(
              children: [
                // Logo orb
                const _PulsingOrb(),
                const SizedBox(height: 28),

                // Headline
                ShaderMask(
                  shaderCallback: (b) => olivGradient.createShader(b),
                  child: const Text(
                    'EGS AI',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 30,
                      color: Colors.white,
                      fontFamily: 'Cairo',
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'مساعدك الذكي في منهج ${widget.selectedSubject} لـ ${widget.gradeName}',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: textSecondary, fontSize: 13.5, fontFamily: 'Cairo', height: 1.6),
                ),

                const SizedBox(height: 24),

                // Grade / Subject selectors (guests vs logged in)
                if (isGuest) ...[
                  _SelectionPills(
                    selectedGrade:       widget.selectedGrade,
                    selectedSubject:     widget.selectedSubject,
                    activeGradeLevels:   filteredGrades,
                    gradeNames:          widget.gradeNames,
                    activeSubjects:      activeSubjs,
                    onGradeChanged:      widget.onGradeChanged,
                    onSubjectChanged:    widget.onSubjectChanged,
                  ),
                  const SizedBox(height: 20),
                ] else ...[
                  _CourseSelectionChips(
                    selectedSubject:     widget.selectedSubject,
                    activeSubjects:      activeSubjs,
                    onSubjectChanged:    widget.onSubjectChanged,
                  ),
                  const SizedBox(height: 20),
                ],

                if (isGuest) ...[
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: bgCard,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: borderSubtle, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        )
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: primaryOlive.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: primaryOlive.withValues(alpha: 0.3), width: 1),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.login_rounded,
                              color: primaryOlive,
                              size: 24,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Log in to continue',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'يرجى تسجيل الدخول لمتابعة استخدام المنصة التعليمية وطرح الأسئلة.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            color: textSecondary,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 20),
                        _GradientButton(
                          label: 'تسجيل الدخول / Log In',
                          icon: Icons.login_rounded,
                          onTap: widget.onLoginTapped,
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Suggestion cards
                  const Align(
                    alignment: Alignment.centerRight,
                    child: Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: Text(
                        'ابدأ بسؤال سريع:',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryOlive, fontFamily: 'Cairo'),
                      ),
                    ),
                  ),
                  Column(
                    children: [
                      _SuggestionCard(
                        icon:   Icons.menu_book_rounded,
                        label:  'شرح درس مبسط',
                        desc:   'اشرح أي درس بأسلوب ممتع مع أمثلة توضيحية',
                        prompt: 'اشرح لي درساً من منهج ${widget.selectedSubject} بأسلوب مبسط وشيق مع أمثلة للتوضيح.',
                        onTap:  widget.onChipTap,
                      ),
                      const SizedBox(height: 10),
                      _SuggestionCard(
                        icon:   Icons.summarize_rounded,
                        label:  'ملخص القوانين',
                        desc:   'لخص أهم المصطلحات والقوانين المقررة',
                        prompt: 'لخص لي أهم المصطلحات والقوانين والتعريفات المقررة في منهج ${widget.selectedSubject}.',
                        onTap:  widget.onChipTap,
                      ),
                      const SizedBox(height: 10),
                      _SuggestionCard(
                        icon:   Icons.psychology_rounded,
                        label:  'خطوات حل المسائل',
                        desc:   'افهم خطوات الحل على مثال محلول',
                        prompt: 'ساعدني في فهم خطوات حل المسائل الصعبة في ${widget.selectedSubject} وطبق ذلك على مثال محلول.',
                        onTap:  widget.onChipTap,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Floating Orb Painter ─────────────────────────────────────────────────────
class _OrbPainter extends CustomPainter {
  final double t;
  _OrbPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    void drawOrb(double cx, double cy, double r, Color color) {
      paint.shader = RadialGradient(
        colors: [color.withValues(alpha: 0.12), Colors.transparent],
      ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: r));
      canvas.drawCircle(Offset(cx, cy), r, paint);
    }
    final w = size.width, h = size.height;
    drawOrb(w * 0.15 + 30 * sin(t * pi * 2), h * 0.25 + 20 * cos(t * pi * 2), 120, primaryOlive);
    drawOrb(w * 0.85 + 25 * cos(t * pi * 2 + 1), h * 0.15 + 30 * sin(t * pi * 2 + 1), 100, accentOlive);
    drawOrb(w * 0.5 + 20 * sin(t * pi * 2 + 2), h * 0.65 + 25 * cos(t * pi * 2 + 2), 90, darkOlive);
  }

  @override
  bool shouldRepaint(_OrbPainter old) => old.t != t;
}

// ─── Pulsing Logo Orb ─────────────────────────────────────────────────────────
class _PulsingOrb extends StatefulWidget {
  const _PulsingOrb();
  @override
  State<_PulsingOrb> createState() => _PulsingOrbState();
}

class _PulsingOrbState extends State<_PulsingOrb> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double>   _glow;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _glow = Tween<double>(begin: 8, end: 28).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glow,
      builder: (context, child) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          shape:     BoxShape.circle,
          color:     primaryOlive.withValues(alpha: 0.08),
          border:    Border.all(color: primaryOlive.withValues(alpha: 0.2), width: 1.5),
          boxShadow: [
            BoxShadow(color: primaryOlive.withValues(alpha: 0.18), blurRadius: _glow.value, spreadRadius: _glow.value / 3),
          ],
        ),
        child: child,
      ),
      child: ClipOval(
        child: Image.asset(
          'assets/logo.png',
          width: 52,
          height: 52,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

// ─── Selection Pills (Grade / Subject) ────────────────────────────────────────
class _SelectionPills extends StatelessWidget {
  final String selectedGrade;
  final String selectedSubject;
  final List<String> activeGradeLevels;
  final Map<String, String> gradeNames;
  final List<Map<String, dynamic>> activeSubjects;
  final Function(String) onGradeChanged;
  final Function(String) onSubjectChanged;

  const _SelectionPills({
    required this.selectedGrade,
    required this.selectedSubject,
    required this.activeGradeLevels,
    required this.gradeNames,
    required this.activeSubjects,
    required this.onGradeChanged,
    required this.onSubjectChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color:        bgElevated,
        borderRadius: BorderRadius.circular(16),
        border:       Border.all(color: borderSubtle),
      ),
      child: Row(
        children: [
          Expanded(
            child: _PillDropdown<String>(
              label:  'الصف',
              value:  selectedGrade,
              items:  gradeNames.entries
                  .where((e) => activeGradeLevels.contains(e.key) || e.key == selectedGrade)
                  .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 12.5, fontFamily: 'Cairo'))))
                  .toList(),
              onChanged: onGradeChanged,
            ),
          ),
          Container(width: 1, height: 36, color: borderSubtle, margin: const EdgeInsets.symmetric(horizontal: 10)),
          Expanded(
            child: _PillDropdown<String>(
              label:  'المادة',
              value:  activeSubjects.any((s) => s['subject_name'] == selectedSubject) ? selectedSubject : null,
              hint:   'اختر مادة',
              items:  activeSubjects
                  .map((s) => DropdownMenuItem(
                        value: s['subject_name'].toString(),
                        child: Text(s['subject_name'].toString(), style: const TextStyle(fontSize: 12.5, fontFamily: 'Cairo')),
                      ))
                  .toList(),
              onChanged: onSubjectChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class _PillDropdown<T> extends StatelessWidget {
  final String label;
  final T? value;
  final String? hint;
  final List<DropdownMenuItem<T>> items;
  final Function(T) onChanged;

  const _PillDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 10, color: textMuted, fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        DropdownButtonHideUnderline(
          child: DropdownButton<T>(
            value:         value,
            isExpanded:    true,
            isDense:       true,
            dropdownColor: bgCard,
            iconEnabledColor: primaryOlive,
            hint: hint != null ? Text(hint!, style: TextStyle(fontSize: 12, color: textMuted, fontFamily: 'Cairo')) : null,
            style: TextStyle(fontSize: 12.5, color: textPrimary, fontFamily: 'Cairo'),
            items:    items,
            onChanged: (v) { if (v != null) onChanged(v); },
          ),
        ),
      ],
    );
  }
}

// ─── Suggestion Card ──────────────────────────────────────────────────────────
class _SuggestionCard extends StatefulWidget {
  final IconData icon;
  final String label;
  final String desc;
  final String prompt;
  final Function(String) onTap;

  const _SuggestionCard({
    required this.icon,
    required this.label,
    required this.desc,
    required this.prompt,
    required this.onTap,
  });

  @override
  State<_SuggestionCard> createState() => _SuggestionCardState();
}

class _SuggestionCardState extends State<_SuggestionCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown:  (_) => setState(() => _pressed = true),
      onTapUp:    (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onTap(widget.prompt);
      },
      child: AnimatedScale(
        scale:    _pressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color:        bgCard,
            borderRadius: BorderRadius.circular(16),
            border:       Border.all(
              color: _pressed ? primaryOlive.withValues(alpha: 0.4) : borderSubtle,
            ),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color:        primaryOlive.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border:       Border.all(color: primaryOlive.withValues(alpha: 0.15)),
                ),
                child: Center(child: Icon(widget.icon, color: primaryOlive, size: 20)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.label, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, color: textPrimary, fontFamily: 'Cairo')),
                    const SizedBox(height: 2),
                    Text(widget.desc, style: TextStyle(fontSize: 11.5, color: textSecondary, fontFamily: 'Cairo')),
                  ],
                ),
              ),
              Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT BUBBLE
// ═══════════════════════════════════════════════════════════════════════════════

class ChatBubbleWidget extends StatefulWidget {
  final Map<String, dynamic> msg;
  final bool isUser;
  final String? userQuery;
  final Function(String)? onAnswerSubmit;
  final Function(Map<String, dynamic>)? onGoToExams;
  final VoidCallback? onRetry;
  final String websiteLink;

  const ChatBubbleWidget({
    super.key,
    required this.msg,
    required this.isUser,
    this.userQuery,
    this.onAnswerSubmit,
    this.onGoToExams,
    this.onRetry,
    this.websiteLink = '',
  });

  @override
  State<ChatBubbleWidget> createState() => _ChatBubbleWidgetState();
}

class _ChatBubbleWidgetState extends State<ChatBubbleWidget> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double>   _fadeAnim;
  late Animation<Offset>   _slideAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _fadeAnim  = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: Offset(widget.isUser ? 0.08 : -0.04, 0.04),
      end:   Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
    _ctrl.forward();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: SlideTransition(
        position: _slideAnim,
        child: widget.isUser ? _buildUserBubble() : _buildAiBubble(),
      ),
    );
  }

  Widget _buildUserBubble() {
    final message = widget.msg['message'] ?? '';
    if (message.startsWith('[AUDIO_MESSAGE:')) {
      final regExp = RegExp(r'^\[AUDIO_MESSAGE:[^;]+;[^\]]+\]([\s\S]*)$');
      final match = regExp.firstMatch(message);
      final remainingText = match?.group(1) ?? '';
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(top: 6, bottom: 6, left: 52, right: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            gradient: olivGradient,
            borderRadius: const BorderRadius.only(
              topLeft:     Radius.circular(20),
              topRight:    Radius.circular(20),
              bottomLeft:  Radius.circular(20),
              bottomRight: Radius.circular(5),
            ),
            boxShadow: [
              BoxShadow(color: primaryOlive.withValues(alpha: 0.25), blurRadius: 10, offset: const Offset(0, 3)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.mic_none_rounded, color: Colors.white70, size: 15),
                  SizedBox(width: 6),
                  Text('رسالة صوتية (لم تعد مدعومة)', style: TextStyle(color: Colors.white70, fontSize: 12.5, fontStyle: FontStyle.italic, fontFamily: 'Cairo')),
                ],
              ),
              if (remainingText.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(remainingText, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
              ],
            ],
          ),
        ),
      );
    } else if (message.startsWith('[IMAGE_MESSAGE:')) {
      final regExp = RegExp(r'^\[IMAGE_MESSAGE:([^;]+);([^;]+);([^\]]*)\]([\s\S]*)$');
      final match = regExp.firstMatch(message);
      if (match != null) {
        final base64Data = match.group(2)!;
        final text = match.group(4)!;
        return Align(
          alignment: Alignment.centerRight,
          child: Container(
            margin: const EdgeInsets.only(top: 6, bottom: 6, left: 52, right: 4),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: olivGradient,
              borderRadius: const BorderRadius.only(
                topLeft:     Radius.circular(20),
                topRight:    Radius.circular(20),
                bottomLeft:  Radius.circular(20),
                bottomRight: Radius.circular(5),
              ),
              boxShadow: [
                BoxShadow(color: primaryOlive.withValues(alpha: 0.25), blurRadius: 10, offset: const Offset(0, 3)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 250),
                    child: Image.memory(
                      base64Decode(base64Data),
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                if (text.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    child: Text(
                      text,
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontFamily: 'Cairo', height: 1.4),
                      textDirection: TextDirection.rtl,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      }
    }
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(top: 6, bottom: 6, left: 52, right: 4),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        decoration: BoxDecoration(
          gradient: olivGradient,
          borderRadius: const BorderRadius.only(
            topLeft:     Radius.circular(20),
            topRight:    Radius.circular(20),
            bottomLeft:  Radius.circular(20),
            bottomRight: Radius.circular(5),
          ),
          boxShadow: [
            BoxShadow(color: primaryOlive.withValues(alpha: 0.25), blurRadius: 10, offset: const Offset(0, 3)),
          ],
        ),
        child: Text(
          message,
          style: const TextStyle(color: Colors.white, fontSize: 14.5, height: 1.5, fontFamily: 'Cairo'),
        ),
      ),
    );
  }

  Widget _buildAiBubble() {
    final message    = widget.msg['message']    ?? '';
    final thought    = widget.msg['thought']    ?? '';
    final duration   = widget.msg['duration']   ?? 0;
    final isThinking = widget.msg['isThinking'] ?? false;
    final searchSteps = widget.msg['searchSteps'] as List?;

    return Container(
      margin: const EdgeInsets.only(top: 6, bottom: 6, left: 2, right: 2),
      decoration: BoxDecoration(
        color:        bgCard,
        borderRadius: const BorderRadius.only(
          topLeft:     Radius.circular(20),
          topRight:    Radius.circular(20),
          bottomRight: Radius.circular(20),
          bottomLeft:  Radius.circular(5),
        ),
        border: Border.all(color: borderSubtle),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          topLeft:     Radius.circular(20),
          topRight:    Radius.circular(20),
          bottomRight: Radius.circular(20),
          bottomLeft:  Radius.circular(5),
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left accent stripe
              Container(
                width: 3,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [primaryOlive, accentOlive],
                    begin: Alignment.topCenter,
                    end:   Alignment.bottomCenter,
                  ),
                ),
              ),
              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(3),
                            width: 25,
                            height: 25,
                            decoration: const BoxDecoration(
                              color:        Colors.white,
                              shape:        BoxShape.circle,
                            ),
                            child: ClipOval(
                              child: Image.asset(
                                'assets/logo.png',
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                          const SizedBox(width: 9),
                          const Text(
                            'مساعد EGS AI الذكي',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: primaryOlive, fontFamily: 'Cairo'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Search steps
                      if ((searchSteps != null && searchSteps.isNotEmpty) || isThinking)
                        SearchStepsPanel(
                          steps: searchSteps ?? [],
                          isSearching: isThinking,
                        ),

                      // Thought process
                      if (thought.isNotEmpty || isThinking)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: ThoughtProcessWidget(
                            thought:    thought,
                            duration:   duration,
                            isThinking: isThinking,
                          ),
                        ),

                      // Message content
                      if (message.isNotEmpty)
                        MarkdownFormatterWidget(
                          text: message,
                          onAnswerSubmit: widget.onAnswerSubmit,
                          onGoToExams: widget.onGoToExams,
                          websiteLink: widget.websiteLink,
                        )
                      else if (isThinking)
                        const _ThinkingDots(),

                      // Copy + Report buttons
                      if (message.isNotEmpty && widget.msg['hasError'] != true)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 10),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _CopyButton(text: message),
                                const SizedBox(width: 4),
                                _ReportButton(content: message, userQuery: widget.userQuery),
                              ],
                            ),
                          ),
                        ),

                      // Retry button in case of network error
                      if (widget.msg['hasError'] == true && widget.onRetry != null)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: InkWell(
                              onTap: widget.onRetry,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.redAccent.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.redAccent.withOpacity(0.35)),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.refresh_rounded, size: 14, color: Colors.redAccent),
                                    SizedBox(width: 6),
                                    Text(
                                      'إعادة المحاولة',
                                      style: TextStyle(
                                        color: Colors.redAccent,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CopyButton extends StatefulWidget {
  final String text;
  const _CopyButton({required this.text});

  @override
  State<_CopyButton> createState() => _CopyButtonState();
}

class _CopyButtonState extends State<_CopyButton> {
  bool _copied = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        HapticFeedback.selectionClick();
        await Clipboard.setData(ClipboardData(text: widget.text));
        setState(() => _copied = true);
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) setState(() => _copied = false);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color:        _copied ? primaryOlive.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border:       Border.all(color: _copied ? primaryOlive.withValues(alpha: 0.3) : borderSubtle),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_copied ? Icons.check_rounded : Icons.copy_rounded, size: 12, color: _copied ? primaryOlive : textMuted),
            const SizedBox(width: 5),
            Text(
              _copied ? 'تم النسخ' : 'نسخ',
              style: TextStyle(color: _copied ? primaryOlive : textMuted, fontSize: 11, fontFamily: 'Cairo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReportButton extends StatefulWidget {
  final String content;
  final String? userQuery;
  const _ReportButton({required this.content, this.userQuery});

  @override
  State<_ReportButton> createState() => _ReportButtonState();
}

class _ReportButtonState extends State<_ReportButton> {
  bool _reported = false;

  Future<void> _showReportDialog() async {
    final reasonCtrl = TextEditingController();
    bool submitting = false;
    bool done = false;

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            backgroundColor: bgCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            title: Row(
              children: [
                const Icon(Icons.flag_rounded, color: Colors.redAccent, size: 20),
                const SizedBox(width: 8),
                Text('الإبلاغ عن الرد', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15, color: textPrimary)),
              ],
            ),
            content: done
                ? Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_rounded, color: primaryOlive, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text('تم إرسال بلاغك بنجاح، شكراً لك.', style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: textSecondary))),
                    ],
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('أخبرنا لماذا كانت هذه الإجابة غير مناسبة (اختياري):',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 12.5, color: textSecondary)),
                      const SizedBox(height: 10),
                      TextField(
                        controller: reasonCtrl,
                        maxLines: 3,
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: textPrimary),
                        decoration: const InputDecoration(hintText: 'اكتب السبب هنا...'),
                      ),
                    ],
                  ),
            actions: done
                ? [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: Text('حسناً', style: TextStyle(fontFamily: 'Cairo', color: primaryOlive)),
                    ),
                  ]
                : [
                    TextButton(
                      onPressed: submitting ? null : () => Navigator.pop(context),
                      child: Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: textMuted)),
                    ),
                    TextButton(
                      onPressed: submitting
                          ? null
                          : () async {
                              setDialogState(() => submitting = true);
                              try {
                                final prefs = await SharedPreferences.getInstance();
                                final userId = prefs.getString('auth_token');
                                final deviceId = prefs.getString('device_id');
                                await Supabase.instance.client.from('reports').insert({
                                  'user_id': userId,
                                  'device_id': userId == null ? deviceId : null,
                                  'reported_content': widget.content,
                                  'user_query': widget.userQuery,
                                  'reason': reasonCtrl.text.trim().isNotEmpty ? reasonCtrl.text.trim() : 'لم يحدد الطالب سبباً',
                                  'status': 'pending',
                                  'created_at': DateTime.now().toIso8601String(),
                                });
                                setDialogState(() { submitting = false; done = true; });
                                if (mounted) setState(() => _reported = true);
                              } catch (e) {
                                setDialogState(() => submitting = false);
                              }
                            },
                      child: submitting
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: primaryOlive))
                          : Text('إرسال', style: TextStyle(fontFamily: 'Cairo', color: Colors.redAccent, fontWeight: FontWeight.bold)),
                    ),
                  ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _reported ? null : _showReportDialog,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: borderSubtle),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_reported ? Icons.flag_rounded : Icons.flag_outlined, size: 12, color: _reported ? Colors.redAccent : textMuted),
            const SizedBox(width: 5),
            Text(
              _reported ? 'تم الإبلاغ' : 'إبلاغ',
              style: TextStyle(color: _reported ? Colors.redAccent : textMuted, fontSize: 11, fontFamily: 'Cairo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThinkingDots extends StatefulWidget {
  const _ThinkingDots();

  @override
  State<_ThinkingDots> createState() => _ThinkingDotsState();
}

class _ThinkingDotsState extends State<_ThinkingDots> with TickerProviderStateMixin {
  late List<AnimationController> _ctrls;
  late List<Animation<double>>   _anims;

  @override
  void initState() {
    super.initState();
    _ctrls = List.generate(3, (_) => AnimationController(vsync: this, duration: const Duration(milliseconds: 500)));
    _anims = _ctrls.map((c) => Tween<double>(begin: 0, end: -7).animate(CurvedAnimation(parent: c, curve: Curves.easeInOut))).toList();
    _startLoop();
  }

  void _startLoop() async {
    for (int i = 0; i < 3; i++) {
      await Future.delayed(const Duration(milliseconds: 140));
      if (mounted) _ctrls[i].repeat(reverse: true);
    }
  }

  @override
  void dispose() { for (var c in _ctrls) { c.dispose(); } super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (i) => AnimatedBuilder(
        animation: _anims[i],
        builder: (_, child) => Transform.translate(offset: Offset(0, _anims[i].value), child: child),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: 7, height: 7,
          decoration: const BoxDecoration(color: primaryOlive, shape: BoxShape.circle),
        ),
      )),
    );
  }
}

class SearchStepsPanel extends StatefulWidget {
  final List<dynamic> steps;
  final bool isSearching;

  const SearchStepsPanel({
    super.key,
    required this.steps,
    required this.isSearching,
  });

  @override
  State<SearchStepsPanel> createState() => _SearchStepsPanelState();
}

class _SearchStepsPanelState extends State<SearchStepsPanel> {
  bool _collapsed = false;

  @override
  Widget build(BuildContext context) {
    final allSteps = widget.steps;
    final currentlySearching = widget.isSearching && (allSteps.isEmpty || allSteps.last['step'] != 'found');

    if (allSteps.isEmpty && !currentlySearching) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final isDarkMode = theme.brightness == Brightness.dark;

    final bg = isDarkMode ? Colors.black.withOpacity(0.2) : Colors.grey.withOpacity(0.08);
    final border = isDarkMode ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(14),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          GestureDetector(
            onTap: allSteps.isNotEmpty
                ? () => setState(() => _collapsed = !_collapsed)
                : null,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      currentlySearching && allSteps.isEmpty ? '⏳' : '🔍',
                      style: const TextStyle(fontSize: 14),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      currentlySearching && allSteps.isEmpty
                          ? 'جاري البحث في المنهج...'
                          : 'خطوات البحث الذكي',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: primaryOlive,
                        fontSize: 12.5,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ],
                ),
                if (allSteps.isNotEmpty)
                  Text(
                    _collapsed ? '▼ عرض' : '▲ إخفاء',
                    style: const TextStyle(
                      color: Colors.grey,
                      fontSize: 11,
                      fontFamily: 'Cairo',
                    ),
                  ),
              ],
            ),
          ),
          if (!_collapsed && allSteps.isNotEmpty) ...[
            const SizedBox(height: 8),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: allSteps.length,
              itemBuilder: (context, idx) {
                final step = allSteps[idx] as Map<dynamic, dynamic>;
                final stepIcon = step['icon'] ?? '🔍';
                final stepMessage = step['message'] ?? '';
                final isLast = idx == allSteps.length - 1;
                final showPulse = isLast && currentlySearching;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Text(
                        stepIcon,
                        style: const TextStyle(fontSize: 14),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          stepMessage,
                          style: TextStyle(
                            color: showPulse ? primaryOlive : (isDarkMode ? Colors.white70 : Colors.black87),
                            fontWeight: showPulse ? FontWeight.bold : FontWeight.normal,
                            fontSize: 12,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ),
                      if (showPulse) ...[
                        const SizedBox(width: 8),
                        const SizedBox(
                          width: 8,
                          height: 8,
                          child: CircularProgressIndicator(
                            strokeWidth: 1.5,
                            valueColor: AlwaysStoppedAnimation<Color>(primaryOlive),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// THOUGHT PROCESS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════
class ThoughtProcessWidget extends StatefulWidget {
  final String thought;
  final int    duration;
  final bool   isThinking;

  const ThoughtProcessWidget({
    super.key,
    required this.thought,
    required this.duration,
    required this.isThinking,
  });

  @override
  State<ThoughtProcessWidget> createState() => _ThoughtProcessWidgetState();
}

class _ThoughtProcessWidgetState extends State<ThoughtProcessWidget> with SingleTickerProviderStateMixin {
  late bool                _expanded;
  late AnimationController _spinCtrl;
  late Animation<double>   _spinAnim;

  @override
  void initState() {
    super.initState();
    _expanded = widget.isThinking;
    _spinCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 3));
    _spinAnim = CurvedAnimation(parent: _spinCtrl, curve: Curves.linear);
    if (widget.isThinking) _spinCtrl.repeat();
  }

  @override
  void didUpdateWidget(covariant ThoughtProcessWidget old) {
    super.didUpdateWidget(old);
    if (widget.isThinking && !_spinCtrl.isAnimating) _spinCtrl.repeat();
    if (!widget.isThinking && _spinCtrl.isAnimating)  _spinCtrl.stop();
    if (widget.isThinking) _expanded = true;
  }

  @override
  void dispose() { _spinCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (widget.thought.isEmpty && !widget.isThinking) return const SizedBox.shrink();

    final label = widget.isThinking
        ? 'يجري التفكير... (${widget.duration} ث)'
        : 'تم التفكير خلال ${widget.duration > 0 ? widget.duration : 1} ثانية ✓';

    return Container(
      decoration: BoxDecoration(
        color:        primaryOlive.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: primaryOlive.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  RotationTransition(
                    turns: _spinAnim,
                    child: const Text('⚛', style: TextStyle(color: primaryOlive, fontSize: 16)),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(label, style: const TextStyle(color: primaryOlive, fontSize: 12.5, fontWeight: FontWeight.w600, fontFamily: 'Cairo')),
                  ),
                  Icon(_expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded, color: primaryOlive, size: 18),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            child: _expanded && widget.thought.isNotEmpty
                ? Container(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    child: Text(
                      widget.thought,
                      style: TextStyle(
                        color:     textSecondary,
                        fontSize:  12,
                        fontStyle: FontStyle.italic,
                        height:    1.6,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE EDITOR (crop + freehand markup before upload)
// ═══════════════════════════════════════════════════════════════════════════════
class ImageEditResult {
  final Uint8List bytes;
  final String mimeType;
  const ImageEditResult(this.bytes, this.mimeType);
}

class _MarkupStroke {
  final Color color;
  final List<Offset> points; // in image pixel coordinates
  const _MarkupStroke(this.color, this.points);
}

class ImageEditorScreen extends StatefulWidget {
  final Uint8List imageBytes;
  final String originalMimeType;

  const ImageEditorScreen({super.key, required this.imageBytes, required this.originalMimeType});

  @override
  State<ImageEditorScreen> createState() => _ImageEditorScreenState();
}

class _ImageEditorScreenState extends State<ImageEditorScreen> {
  static const List<Color> _brushColors = [
    primaryOlive,
    accentOlive,
    secondaryBeige,
    Colors.redAccent,
    Colors.amber,
    Colors.white,
    Colors.black,
  ];

  ui.Image? _image;
  bool _cropTool = false;
  Color _brushColor = primaryOlive;
  final List<_MarkupStroke> _strokes = [];
  Rect? _cropRect; // in image pixel coordinates
  Offset? _cropStart;
  bool _exporting = false;

  @override
  void initState() {
    super.initState();
    _decodeImage();
  }

  Future<void> _decodeImage() async {
    final codec = await ui.instantiateImageCodec(widget.imageBytes);
    final frame = await codec.getNextFrame();
    if (mounted) setState(() => _image = frame.image);
  }

  @override
  void dispose() {
    _image?.dispose();
    super.dispose();
  }

  Offset? _toImageCoords(Offset local, Size paintSize) {
    final img = _image;
    if (img == null) return null;
    final scale = min(paintSize.width / img.width, paintSize.height / img.height);
    final drawW = img.width * scale;
    final drawH = img.height * scale;
    final dx = (paintSize.width - drawW) / 2;
    final dy = (paintSize.height - drawH) / 2;
    final x = ((local.dx - dx) / scale).clamp(0.0, img.width.toDouble());
    final y = ((local.dy - dy) / scale).clamp(0.0, img.height.toDouble());
    return Offset(x, y);
  }

  void _onPanStart(Offset local, Size paintSize) {
    final pt = _toImageCoords(local, paintSize);
    if (pt == null) return;
    setState(() {
      if (_cropTool) {
        _cropStart = pt;
        _cropRect = Rect.fromPoints(pt, pt);
      } else {
        _strokes.add(_MarkupStroke(_brushColor, [pt]));
      }
    });
  }

  void _onPanUpdate(Offset local, Size paintSize) {
    final pt = _toImageCoords(local, paintSize);
    if (pt == null) return;
    setState(() {
      if (_cropTool && _cropStart != null) {
        _cropRect = Rect.fromPoints(_cropStart!, pt);
      } else if (!_cropTool && _strokes.isNotEmpty) {
        _strokes.last.points.add(pt);
      }
    });
  }

  void _onPanEnd() {
    setState(() {
      _cropStart = null;
      if (_cropRect != null && (_cropRect!.width < 10 || _cropRect!.height < 10)) {
        _cropRect = null;
      }
    });
  }

  void _undo() {
    setState(() {
      if (_cropTool && _cropRect != null) {
        _cropRect = null;
      } else if (_strokes.isNotEmpty) {
        _strokes.removeLast();
      }
    });
  }

  Future<void> _export() async {
    final img = _image;
    if (img == null || _exporting) return;
    setState(() => _exporting = true);
    try {
      final region = _cropRect ?? Rect.fromLTWH(0, 0, img.width.toDouble(), img.height.toDouble());
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawImageRect(
        img,
        region,
        Rect.fromLTWH(0, 0, region.width, region.height),
        Paint(),
      );
      final strokePaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..strokeWidth = max(3.0, img.width / 250);
      for (final stroke in _strokes) {
        if (stroke.points.length < 2) continue;
        strokePaint.color = stroke.color;
        final path = Path()..moveTo(stroke.points.first.dx - region.left, stroke.points.first.dy - region.top);
        for (final p in stroke.points.skip(1)) {
          path.lineTo(p.dx - region.left, p.dy - region.top);
        }
        canvas.drawPath(path, strokePaint);
      }
      final picture = recorder.endRecording();
      final output = await picture.toImage(region.width.round(), region.height.round());
      final byteData = await output.toByteData(format: ui.ImageByteFormat.png);
      output.dispose();
      if (byteData == null) throw Exception('failed to encode image');
      if (!mounted) return;
      Navigator.pop(context, ImageEditResult(byteData.buffer.asUint8List(), 'image/png'));
    } catch (e) {
      if (mounted) {
        setState(() => _exporting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('فشل حفظ التعديلات على الصورة.', style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Widget _toolChip({required IconData icon, required String label, required bool active, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: active ? primaryOlive : bgElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? Colors.transparent : borderSubtle),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: active ? Colors.black : textSecondary),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: active ? Colors.black : textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgDeep,
        appBar: AppBar(
          backgroundColor: bgSurface,
          elevation: 0,
          title: Text(
            'تعديل الصورة قبل الإرسال',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.bold, color: textPrimary),
          ),
          leading: IconButton(
            icon: Icon(Icons.close_rounded, color: textSecondary),
            onPressed: () => Navigator.pop(context),
            tooltip: 'إلغاء',
          ),
        ),
        body: SafeArea(
          child: _image == null
              ? const Center(child: CircularProgressIndicator(color: primaryOlive))
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _toolChip(
                              icon: Icons.brush_rounded,
                              label: 'رسم',
                              active: !_cropTool,
                              onTap: () => setState(() => _cropTool = false),
                            ),
                            const SizedBox(width: 8),
                            _toolChip(
                              icon: Icons.crop_rounded,
                              label: 'قص',
                              active: _cropTool,
                              onTap: () => setState(() => _cropTool = true),
                            ),
                            const SizedBox(width: 8),
                            _toolChip(
                              icon: Icons.undo_rounded,
                              label: 'تراجع',
                              active: false,
                              onTap: _undo,
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (!_cropTool)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Wrap(
                          spacing: 8,
                          children: _brushColors.map((c) {
                            final selected = _brushColor == c;
                            return GestureDetector(
                              onTap: () => setState(() => _brushColor = c),
                              child: Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: c,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: selected ? textPrimary : borderSubtle,
                                    width: selected ? 2.5 : 1,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            final paintSize = Size(constraints.maxWidth, constraints.maxHeight);
                            return GestureDetector(
                              onPanStart: (d) => _onPanStart(d.localPosition, paintSize),
                              onPanUpdate: (d) => _onPanUpdate(d.localPosition, paintSize),
                              onPanEnd: (_) => _onPanEnd(),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: CustomPaint(
                                  size: paintSize,
                                  painter: _ImageEditorPainter(
                                    image: _image!,
                                    strokes: _strokes,
                                    cropRect: _cropRect,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: _GradientButton(
                              label: 'تأكيد',
                              icon: Icons.check_rounded,
                              loading: _exporting,
                              onTap: _exporting ? null : _export,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: GestureDetector(
                              onTap: _exporting
                                  ? null
                                  : () => Navigator.pop(
                                        context,
                                        ImageEditResult(widget.imageBytes, widget.originalMimeType),
                                      ),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 13),
                                decoration: BoxDecoration(
                                  color: bgElevated,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: borderSubtle),
                                ),
                                child: Text(
                                  'استخدام بدون تعديل',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: textPrimary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _ImageEditorPainter extends CustomPainter {
  final ui.Image image;
  final List<_MarkupStroke> strokes;
  final Rect? cropRect;

  _ImageEditorPainter({required this.image, required this.strokes, required this.cropRect});

  @override
  void paint(Canvas canvas, Size size) {
    final scale = min(size.width / image.width, size.height / image.height);
    final drawW = image.width * scale;
    final drawH = image.height * scale;
    final dx = (size.width - drawW) / 2;
    final dy = (size.height - drawH) / 2;
    final dst = Rect.fromLTWH(dx, dy, drawW, drawH);
    canvas.drawImageRect(
      image,
      Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble()),
      dst,
      Paint(),
    );

    final strokePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = max(2.5, image.width * scale / 250);
    for (final stroke in strokes) {
      if (stroke.points.length < 2) continue;
      strokePaint.color = stroke.color;
      final path = Path()
        ..moveTo(dx + stroke.points.first.dx * scale, dy + stroke.points.first.dy * scale);
      for (final p in stroke.points.skip(1)) {
        path.lineTo(dx + p.dx * scale, dy + p.dy * scale);
      }
      canvas.drawPath(path, strokePaint);
    }

    if (cropRect != null) {
      final r = Rect.fromLTWH(
        dx + cropRect!.left * scale,
        dy + cropRect!.top * scale,
        cropRect!.width * scale,
        cropRect!.height * scale,
      );
      final overlay = Paint()..color = Colors.black.withValues(alpha: 0.55);
      canvas.saveLayer(dst, Paint());
      canvas.drawRect(dst, overlay);
      canvas.drawRect(r, Paint()..blendMode = BlendMode.clear);
      canvas.restore();
      canvas.drawRect(
        r,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = primaryOlive,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ImageEditorPainter oldDelegate) => true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM INPUT BAR
// ═══════════════════════════════════════════════════════════════════════════════
class _PremiumInputBar extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode             focusNode;
  final bool                  hasText;
  final bool                  isLoading;
  final VoidCallback          onSend;
  final bool                  enabled;
  final String                hintText;
  final String                selectedModel;
  final bool                  thinkingEnabled;
  final String                chatMode;
  final ValueChanged<String>  onModelChanged;
  final ValueChanged<bool>    onThinkingChanged;
  final ValueChanged<String>  onModeChanged;
  final String                userPlan;
  final String                websiteLink;

  const _PremiumInputBar({
    required this.controller,
    required this.focusNode,
    required this.hasText,
    required this.isLoading,
    required this.onSend,
    required this.enabled,
    required this.hintText,
    required this.selectedModel,
    required this.thinkingEnabled,
    required this.chatMode,
    required this.onModelChanged,
    required this.onThinkingChanged,
    required this.onModeChanged,
    required this.userPlan,
    required this.websiteLink,
  });

  @override
  State<_PremiumInputBar> createState() => _PremiumInputBarState();
}

class _PremiumInputBarState extends State<_PremiumInputBar> {
  String? _pendingImageBase64;
  String? _pendingImageMimeType;
  String? _pendingImageDescription;
  bool _isDescribingImage = false;

  Future<void> _pickImage() async {
    if (widget.isLoading || _isDescribingImage) return;

    try {
      final FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        withData: true,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      Uint8List? bytes = file.bytes;
      if (bytes == null && file.path != null) {
        bytes = await File(file.path!).readAsBytes();
      }

      if (bytes == null) {
        _showError('تعذر قراءة ملف الصورة.');
        return;
      }

      if (bytes.lengthInBytes > 5 * 1024 * 1024) {
        _showError('حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت.');
        return;
      }

      // Open the crop/markup editor before uploading
      if (!mounted) return;
      final ImageEditResult? edited = await Navigator.push<ImageEditResult>(
        context,
        MaterialPageRoute(
          builder: (_) => ImageEditorScreen(
            imageBytes: bytes!,
            originalMimeType: _getMimeType(file.extension ?? 'jpg'),
          ),
        ),
      );
      if (edited == null) return;
      if (edited.bytes.lengthInBytes > 5 * 1024 * 1024) {
        _showError('حجم الصورة بعد التعديل كبير جداً. الحد الأقصى هو 5 ميجابايت.');
        return;
      }

      final base64String = base64Encode(edited.bytes);
      final mimeType = edited.mimeType;

      setState(() {
        _isDescribingImage = true;
        _pendingImageBase64 = base64String;
        _pendingImageMimeType = mimeType;
        _pendingImageDescription = null;
      });

      final cleanLink = widget.websiteLink.trim().replaceAll(RegExp(r'/$'), '');
      final url = Uri.parse('$cleanLink/api/chat/upload-image');

      final prefs = await SharedPreferences.getInstance();
      final authToken = prefs.getString('auth_token');

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (authToken != null && authToken.isNotEmpty) 'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'base64': base64String,
          'mimeType': mimeType,
        }),
      );

      if (response.statusCode != 200) {
        final errBody = jsonDecode(response.body);
        throw Exception(errBody['error'] ?? 'فشل الاتصال بمزود الخدمة.');
      }

      final data = jsonDecode(response.body);
      setState(() {
        _pendingImageDescription = data['description'];
      });
    } catch (e) {
      debugPrint('Error picking/uploading image: $e');
      _showError('حدث خطأ أثناء قراءة وتفصيل الصورة: ${e.toString().replaceAll('Exception: ', '')}');
      setState(() {
        _pendingImageBase64 = null;
        _pendingImageMimeType = null;
        _pendingImageDescription = null;
      });
    } finally {
      setState(() {
        _isDescribingImage = false;
      });
    }
  }

  String _getMimeType(String ext) {
    switch (ext.toLowerCase()) {
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'bmp': return 'image/bmp';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontFamily: 'Cairo')),
        backgroundColor: Colors.redAccent,
      ),
    );
  }

  void _handleSend() {
    final text = widget.controller.text.trim();
    if (text.isEmpty && _pendingImageBase64 == null) return;

    if (_pendingImageBase64 != null) {
      final desc = _pendingImageDescription ?? '';
      widget.controller.text = '[IMAGE_MESSAGE:$_pendingImageMimeType;$_pendingImageBase64;${Uri.encodeComponent(desc)}]$text';
      setState(() {
        _pendingImageBase64 = null;
        _pendingImageMimeType = null;
        _pendingImageDescription = null;
      });
    }
    widget.onSend();
  }

  @override
  Widget build(BuildContext context) {
    // Beta: Pro model + Thinking are locked only for guests (unlocked for all registered users).
    final bool isFreePlan = widget.userPlan == 'guest';

    return Container(
      decoration: BoxDecoration(
        color: bgCard.withValues(alpha: 0.9),
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.05))),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
          decoration: BoxDecoration(
            color: bgInput,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: borderSubtle, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 8,
                offset: const Offset(0, 3),
              )
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_pendingImageBase64 != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: primaryOlive.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: primaryOlive.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: Image.memory(
                                  base64Decode(_pendingImageBase64!),
                                  width: 32,
                                  height: 32,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      _isDescribingImage ? 'جاري قراءة وتفصيل الصورة...' : 'تم إرفاق الصورة بنجاح',
                                      style: const TextStyle(
                                        color: primaryOlive,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                    if (_isDescribingImage)
                                      const SizedBox(
                                        height: 10,
                                        width: 10,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 1.5,
                                          valueColor: AlwaysStoppedAnimation<Color>(primaryOlive),
                                        ),
                                      )
                                    else if (_pendingImageDescription != null)
                                      Text(
                                        _pendingImageDescription!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: textSecondary,
                                          fontSize: 10,
                                          fontFamily: 'Cairo',
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _isDescribingImage ? null : () {
                            setState(() {
                              _pendingImageBase64 = null;
                              _pendingImageMimeType = null;
                              _pendingImageDescription = null;
                            });
                          },
                          child: Opacity(
                            opacity: _isDescribingImage ? 0.4 : 1.0,
                            child: Icon(Icons.close_rounded, color: textSecondary, size: 16),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              TextField(
                controller: widget.controller,
                focusNode: widget.focusNode,
                enabled: widget.enabled,
                maxLines: 5,
                minLines: 1,
                textInputAction: TextInputAction.newline,
                style: TextStyle(fontSize: 14, color: textPrimary, fontFamily: 'Cairo', height: 1.4),
                decoration: InputDecoration(
                  hintText: widget.hintText,
                  hintStyle: TextStyle(color: textMuted, fontSize: 13, fontFamily: 'Cairo'),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  filled: false,
                ),
              ),
              const SizedBox(height: 8),
              LayoutBuilder(
                builder: (context, constraints) => SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minWidth: constraints.maxWidth),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            PopupMenuButton<String>(
                              color: bgCard,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: BorderSide(color: borderSubtle),
                              ),
                              offset: const Offset(0, -110),
                              onSelected: (value) {
                                widget.onModelChanged(value);
                              },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'flash',
                        child: Row(
                          children: [
                            const Icon(Icons.flash_on_rounded, color: primaryOlive, size: 16),
                            const SizedBox(width: 8),
                            Text('سريع (Flash)', style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: textPrimary)),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: isFreePlan ? 'lock_upgrade' : 'pro',
                        child: Row(
                          children: [
                            const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                            const SizedBox(width: 8),
                            Text('محترف (Pro)', style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: textPrimary)),
                            if (isFreePlan) ...[
                              const Spacer(),
                              Icon(Icons.lock_outline_rounded, color: textMuted, size: 14),
                            ]
                          ],
                        ),
                      ),
                    ],
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: bgElevated,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: borderSubtle),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            widget.selectedModel == 'pro' ? Icons.star_rounded : Icons.flash_on_rounded,
                            color: widget.selectedModel == 'pro' ? Colors.amber : primaryOlive,
                            size: 13,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            widget.selectedModel == 'pro' ? 'Pro' : 'Fast',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 11.5,
                              fontWeight: FontWeight.bold,
                              color: textPrimary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.keyboard_arrow_down_rounded, color: textSecondary, size: 13),
                        ],
                      ),
                    ),
                  ),
                            const SizedBox(width: 8),
                            // Interaction mode selector (socratic / detailed / summary)
                            PopupMenuButton<String>(
                              color: bgCard,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: BorderSide(color: borderSubtle),
                              ),
                              offset: const Offset(0, -150),
                              onSelected: widget.onModeChanged,
                              itemBuilder: (context) => [
                                PopupMenuItem(
                                  value: 'socratic',
                                  child: Row(
                                    children: [
                                      const Icon(Icons.help_outline_rounded, color: primaryOlive, size: 16),
                                      const SizedBox(width: 8),
                                      Text('سقراطي', style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: textPrimary)),
                                    ],
                                  ),
                                ),
                                PopupMenuItem(
                                  value: 'detailed',
                                  child: Row(
                                    children: [
                                      const Icon(Icons.school_rounded, color: primaryOlive, size: 16),
                                      const SizedBox(width: 8),
                                      Text('شرح مفصل', style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: textPrimary)),
                                    ],
                                  ),
                                ),
                                PopupMenuItem(
                                  value: 'summary',
                                  child: Row(
                                    children: [
                                      const Icon(Icons.checklist_rounded, color: primaryOlive, size: 16),
                                      const SizedBox(width: 8),
                                      Text('ملخص', style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: textPrimary)),
                                    ],
                                  ),
                                ),
                              ],
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: widget.chatMode != 'detailed' ? primaryOlive : bgElevated,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: widget.chatMode != 'detailed' ? Colors.transparent : borderSubtle),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      widget.chatMode == 'socratic'
                                          ? Icons.help_outline_rounded
                                          : widget.chatMode == 'summary'
                                              ? Icons.checklist_rounded
                                              : Icons.school_rounded,
                                      color: widget.chatMode != 'detailed' ? Colors.black : textSecondary,
                                      size: 13,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      widget.chatMode == 'socratic'
                                          ? 'سقراطي'
                                          : widget.chatMode == 'summary'
                                              ? 'ملخص'
                                              : 'شرح',
                                      style: TextStyle(
                                        fontFamily: 'Cairo',
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: widget.chatMode != 'detailed' ? Colors.black : textSecondary,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Icon(Icons.keyboard_arrow_down_rounded, color: widget.chatMode != 'detailed' ? Colors.black : textSecondary, size: 13),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 8),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Photo Upload Button
                      GestureDetector(
                        onTap: (_isDescribingImage || widget.isLoading) ? null : _pickImage,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: _pendingImageBase64 != null ? primaryOlive : bgElevated,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: _pendingImageBase64 != null ? Colors.transparent : borderSubtle),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _isDescribingImage 
                                    ? Icons.hourglass_empty_rounded 
                                    : Icons.image_rounded, 
                                color: _pendingImageBase64 != null ? Colors.black : textSecondary, 
                                size: 14
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'صورة',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: _pendingImageBase64 != null ? Colors.black : textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Thinking Toggle Button
                      GestureDetector(
                        onTap: () {
                          if (isFreePlan) {
                            widget.onThinkingChanged(false);
                          } else {
                            widget.onThinkingChanged(!widget.thinkingEnabled);
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: widget.thinkingEnabled ? primaryOlive : bgElevated,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: widget.thinkingEnabled ? Colors.transparent : borderSubtle),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.psychology_rounded,
                                color: widget.thinkingEnabled ? Colors.black : textSecondary,
                                size: 14,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'تفكير',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: widget.thinkingEnabled ? Colors.black : textSecondary,
                                ),
                              ),
                              if (isFreePlan) ...[
                                const SizedBox(width: 4),
                                Icon(Icons.lock_outline_rounded, color: widget.thinkingEnabled ? Colors.black : textMuted, size: 10),
                              ]
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _AnimatedSendButton(hasText: widget.hasText || _pendingImageBase64 != null, isLoading: widget.isLoading, onSend: _handleSend),
                    ],
                  ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'EGS AI ذكاء اصطناعي وقد يرتكب أخطاءً — تحقق دائماً من المناهج والكتب المدرسية الرسمية.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10.5, color: textMuted, fontFamily: 'Cairo', height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnimatedSendButton extends StatefulWidget {
  final bool         hasText;
  final bool         isLoading;
  final VoidCallback onSend;

  const _AnimatedSendButton({required this.hasText, required this.isLoading, required this.onSend});

  @override
  State<_AnimatedSendButton> createState() => _AnimatedSendButtonState();
}

class _AnimatedSendButtonState extends State<_AnimatedSendButton> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double>   _scale;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _ctrl  = AnimationController(vsync: this, duration: const Duration(milliseconds: 150));
    _scale = Tween<double>(begin: 1.0, end: 0.88).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final active = widget.hasText && !widget.isLoading;

    return GestureDetector(
      onTapDown:  active ? (_) { _ctrl.forward(); setState(() => _pressed = true); } : null,
      onTapUp:    active ? (_) { _ctrl.reverse(); setState(() => _pressed = false); widget.onSend(); } : null,
      onTapCancel: active ? () { _ctrl.reverse(); setState(() => _pressed = false); } : null,
      child: ScaleTransition(
        scale: _scale,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          width: 36, height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: active ? olivGradient : null,
            color:    active ? null : bgElevated,
            border:   Border.all(color: active ? Colors.transparent : borderSubtle),
            boxShadow: active
                ? [BoxShadow(color: primaryOlive.withValues(alpha: _pressed ? 0.6 : 0.4), blurRadius: _pressed ? 12 : 8, spreadRadius: 1, offset: const Offset(0, 2))]
                : [],
          ),
          child: widget.isLoading
              ? const Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
              : Icon(Icons.arrow_upward_rounded, color: active ? Colors.black : textMuted, size: 18),
        ),
      ),
    );
  }
}

// ─── Thinking badge shown above input ─────────────────────────────────────────
class _ThinkingBadge extends StatefulWidget {
  @override
  State<_ThinkingBadge> createState() => _ThinkingBadgeState();
}

class _ThinkingBadgeState extends State<_ThinkingBadge> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double>   _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))..repeat(reverse: true);
    _fade = Tween<double>(begin: 0.5, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: Container(
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color:        primaryOlive.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border:       Border.all(color: primaryOlive.withValues(alpha: 0.2)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('⚛', style: TextStyle(fontSize: 14, color: primaryOlive)),
            SizedBox(width: 8),
            Text('EGS AI يفكر ويبحث في المنهج...', style: TextStyle(color: primaryOlive, fontSize: 12, fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN FORMATTER
// ═══════════════════════════════════════════════════════════════════════════════
class MarkdownFormatterWidget extends StatelessWidget {
  final String text;
  final Function(String)? onAnswerSubmit;
  final Function(Map<String, dynamic>)? onGoToExams;
  final String websiteLink;

  const MarkdownFormatterWidget({
    super.key,
    required this.text,
    this.onAnswerSubmit,
    this.onGoToExams,
    this.websiteLink = '',
  });

  @override
  Widget build(BuildContext context) {
    final quizRegex = RegExp(r'\[QUIZ_QUESTION\]([\s\S]*?)\[/QUIZ_QUESTION\]');
    final examRegex = RegExp(r'\[CREATE_EXAM\]([\s\S]*?)\[/CREATE_EXAM\]');
    final flashcardsRegex = RegExp(r'\[CREATE_FLASHCARDS\]([\s\S]*?)\[/CREATE_FLASHCARDS\]');

    String cleanText = text;
    Map<String, dynamic>? quizData;
    Map<String, dynamic>? examData;
    Map<String, dynamic>? flashcardsData;

    final quizMatch = quizRegex.firstMatch(text);
    if (quizMatch != null) {
      cleanText = cleanText.replaceFirst(quizMatch.group(0)!, '');
      try {
        quizData = jsonDecode(quizMatch.group(1)!.trim());
      } catch (e) {
        debugPrint("Quiz JSON parse error: $e");
      }
    }

    final examMatch = examRegex.firstMatch(text);
    if (examMatch != null) {
      cleanText = cleanText.replaceFirst(examMatch.group(0)!, '');
      try {
        examData = jsonDecode(examMatch.group(1)!.trim());
      } catch (e) {
        debugPrint("Exam JSON parse error: $e");
      }
    }

    final flashcardsMatch = flashcardsRegex.firstMatch(text);
    if (flashcardsMatch != null) {
      cleanText = cleanText.replaceFirst(flashcardsMatch.group(0)!, '');
      try {
        flashcardsData = jsonDecode(flashcardsMatch.group(1)!.trim());
      } catch (e) {
        debugPrint("Flashcards JSON parse error: $e");
      }
    }

    final lines   = cleanText.split('\n');
    final widgets = <Widget>[];
    int i         = 0;

    while (i < lines.length) {
      final line    = lines[i];
      final trimmed = line.trim();

      if (trimmed.isEmpty) { widgets.add(const SizedBox(height: 6)); i++; continue; }

      // Code blocks (and AI-generated SVG diagrams tagged ```svg)
      if (trimmed.startsWith('```')) {
        final lang = trimmed.replaceAll('```', '').trim().toLowerCase();
        final codeLines = <String>[];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.add(lines[i]); i++; }
        i++;
        if (lang == 'svg') {
          widgets.add(_SvgDiagram(svgContent: codeLines.join('\n')));
        } else {
          widgets.add(_CodeBlock(code: codeLines.join('\n')));
        }
        continue;
      }

      // Block math
      if (trimmed.startsWith(r'$$') && trimmed.endsWith(r'$$') && trimmed.length > 4) {
        widgets.add(_buildBlockMath(trimmed.substring(2, trimmed.length - 2)));
        i++; continue;
      }
      if (trimmed.startsWith(r'$$')) {
        final mathLines = <String>[];
        i++;
        while (i < lines.length && !lines[i].trim().endsWith(r'$$')) { mathLines.add(lines[i]); i++; }
        if (i < lines.length) {
          final endLine = lines[i].trim();
          if (endLine != r'$$') mathLines.add(endLine.replaceAll(r'$$', ''));
          i++;
        }
        widgets.add(_buildBlockMath(mathLines.join('\n')));
        continue;
      }
      if (trimmed.startsWith(r'\[') && trimmed.endsWith(r'\]') && trimmed.length > 4) {
        widgets.add(_buildBlockMath(trimmed.substring(2, trimmed.length - 2)));
        i++; continue;
      }
      if (trimmed.startsWith(r'\[')) {
        final mathLines = <String>[];
        i++;
        while (i < lines.length && !lines[i].trim().endsWith(r'\]')) { mathLines.add(lines[i]); i++; }
        if (i < lines.length) {
          final endLine = lines[i].trim();
          if (endLine != r'\]') mathLines.add(endLine.replaceAll(r'\]', ''));
          i++;
        }
        widgets.add(_buildBlockMath(mathLines.join('\n')));
        continue;
      }

      // Tables
      if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
        final nextLine = lines[i + 1].trim();
        final isTable  = nextLine.replaceAll(RegExp(r'[\s\-\|:‌]'), '').isEmpty;
        if (isTable) {
          final headerRow = line;
          final rows      = <String>[];
          i += 2;
          while (i < lines.length && lines[i].trim().startsWith('|')) { rows.add(lines[i].trim()); i++; }
          widgets.add(_buildTable(headerRow, rows));
          continue;
        }
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 4),
          child: Text(trimmed.substring(4), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: primaryOlive, fontFamily: 'Cairo')),
        ));
      } else if (trimmed.startsWith('## ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 14, bottom: 6),
          child: Text(trimmed.substring(3), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryOlive, fontFamily: 'Cairo')),
        ));
      } else if (trimmed.startsWith('# ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 8),
          child: Text(trimmed.substring(2), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: primaryOlive, fontFamily: 'Cairo')),
        ));
      }
      // Bullets
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 7, left: 6),
                child: Icon(Icons.circle, size: 5, color: primaryOlive),
              ),
              Expanded(child: _renderSpanText(trimmed.substring(2))),
            ],
          ),
        ));
      }
      // Numbered items
      else if (RegExp(r'^\d+\.\s').hasMatch(trimmed)) {
        final match = RegExp(r'^(\d+)\.\s').firstMatch(trimmed);
        final numText = match?.group(1) ?? '1';
        final contentText = trimmed.substring(numText.length + 2);
        widgets.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 6),
                child: Text('$numText.', style: const TextStyle(fontWeight: FontWeight.bold, color: primaryOlive, fontSize: 13.5)),
              ),
              Expanded(child: _renderSpanText(contentText)),
            ],
          ),
        ));
      }
      // Horizontal rule
      else if (trimmed == '---' || trimmed == '***') {
        widgets.add(Divider(color: borderSubtle, height: 20, thickness: 1));
      }
      // Paragraph
      else {
        widgets.add(Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: _renderSpanText(trimmed)));
      }
      i++;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        ...widgets,
        if (quizData != null) ...[
          const SizedBox(height: 10),
          InteractiveQuizWidget(
            quiz: quizData,
            onAnswerSubmit: onAnswerSubmit,
          ),
        ],
        if (examData != null) ...[
          const SizedBox(height: 10),
          ExamInviteWidget(
            exam: examData,
            onGoToExams: onGoToExams,
          ),
        ],
        if (flashcardsData != null) ...[
          const SizedBox(height: 10),
          FlashcardsInviteWidget(
            flashcards: flashcardsData,
            websiteLink: websiteLink,
          ),
        ],
      ],
    );
  }

  Widget _buildTable(String headerRow, List<String> rows) {
    List<String> parseCells(String rowText) {
      final cells = rowText.split('|').map((c) => c.trim()).toList();
      if (cells.isNotEmpty && cells.first.isEmpty) cells.removeAt(0);
      if (cells.isNotEmpty && cells.last.isEmpty)  cells.removeLast();
      return cells;
    }
    final headers    = parseCells(headerRow);
    final parsedRows = rows.map((r) => parseCells(r)).toList();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color:        bgElevated,
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: primaryOlive.withValues(alpha: 0.15)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Table(
          border: TableBorder.symmetric(inside: BorderSide(color: borderSubtle)),
          defaultVerticalAlignment: TableCellVerticalAlignment.middle,
          children: [
            TableRow(
              decoration: const BoxDecoration(gradient: olivGradient),
              children: headers.map((h) => Padding(
                padding: const EdgeInsets.all(10),
                child: Center(child: Text(h, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12.5, fontFamily: 'Cairo'))),
              )).toList(),
            ),
            ...parsedRows.asMap().entries.map((entry) {
              final idx   = entry.key;
              final row   = entry.value;
              while (row.length < headers.length) { row.add(''); }
              return TableRow(
                decoration: BoxDecoration(color: idx % 2 == 0 ? bgElevated : bgCard),
                children: row.take(headers.length).map((cell) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Align(alignment: Alignment.centerRight, child: _renderSpanText(cell)),
                )).toList(),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildBlockMath(String formula) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color:        bgElevated,
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: primaryOlive.withValues(alpha: 0.2)),
      ),
      child: Center(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Math.tex(
            formula,
            mathStyle: MathStyle.display,
            textStyle: const TextStyle(fontSize: 16, color: primaryOlive),
            onErrorFallback: (err) => Text(
              formula,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: primaryOlive, fontFamily: 'monospace'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _renderSpanText(String lineText) {
    final spans = <InlineSpan>[];
    final regex = RegExp(r'(\\\([\s\S]*?\\\))|(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)|(\$[^\$\n]+\$)|(\*\*[^*]+\*\*)|(\`[^\`]+\`)');
    int start   = 0;

    for (var match in regex.allMatches(lineText)) {
      if (match.start > start) {
        spans.add(TextSpan(text: lineText.substring(start, match.start), style: TextStyle(color: textPrimary)));
      }
      final value = match.group(0)!;
      if ((value.startsWith(r'\(') && value.endsWith(r'\)')) ||
          (value.startsWith(r'\[') && value.endsWith(r'\]')) ||
          (value.startsWith(r'$$') && value.endsWith(r'$$')) ||
          (value.startsWith(r'$') && value.endsWith(r'$'))) {
        final formula = value.startsWith(r'\(') || value.startsWith(r'\[')
            ? value.substring(2, value.length - 2)
            : (value.startsWith(r'$$') ? value.substring(2, value.length - 2) : value.substring(1, value.length - 1));
        spans.add(WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Math.tex(
            formula,
            mathStyle: MathStyle.text,
            textStyle: const TextStyle(fontSize: 14, color: primaryOlive),
            onErrorFallback: (err) => Text(
              formula,
              style: const TextStyle(fontWeight: FontWeight.bold, color: primaryOlive, fontFamily: 'monospace', fontSize: 13),
            ),
          ),
        ));
      } else if (value.startsWith('**') && value.endsWith('**')) {
        spans.add(TextSpan(text: value.substring(2, value.length - 2), style: TextStyle(fontWeight: FontWeight.bold, color: textPrimary)));
      } else if (value.startsWith('`') && value.endsWith('`')) {
        spans.add(TextSpan(
          text: value.substring(1, value.length - 1),
          style: const TextStyle(color: primaryOlive, backgroundColor: Color(0xFF242620), fontFamily: 'monospace', fontSize: 13),
        ));
      }
      start = match.end;
    }
    if (start < lineText.length) {
      spans.add(TextSpan(text: lineText.substring(start), style: TextStyle(color: textPrimary)));
    }
    return RichText(
      text: TextSpan(
        style: TextStyle(fontSize: 14, height: 1.6, fontFamily: 'Cairo', color: textPrimary),
        children: spans,
      ),
    );
  }
}

// Sanitizes AI-generated SVG before rendering: strips scripts, event-handler
// attributes, <foreignObject>, and external references — mirrors the
// DOMPurify-based sanitizer used on the web client.
final RegExp _onEventAttrPattern = RegExp(r'^on[a-z]+$');
const Set<String> _forbiddenSvgTags = {'script', 'foreignobject', 'style'};
const Set<String> _forbiddenSvgAttrs = {'href', 'xlink:href'};

String? sanitizeSvg(String raw) {
  try {
    final doc = XmlDocument.parse(raw);

    void clean(XmlElement el) {
      el.children
          .whereType<XmlElement>()
          .where((c) => _forbiddenSvgTags.contains(c.name.local.toLowerCase()))
          .toList()
          .forEach(el.children.remove);

      final attrsToRemove = el.attributes.where((a) {
        final name = a.name.qualified.toLowerCase();
        return _forbiddenSvgAttrs.contains(name) || _onEventAttrPattern.hasMatch(name);
      }).toList();
      for (final a in attrsToRemove) {
        el.removeAttribute(a.name.qualified);
      }

      for (final child in el.children.whereType<XmlElement>()) {
        clean(child);
      }
    }

    clean(doc.rootElement);
    if (doc.rootElement.name.local.toLowerCase() != 'svg') return null;
    return doc.toXmlString();
  } catch (e) {
    return null;
  }
}

class _SvgDiagram extends StatelessWidget {
  final String svgContent;
  const _SvgDiagram({required this.svgContent});

  @override
  Widget build(BuildContext context) {
    final sanitized = sanitizeSvg(svgContent);
    if (sanitized == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:        bgElevated,
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: borderSubtle),
      ),
      child: InteractiveViewer(
        minScale: 0.5,
        maxScale: 4,
        child: Center(
          child: SvgPicture.string(
            sanitized,
            placeholderBuilder: (context) => const SizedBox(
              height: 80,
              child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: primaryOlive)),
            ),
          ),
        ),
      ),
    );
  }
}

class _CodeBlock extends StatelessWidget {
  final String code;
  const _CodeBlock({required this.code});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color:        const Color(0xFF1A1D14),
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color:  bgElevated,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), topRight: Radius.circular(12)),
              border: Border(bottom: BorderSide(color: borderSubtle)),
            ),
            child: Row(
              children: [
                Icon(Icons.code_rounded, size: 14, color: textMuted),
                SizedBox(width: 6),
                Text('كود', style: TextStyle(fontSize: 11, color: textMuted, fontFamily: 'Cairo')),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              code,
              textDirection: TextDirection.ltr,
              style: const TextStyle(color: Color(0xFFD0D0C0), fontFamily: 'monospace', fontSize: 13, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SHEET
// ═══════════════════════════════════════════════════════════════════════════════
class AuthSheetWidget extends StatefulWidget {
  final ApiClient apiClient;
  final Function(String token, Map<String, dynamic> user) onSuccess;
  final List<String> activeGradeLevels;
  final String websiteLink;

  const AuthSheetWidget({
    super.key,
    required this.apiClient,
    required this.onSuccess,
    required this.activeGradeLevels,
    required this.websiteLink,
  });

  @override
  State<AuthSheetWidget> createState() => _AuthSheetWidgetState();
}

class _AuthSheetWidgetState extends State<AuthSheetWidget> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool   _otpStep    = false;
  bool   _isLoading  = false;
  String _error      = '';

  final _emailCtrl    = TextEditingController();
  final _passCtrl     = TextEditingController();
  final _nameCtrl     = TextEditingController();
  final _otpCtrl      = TextEditingController();
  bool  _obscurePass  = true;
  bool  _termsAccepted = false;
  String _selectedGrade = '3_high';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_handleTabChange);
    if (widget.activeGradeLevels.isNotEmpty) _selectedGrade = widget.activeGradeLevels.first;
  }

  void _handleTabChange() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _nameCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email    = _emailCtrl.text.trim();
    final password = _passCtrl.text.trim();
    final name     = _nameCtrl.text.trim();
    final otp      = _otpCtrl.text.trim();
    setState(() { _error = ''; _isLoading = true; });

    try {
      final isLogin  = _tabController.index == 0;
      final cleanLink = resolveWebsiteLink(widget.websiteLink);

      if (isLogin) {
        final res = await http.post(
          Uri.parse('$cleanLink/api/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': email,
            'password': password,
          }),
        );
        final data = parseJsonResponse(res);
        if (res.statusCode != 200) {
          throw Exception(data['error'] ?? 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
        widget.onSuccess(data['token'], data['user']);
      } else {
        if (!_otpStep) {
          if (!_termsAccepted) {
            throw Exception('يجب الموافقة على سياسة الخصوصية وشروط الاستخدام لإتمام التسجيل.');
          }
          final res = await http.post(
            Uri.parse('$cleanLink/api/auth/register'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email,
              'name': name,
              'grade_level': _selectedGrade,
              'password': password,
              'terms_accepted': true,
            }),
          );
          final data = parseJsonResponse(res);
          if (res.statusCode != 200) {
            throw Exception(data['error'] ?? 'فشل عملية التسجيل');
          }
          setState(() => _otpStep = true);
        } else {
          final prefs = await SharedPreferences.getInstance();
          final hasRegisteredBefore = prefs.getBool('egs_registered_before') ?? false;

          final res = await http.post(
            Uri.parse('$cleanLink/api/auth/otp'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email,
              'otp': otp,
              'has_registered_before': hasRegisteredBefore,
            }),
          );
          final data = parseJsonResponse(res);
          if (res.statusCode != 200) {
            throw Exception(data['error'] ?? 'رمز التحقق غير صحيح');
          }
          await prefs.setBool('egs_registered_before', true);
          widget.onSuccess(data['token'], data['user']);
        }
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _signInWithGoogle({String? selectedGrade}) async {
    setState(() { _error = ''; _isLoading = true; });
    try {
      final cleanLink = resolveWebsiteLink(widget.websiteLink);
      String? idToken;

      // Try actual Google Sign-In first
      try {
        final GoogleSignIn googleSignIn = GoogleSignIn(
          serverClientId: '868945795931-v00sqknb9qsgcq7hid3t2rkps2vu1348.apps.googleusercontent.com',
          clientId: '868945795931-6hp5uq0eb234pbd3nck1jvvbv4p76kht.apps.googleusercontent.com',
          scopes: ['email', 'profile'],
        );
        final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
        if (googleUser != null) {
          final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
          idToken = googleAuth.idToken;
        }
      } catch (err) {
        print("Google Sign-In plugin error: $err");
      }

      // If ID token is null, Google Sign-in was cancelled or failed
      if (idToken == null) {
        throw Exception('تم إلغاء تسجيل الدخول أو فشل الاتصال بحساب Google');
      }

      // Call API
      final res = await http.post(
        Uri.parse('$cleanLink/api/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'credential': idToken,
          'grade_level': selectedGrade,
        }),
      );

      final data = parseJsonResponse(res);
      if (res.statusCode != 200) {
        throw Exception(data['error'] ?? 'فشل تسجيل الدخول بواسطة Google');
      }

      if (data['requires_grade_level'] == true) {
        // Show grade level selection popup
        final String? grade = await showDialog<String>(
          context: context,
          builder: (context) {
            String tempGrade = widget.activeGradeLevels.isNotEmpty ? widget.activeGradeLevels.first : '3_high';
            return StatefulBuilder(
              builder: (context, setDialogState) {
                return AlertDialog(
                  title: const Text('اختر سنتك الدراسية', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('يرجى اختيار السنة الدراسية لإكمال إنشاء حسابك:', style: TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: tempGrade,
                        items: widget.activeGradeLevels.map((g) => DropdownMenuItem(
                          value: g,
                          child: Text(g == '3_high' ? 'الصف الثالث الثانوي' : g, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                        )).toList(),
                        onChanged: (val) {
                          if (val != null) setDialogState(() => tempGrade = val);
                        },
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
                    TextButton(
                      onPressed: () => Navigator.pop(context, tempGrade),
                      child: const Text('تأكيد'),
                    ),
                  ],
                );
              }
            );
          }
        );

        if (grade != null) {
          await _signInWithGoogle(selectedGrade: grade);
        }
      } else {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('egs_registered_before', true);
        widget.onSuccess(data['token'], data['user']);
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color:        bgCard.withValues(alpha: 0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border:       Border.all(color: Colors.white.withValues(alpha: 0.07)),
          ),
          padding: EdgeInsets.only(
            left: 22,
            right: 22,
            top:   28,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40, height: 4,
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(color: borderSubtle, borderRadius: BorderRadius.circular(2)),
                  ),
                ),

                // Logo
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient:     olivGradient,
                      shape:        BoxShape.circle,
                      boxShadow:    [BoxShadow(color: primaryOlive.withValues(alpha: 0.4), blurRadius: 16, spreadRadius: 2)],
                    ),
                    child: ClipOval(
                      child: Image.asset(
                        'assets/logo.png',
                        width: 30,
                        height: 30,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Center(
                  child: Text(
                    'EGS AI',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: primaryOlive, fontFamily: 'Cairo'),
                  ),
                ),
                const SizedBox(height: 4),
                Center(
                  child: Text('سجّل دخولك للاستمتاع بتجربة تعلم لا محدودة',
                      style: TextStyle(fontSize: 12, color: textSecondary, fontFamily: 'Cairo')),
                ),
                const SizedBox(height: 24),

                // Tab selector
                if (!_otpStep)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color:        bgElevated,
                      borderRadius: BorderRadius.circular(14),
                      border:       Border.all(color: borderSubtle),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        gradient:     olivGradient,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow:    [BoxShadow(color: primaryOlive.withValues(alpha: 0.3), blurRadius: 8)],
                      ),
                      labelStyle:        const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo', fontSize: 13),
                      unselectedLabelStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
                      labelColor:        Colors.black,
                      unselectedLabelColor: textSecondary,
                      dividerColor:      Colors.transparent,
                      tabs: const [
                        Tab(text: 'تسجيل الدخول'),
                        Tab(text: 'حساب جديد'),
                      ],
                    ),
                  ),

                const SizedBox(height: 20),

                // Error message
                if (_error.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin:  const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color:        const Color(0xFF2A1212),
                      borderRadius: BorderRadius.circular(12),
                      border:       Border.all(color: const Color(0xFF3D1919)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Color(0xFFE57373), size: 18),
                        const SizedBox(width: 10),
                        Expanded(child: Text(_error, style: const TextStyle(color: Color(0xFFFFAAAA), fontSize: 12.5, fontFamily: 'Cairo'))),
                      ],
                    ),
                  ),

                // OTP step
                if (_otpStep)
                  _OtpStep(controller: _otpCtrl)
                else if (_tabController.index == 0)
                  _AuthForm(
                    emailCtrl:   _emailCtrl,
                    passCtrl:    _passCtrl,
                    obscurePass: _obscurePass,
                    onTogglePass: () => setState(() => _obscurePass = !_obscurePass),
                  )
                else
                  _RegisterForm(
                    nameCtrl:         _nameCtrl,
                    emailCtrl:        _emailCtrl,
                    passCtrl:         _passCtrl,
                    obscurePass:      _obscurePass,
                    onTogglePass:     () => setState(() => _obscurePass = !_obscurePass),
                    selectedGrade:    _selectedGrade,
                    activeGradeLevels: widget.activeGradeLevels,
                    onGradeChanged:   (v) => setState(() => _selectedGrade = v),
                    termsAccepted:    _termsAccepted,
                    onTermsChanged:   (v) => setState(() => _termsAccepted = v),
                  ),

                const SizedBox(height: 24),

                _GradientButton(
                  label:    _otpStep ? 'تأكيد الرمز' : (_tabController.index == 0 ? 'تسجيل الدخول' : 'إنشاء الحساب'),
                  icon:     _otpStep ? Icons.verified_rounded : Icons.login_rounded,
                  onTap:    (_isLoading || (!_otpStep && _tabController.index == 1 && !_termsAccepted)) ? null : _submit,
                  loading:  _isLoading,
                ),

                if (!_otpStep) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: Divider(color: borderSubtle, thickness: 1)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Text('أو بواسطة', style: TextStyle(color: textMuted, fontSize: 11, fontFamily: 'Cairo')),
                      ),
                      Expanded(child: Divider(color: borderSubtle, thickness: 1)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: BorderSide(color: borderSubtle),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      minimumSize: const Size.fromHeight(50),
                    ),
                    onPressed: _isLoading ? null : () => _signInWithGoogle(),
                    icon: SvgPicture.network(
                      'https://www.vectorlogo.zone/logos/google/google-icon.svg',
                      width: 18, height: 18,
                      placeholderBuilder: (BuildContext context) => const SizedBox(width: 18, height: 18),
                    ),
                    label: const Text(
                      'تسجيل الدخول باستخدام Google',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthForm extends StatelessWidget {
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool   obscurePass;
  final VoidCallback onTogglePass;

  const _AuthForm({
    required this.emailCtrl,
    required this.passCtrl,
    required this.obscurePass,
    required this.onTogglePass,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldLabel('البريد الإلكتروني'),
        const SizedBox(height: 6),
        TextField(
          controller:  emailCtrl,
          keyboardType: TextInputType.emailAddress,
          style:       const TextStyle(fontSize: 14, fontFamily: 'Cairo'),
          decoration:  InputDecoration(prefixIcon: Icon(Icons.email_rounded, color: textMuted, size: 18), hintText: 'example@egsaiedu.com'),
        ),
        const SizedBox(height: 14),
        _FieldLabel('كلمة المرور'),
        const SizedBox(height: 6),
        TextField(
          controller:  passCtrl,
          obscureText: obscurePass,
          style:       const TextStyle(fontSize: 14, fontFamily: 'Cairo'),
          decoration: InputDecoration(
            prefixIcon: Icon(Icons.lock_rounded, color: textMuted, size: 18),
            hintText:   '••••••••',
            suffixIcon: GestureDetector(
              onTap: onTogglePass,
              child: Icon(obscurePass ? Icons.visibility_off_rounded : Icons.visibility_rounded, color: textMuted, size: 18),
            ),
          ),
        ),
      ],
    );
  }
}

class _RegisterForm extends StatelessWidget {
  final TextEditingController nameCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool   obscurePass;
  final VoidCallback onTogglePass;
  final String selectedGrade;
  final List<String> activeGradeLevels;
  final Function(String) onGradeChanged;
  final bool termsAccepted;
  final Function(bool) onTermsChanged;

  const _RegisterForm({
    required this.nameCtrl,
    required this.emailCtrl,
    required this.passCtrl,
    required this.obscurePass,
    required this.onTogglePass,
    required this.selectedGrade,
    required this.activeGradeLevels,
    required this.onGradeChanged,
    required this.termsAccepted,
    required this.onTermsChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldLabel('الاسم بالكامل'),
        const SizedBox(height: 6),
        TextField(
          controller: nameCtrl,
          style:      const TextStyle(fontSize: 14, fontFamily: 'Cairo'),
          decoration: InputDecoration(prefixIcon: Icon(Icons.person_rounded, color: textMuted, size: 18), hintText: 'أحمد علي'),
        ),
        const SizedBox(height: 14),
        _FieldLabel('السنة الدراسية'),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: selectedGrade,
          decoration: InputDecoration(prefixIcon: Icon(Icons.school_rounded, color: textMuted, size: 18)),
          dropdownColor: bgCard,
          items: _gradeNames.entries
              .where((g) => activeGradeLevels.isEmpty || activeGradeLevels.contains(g.key))
              .map((g) => DropdownMenuItem(value: g.key, child: Text(g.value, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13))))
              .toList(),
          onChanged: (v) { if (v != null) onGradeChanged(v); },
          style: TextStyle(fontFamily: 'Cairo', fontSize: 13.5, color: textPrimary),
        ),
        const SizedBox(height: 14),
        _FieldLabel('البريد الإلكتروني'),
        const SizedBox(height: 6),
        TextField(
          controller:  emailCtrl,
          keyboardType: TextInputType.emailAddress,
          style:       const TextStyle(fontSize: 14, fontFamily: 'Cairo'),
          decoration:  InputDecoration(prefixIcon: Icon(Icons.email_rounded, color: textMuted, size: 18), hintText: 'example@egsaiedu.com'),
        ),
        const SizedBox(height: 14),
        _FieldLabel('كلمة المرور'),
        const SizedBox(height: 6),
        TextField(
          controller:  passCtrl,
          obscureText: obscurePass,
          style:       const TextStyle(fontSize: 14, fontFamily: 'Cairo'),
          decoration: InputDecoration(
            prefixIcon: Icon(Icons.lock_rounded, color: textMuted, size: 18),
            hintText: '••••••••',
            suffixIcon: GestureDetector(
              onTap: onTogglePass,
              child: Icon(obscurePass ? Icons.visibility_off_rounded : Icons.visibility_rounded, color: textMuted, size: 18),
            ),
          ),
        ),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: () => onTermsChanged(!termsAccepted),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Checkbox(
                  value: termsAccepted,
                  onChanged: (v) => onTermsChanged(v ?? false),
                  activeColor: primaryOlive,
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: RichText(
                    text: TextSpan(
                      style: TextStyle(fontSize: 12, color: textSecondary, fontFamily: 'Cairo', height: 1.5),
                      children: [
                        const TextSpan(text: 'أوافق على '),
                        TextSpan(
                          text: 'سياسة الخصوصية',
                          style: const TextStyle(color: primaryOlive, fontWeight: FontWeight.bold),
                          recognizer: TapGestureRecognizer()
                            ..onTap = () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen())),
                        ),
                        const TextSpan(text: ' و '),
                        TextSpan(
                          text: 'شروط الاستخدام',
                          style: const TextStyle(color: primaryOlive, fontWeight: FontWeight.bold),
                          recognizer: TapGestureRecognizer()
                            ..onTap = () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TermsOfUseScreen())),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGSL SCREENS — Privacy Policy & Terms of Use
// ═══════════════════════════════════════════════════════════════════════════════
class _LegslScaffold extends StatelessWidget {
  final String title;
  final List<_LegslSection> sections;
  const _LegslScaffold({required this.title, required this.sections});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgDeep,
        appBar: AppBar(
          backgroundColor: bgCard,
          elevation: 0,
          title: Text(title, style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'تاريخ السريان وآخر تحديث: يوليو 2026 — الإصدار الرسمي المكتمل لمنصة وتطبيق EGS AI.',
                style: TextStyle(fontSize: 12, color: textMuted, fontFamily: 'Cairo'),
              ),
              const SizedBox(height: 20),
              ...sections.map((s) => Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: textPrimary, fontFamily: 'Cairo')),
                        const SizedBox(height: 8),
                        Text(s.body, style: TextStyle(fontSize: 13, color: textSecondary, fontFamily: 'Cairo', height: 1.7)),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

class _LegslSection {
  final String title;
  final String body;
  const _LegslSection(this.title, this.body);
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _LegslScaffold(
      title: 'سياسة الخصوصية',
      sections: [
        _LegslSection(
          '1. البيانات التي نجمعها',
          'بيانات الحساب: رقم الهاتف، الاسم، الصف الدراسي، وكلمة المرور (تُخزَّن مشفّرة Hashed). محتوى الاستخدام: الأسئلة، السجل، والامتحانات. الشراء عبر التطبيق يتم معالجة دفعه عبر نظام Google Play Billing وتخضع لسياسات خصوصية متجر Google Play.',
        ),
        _LegslSection(
          '2. كيفية احتساب نقاط الاستخدام',
          'يُحتسب رصيد النقاط تلقائياً بعد كل رسالة بناءً على طول السؤال وطول إجابة الذكاء الاصطناعي النموذج المستخدم (Pro / Standard).',
        ),
        _LegslSection(
          '3. كيف نستخدم بياناتك',
          'لتقديم خدمة الشرح والمساعدة الدراسية وتخصيصها حسب صفك الدراسي، لحفظ سجل محادثاتك وامتحاناتك، لإرسال إشعارات الخدمة، ولمراجعة أي بلاغات بخصوص ردود الذكاء الاصطناعي.',
        ),
        _LegslSection(
          '4. مشاركة البيانات مع أطراف ثالثة',
          'لا نبيع بياناتك الشخصية لأي طرف ثالث. تتم معالجة الأسئلة عبر نماذج ذكاء اصطناعي بدون بياناتك الشخصية. تُعالج معاملات الشراء في التطبيق عبر نظام Google Play Billing فقط.',
        ),
        _LegslSection(
          '5. أمان البيانات',
          'تُشفَّر كلمات المرور رياضياً والاتصال بالمنصة مشفّر ببروتوكولات HTTPS. نحن ملتزمون بأعلى معايير الحماية والأمان الرقمي.',
        ),
        _LegslSection(
          '6. إخلاء مسؤولية بخصوص إجابات الذكاء الاصطناعي',
          'المحتوى يُنتَج بواسطة نماذج ذكاء اصطناعي وقد يحتوي أحياناً على أخطاء. المنصة غير مسؤولة عن أي قرار يُتخذ دون التحقق من المنهج أو المعلم.',
        ),
        _LegslSection(
          '7. حقوقك',
          'يمكنك تعديل اسمك وكلمة مرورك وصفك الدراسي في أي وقت من الملف الشخصي، أو التواصل معنا لطلب حذف حسابك وبياناتك نهائياً.',
        ),
        _LegslSection(
          '8. خصوصية القُصَّر',
          'صُممت هذه المنصة لخدمة طلاب المرحلتين الإعدادية والثانوية في مصر. نحرص على ألا نجمع سوى البيانات الضرورية للخدمة التعليمية فقط.',
        ),
        _LegslSection(
          '9. تواصل الخصوصية والدعم',
          'لأي استفسارات تخص الخصوصية أو طلبات الحذف، تواصل معنا عبر الهاتف/واتساب: 01037220587 أو البريد الإلكتروني: sohaib572010@gmail.com.',
        ),
      ],
    );
  }
}

class TermsOfUseScreen extends StatelessWidget {
  const TermsOfUseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _LegslScaffold(
      title: 'شروط الاستخدام',
      sections: [
        _LegslSection(
          '1. طبيعة الخدمة',
          'EGS AI هي منصةتعليمية مساعدة تعتمد على الذكاء الاصطناعي لمساعدة طلاب المرحلتين الإعدادية والثانوية في مصر على فهم المنهج وحل الأسئلة والتدرب للامتحانات.',
        ),
        _LegslSection(
          '2. الحساب والتسجيل',
          'يجب تقديم بيانات صحيحة عند إنشاء الحساب. أنت مسؤول عن سرية كلمة مرورك وعن أي نشاط يتم من خلال حسابك. يُمنع إنشاء أكثر من حساب للتحايل على نظام النقاط.',
        ),
        _LegslSection(
          '3. الاستخدام المقبول',
          'يُستخدم المساعد الذكي لأغراض تعليمية مساعدة وليس بديلاً عن المذاكرة الجادة. يُمنع أي استخدام غير قانوني أو محاولة استغلال ثغرات تقنية.',
        ),
        _LegslSection(
          '4. باقات الاشتراك والأسعار',
          'تتوفر باقات الاشتراك التالية: 1) اشتراك شهري (Pro) بقيمة 50 ج.م. 2) اشتراك شهرين بقيمة 100 ج.م. 3) اشتراك 3 أشهر بقيمة 250 ج.م.',
        ),
        _LegslSection(
          '5. سياسة الإلغاء والاسترجاع (Refund Policy)',
          'يمكن طلب استرداد الاشتراك خلال 3 أيام (72 ساعة) فقط من الشراء، بشرط ألا يكون المستخدم قد استهلك أي جزء من نقاط الباقة المشترة. في حال استخدام أي نقطة تكون الباقة غير قابلة للاسترجاع.',
        ),
        _LegslSection(
          '6. الشراء والشحن عبر Google Play (Mobile Billing)',
          'تخضع المعاملات المالية المنجزة عبر تطبيق الهواتف المحمولة لنظام Google Play Billing ولشروط وأحكام متجر Google Play الرسمية.',
        ),
        _LegslSection(
          '7. إخلاء المسؤولية',
          'الإجابات المُولَّدة تعتمد على الذكاء الاصطناعي وتُستخدم للمساعدة الدراسية. لا تتحمل المنصة مسؤولية أي قرارات تُتخذ بناءً على إجابة غير مُتحقق منها.',
        ),
        _LegslSection(
          '8. الملكية الفكرية',
          'جميع حقوق تصميم المنصة وشعارها وأكوادها محفوظة لـ EGS AI. المحتوى الدراسي يخضع لملكية جهاته الأصلية ويُستخدم لأغراض تعليمية.',
        ),
        _LegslSection(
          '9. التواصل والقانون الحاكم',
          'تخضع هذه الشروط للقوانين المصرية. للدعم الفني والاسترجاع: هاتف/واتساب: 01037220587 | البريد: sohaib572010@gmail.com.',
        ),
      ],
    );
  }
}

class _OtpStep extends StatelessWidget {
  final TextEditingController controller;
  const _OtpStep({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient:     olivGradient,
            shape:        BoxShape.circle,
            boxShadow:    [BoxShadow(color: primaryOlive.withValues(alpha: 0.3), blurRadius: 12)],
          ),
          child: const Icon(Icons.lock_open_rounded, color: Colors.white, size: 32),
        ),
        const SizedBox(height: 16),
        Text('تحقق من بريدك الإلكتروني', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: textPrimary, fontFamily: 'Cairo')),
        const SizedBox(height: 6),
        Text('أدخل رمز التحقق المرسل إلى بريدك الإلكتروني لإكمال التسجيل',
            textAlign: TextAlign.center, style: TextStyle(color: textSecondary, fontSize: 12, fontFamily: 'Cairo')),
        const SizedBox(height: 20),
        TextField(
          controller:  controller,
          keyboardType: TextInputType.number,
          maxLength:   6,
          textAlign:   TextAlign.center,
          style:       const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, letterSpacing: 12, color: primaryOlive),
          decoration:  InputDecoration(
            hintText:    '------',
            hintStyle:   TextStyle(fontSize: 22, letterSpacing: 10, color: textMuted),
            counterText: '',
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════════
class ProfileBottomSheet extends StatefulWidget {
  final Map<String, dynamic> userProfile;
  final Function(Map<String, dynamic>) onProfileUpdated;
  final List<String> activeGradeLevels;
  final Map<String, String> gradeNames;
  final String websiteLink;

  const ProfileBottomSheet({
    super.key,
    required this.userProfile,
    required this.onProfileUpdated,
    required this.activeGradeLevels,
    required this.gradeNames,
    required this.websiteLink,
  });

  @override
  State<ProfileBottomSheet> createState() => _ProfileBottomSheetState();
}

class _ProfileBottomSheetState extends State<ProfileBottomSheet> {
  late TextEditingController _nameCtrl;
  late TextEditingController _passCtrl;
  late TextEditingController _otpCtrl;
  bool   _isOtpSent  = false;
  bool   _isLoading  = false;
  String _message    = '';
  bool   _isSuccess  = false;
  String _newPassword = '';

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.userProfile['name'] ?? '');
    _passCtrl = TextEditingController();
    _otpCtrl  = TextEditingController();
  }

  @override
  void dispose() { _nameCtrl.dispose(); _passCtrl.dispose(); _otpCtrl.dispose(); super.dispose(); }

  void _setMsg(String msg, bool success) => setState(() { _message = msg; _isSuccess = success; });

  Future<void> _updateName() async {
    setState(() { _isLoading = true; _message = ''; });
    try {
      final cleanName = _nameCtrl.text.trim();
      if (cleanName.isEmpty) throw Exception('الاسم لا يمكن أن يكون فارغاً');
      final supabase = Supabase.instance.client;
      await supabase.from('profiles').update({'name': cleanName}).eq('id', widget.userProfile['id']);
      final updated = Map<String, dynamic>.from(widget.userProfile)..['name'] = cleanName;
      widget.onProfileUpdated(updated);
      _setMsg('تم تحديث الاسم بنجاح ✓', true);
    } catch (e) {
      _setMsg(e.toString().replaceFirst('Exception: ', ''), false);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateGrade(String newGrade) async {
    setState(() { _isLoading = true; _message = ''; });
    try {
      final supabase = Supabase.instance.client;
      await supabase.from('profiles').update({'grade_level': newGrade}).eq('id', widget.userProfile['id']);
      final updated = Map<String, dynamic>.from(widget.userProfile)..['grade_level'] = newGrade;
      widget.onProfileUpdated(updated);
      _setMsg('تم تحديث الصف الدراسي بنجاح ✓', true);
    } catch (e) {
      _setMsg(e.toString().replaceFirst('Exception: ', ''), false);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _sendOtp() async {
    setState(() { _isLoading = true; _message = ''; });
    final cleanPass = _passCtrl.text.trim();
    if (cleanPass.isEmpty) {
      _setMsg('كلمة المرور الجديدة مطلوبة', false);
      setState(() => _isLoading = false);
      return;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final cleanLink = widget.websiteLink.trim().replaceAll(RegExp(r'/$'), '');
      final res = await http.post(
        Uri.parse('$cleanLink/api/auth/update-profile'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode({'action': 'send-otp'}),
      );
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) throw Exception(data['error'] ?? 'فشل إرسال رمز التحقق');
      _newPassword = cleanPass;
      setState(() => _isOtpSent = true);
      _setMsg('تم إرسال رمز التحقق إلى بريدك الإلكتروني', true);
    } catch (e) {
      _setMsg(e.toString().replaceFirst('Exception: ', ''), false);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() { _isLoading = true; _message = ''; });
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final cleanLink = widget.websiteLink.trim().replaceAll(RegExp(r'/$'), '');
      final res = await http.post(
        Uri.parse('$cleanLink/api/auth/update-profile'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode({
          'action': 'verify-otp',
          'otp': _otpCtrl.text.trim(),
          'new_password': _newPassword,
        }),
      );
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) throw Exception(data['error'] ?? 'رمز التحقق غير صحيح');
      setState(() { _isOtpSent = false; _newPassword = ''; });
      _passCtrl.clear();
      _otpCtrl.clear();
      _setMsg('تم تغيير كلمة المرور بنجاح ✓', true);
    } catch (e) {
      _setMsg(e.toString().replaceFirst('Exception: ', ''), false);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final planType = widget.userProfile['plan_type'] ?? 'free';
    final userName = widget.userProfile['name'] ?? '';
    final initials = userName.isNotEmpty ? userName.trim()[0] : '؟';

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color:        bgCard,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: DraggableScrollableSheet(
            initialChildSize: 0.85,
            maxChildSize:     0.95,
            minChildSize:     0.5,
            expand: false,
            builder: (context, scrollCtrl) => CustomScrollView(
              controller: scrollCtrl,
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Handle
                        Center(
                          child: Container(
                            width: 40, height: 4,
                            decoration: BoxDecoration(color: borderSubtle, borderRadius: BorderRadius.circular(2)),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Profile header
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(shape: BoxShape.circle, gradient: olivGradient),
                              child: Container(
                                width: 58, height: 58,
                                decoration: BoxDecoration(shape: BoxShape.circle, color: bgCard),
                                child: Center(
                                  child: Text(initials, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: primaryOlive, fontFamily: 'Cairo')),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(userName, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: textPrimary, fontFamily: 'Cairo')),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      gradient:     planType == 'max'
                                          ? const LinearGradient(colors: [Color(0xFFFFD700), Color(0xFFFFA500)])
                                          : planType == 'pro' ? olivGradient : null,
                                      color:        planType == 'free' ? bgElevated : null,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      _planNames[planType] ?? 'مجاني',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: planType == 'free' ? textSecondary : Colors.white, fontFamily: 'Cairo'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Message
                        if (_message.isNotEmpty)
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color:        _isSuccess ? const Color(0xFF122112) : const Color(0xFF2A1212),
                              borderRadius: BorderRadius.circular(12),
                              border:       Border.all(color: _isSuccess ? const Color(0xFF1E4A1E) : const Color(0xFF3D1919)),
                            ),
                            child: Text(_message, style: TextStyle(color: _isSuccess ? const Color(0xFF7FD17F) : const Color(0xFFFFAAAA), fontSize: 13, fontFamily: 'Cairo')),
                          ),

                        // Name field
                        _SectionLabel('تغيير الاسم'),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _nameCtrl,
                                style: const TextStyle(fontSize: 14, fontFamily: 'Cairo'),
                                decoration: const InputDecoration(hintText: 'الاسم بالكامل'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            _SmallButton(label: 'حفظ', onTap: _isLoading ? null : _updateName),
                          ],
                        ),

                        // Grade selection field
                        const SizedBox(height: 20),
                        _SectionLabel('الصف الدراسي الحالي'),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color:        bgElevated,
                            borderRadius: BorderRadius.circular(12),
                            border:       Border.all(color: borderSubtle),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: widget.userProfile['grade_level'] ?? widget.gradeNames.keys.first,
                              isExpanded: true,
                              dropdownColor: bgCard,
                              iconEnabledColor: primaryOlive,
                              style: TextStyle(fontSize: 14, color: textPrimary, fontFamily: 'Cairo'),
                              items: widget.gradeNames.entries
                                  .where((e) => widget.userProfile['role'] == 'admin' || widget.activeGradeLevels.isEmpty || widget.activeGradeLevels.contains(e.key) || e.key == widget.userProfile['grade_level'])
                                  .map((e) => DropdownMenuItem(
                                        value: e.key,
                                        child: Text(e.value, style: const TextStyle(fontSize: 14, fontFamily: 'Cairo')),
                                      ))
                                  .toList(),
                              onChanged: _isLoading ? null : (val) {
                                if (val != null) {
                                  _updateGrade(val);
                                }
                              },
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),
                        Divider(color: borderSubtle),
                        const SizedBox(height: 16),

                        // Password change
                        _SectionLabel('تغيير كلمة المرور'),
                        const SizedBox(height: 8),
                        if (!_isOtpSent) ...[
                          TextField(
                            controller:  _passCtrl,
                            obscureText: true,
                            style:       const TextStyle(fontSize: 14, fontFamily: 'Cairo'),
                            decoration:  const InputDecoration(hintText: 'كلمة المرور الجديدة'),
                          ),
                          const SizedBox(height: 10),
                          _GradientButton(label: 'إرسال رمز التحقق', icon: Icons.sms_rounded, onTap: _isLoading ? null : _sendOtp, loading: _isLoading),
                        ] else ...[
                          TextField(
                            controller:  _otpCtrl,
                            keyboardType: TextInputType.number,
                            maxLength:   6,
                            textAlign:   TextAlign.center,
                            style:       const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 10, color: primaryOlive),
                            decoration:  const InputDecoration(counterText: '', hintText: '------'),
                          ),
                          const SizedBox(height: 10),
                          _GradientButton(label: 'تأكيد وتغيير كلمة المرور', icon: Icons.check_rounded, onTap: _isLoading ? null : _verifyOtp, loading: _isLoading),
                        ],

                        const SizedBox(height: 20),
                        Divider(color: borderSubtle),
                        const SizedBox(height: 16),

                        // Beta notice (payment unavailable during beta)
                        _SectionLabel('حالة الحساب'),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: primaryOlive.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: primaryOlive.withValues(alpha: 0.25)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.auto_awesome_rounded, color: primaryOlive, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('نسخة تجريبية (Beta)',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: primaryOlive, fontFamily: 'Cairo')),
                                    const SizedBox(height: 4),
                                    Text(
                                      'جميع الميزات — بما فيها نموذج Pro وميزة التفكير — مفتوحة مجاناً حالياً. سيتوفر الاشتراك المدفوع قريباً مع إطلاق النسخة النهائية.',
                                      style: TextStyle(fontSize: 12, color: textSecondary, fontFamily: 'Cairo', height: 1.5),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 28),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
class _GradientButton extends StatefulWidget {
  final String       label;
  final IconData     icon;
  final VoidCallback? onTap;
  final bool         loading;

  const _GradientButton({required this.label, required this.icon, this.onTap, this.loading = false});

  @override
  State<_GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<_GradientButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null && !widget.loading;
    return GestureDetector(
      onTapDown:   enabled ? (_) => setState(() => _pressed = true)  : null,
      onTapUp:     enabled ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: enabled ?  () => setState(() => _pressed = false) : null,
      onTap:       widget.onTap,
      child: AnimatedScale(
        scale:    _pressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 15),
          decoration: BoxDecoration(
            gradient:     enabled ? olivGradient : null,
            color:        enabled ? null : bgElevated,
            borderRadius: BorderRadius.circular(14),
            boxShadow:    enabled ? [BoxShadow(color: primaryOlive.withValues(alpha: 0.3), blurRadius: 14, offset: const Offset(0, 4))] : [],
          ),
          child: widget.loading
              ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(widget.icon, color: enabled ? Colors.black : textMuted, size: 18),
                    const SizedBox(width: 10),
                    Text(
                      widget.label,
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: enabled ? Colors.black : textMuted, fontFamily: 'Cairo'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  final IconData   icon;
  final Color      iconColor;
  final String     title;
  final String     subtitle;
  final VoidCallback? onTap;
  final bool       enabled;

  const _DrawerTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.iconColor = primaryOlive,
    this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color:        iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: enabled ? iconColor : textMuted, size: 18),
      ),
      title: Text(title, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: enabled ? textPrimary : textMuted, fontFamily: 'Cairo')),
      subtitle: Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, color: textSecondary, fontFamily: 'Cairo')),
      trailing: enabled && onTap != null ? Icon(Icons.chevron_left_rounded, color: textMuted, size: 18) : null,
      onTap: enabled ? onTap : null,
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: textSecondary, fontFamily: 'Cairo'));
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 3, height: 16, decoration: BoxDecoration(gradient: olivGradient, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 8),
        Text(text, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textPrimary, fontFamily: 'Cairo')),
      ],
    );
  }
}

class _SmallButton extends StatelessWidget {
  final String     label;
  final VoidCallback? onTap;

  const _SmallButton({required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(gradient: olivGradient, borderRadius: BorderRadius.circular(12)),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black, fontFamily: 'Cairo')),
      ),
    );
  }
}

class _PremiumAlertDialog extends StatelessWidget {
  final String       title;
  final String       content;
  final String       confirmLabel;
  final VoidCallback onConfirm;

  const _PremiumAlertDialog({
    required this.title,
    required this.content,
    required this.confirmLabel,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: textPrimary, fontFamily: 'Cairo')),
            const SizedBox(height: 12),
            Text(content, style: TextStyle(fontSize: 13.5, color: textSecondary, height: 1.6, fontFamily: 'Cairo')),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      decoration: BoxDecoration(color: bgElevated, borderRadius: BorderRadius.circular(12), border: Border.all(color: borderSubtle)),
                      child: Center(child: Text('إلغاء', style: TextStyle(color: textSecondary, fontFamily: 'Cairo'))),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: onConfirm,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      decoration: BoxDecoration(gradient: olivGradient, borderRadius: BorderRadius.circular(12)),
                      child: Center(child: Text(confirmLabel, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black, fontFamily: 'Cairo'))),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


class _ThemePickerDialog extends StatelessWidget {
  final ThemeMode currentMode;

  const _ThemePickerDialog({required this.currentMode});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'مظهر التطبيق',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: textPrimary,
                fontFamily: 'Cairo',
              ),
            ),
            const SizedBox(height: 14),
            _buildOption(context, 'تلقائي حسب النظام', ThemeMode.system, Icons.brightness_auto_rounded),
            _buildOption(context, 'الوضع المضيء', ThemeMode.light, Icons.light_mode_rounded),
            _buildOption(context, 'الوضع المظلم', ThemeMode.dark, Icons.dark_mode_rounded),
          ],
        ),
      ),
    );
  }

  Widget _buildOption(BuildContext context, String title, ThemeMode mode, IconData icon) {
    final isSelected = mode == currentMode;
    return GestureDetector(
      onTap: () => Navigator.pop(context, mode),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: isSelected ? primaryOlive.withValues(alpha: 0.1) : bgElevated,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? primaryOlive.withValues(alpha: 0.4) : borderSubtle,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? primaryOlive : textSecondary, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: isSelected ? primaryOlive : textPrimary,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  fontFamily: 'Cairo',
                  fontSize: 13.5,
                ),
              ),
            ),
            if (isSelected) const Icon(Icons.check_rounded, color: primaryOlive, size: 18),
          ],
        ),
      ),
    );
  }
}

class _GradePickerDialog extends StatelessWidget {
  final Map<String, String> gradeNames;
  final String              currentGrade;
  final List<String>?       allowedGrades;

  const _GradePickerDialog({
    required this.gradeNames,
    required this.currentGrade,
    this.allowedGrades,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('اختر السنة الدراسية', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: textPrimary, fontFamily: 'Cairo')),
            const SizedBox(height: 14),
            ...gradeNames.entries
                .where((g) => allowedGrades == null || allowedGrades!.contains(g.key))
                .map((g) {
              final isSelected = g.key == currentGrade;
              return GestureDetector(
                onTap: () => Navigator.pop(context, g.key),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                  decoration: BoxDecoration(
                    color:        isSelected ? primaryOlive.withValues(alpha: 0.1) : bgElevated,
                    borderRadius: BorderRadius.circular(12),
                    border:       Border.all(color: isSelected ? primaryOlive.withValues(alpha: 0.4) : borderSubtle),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: Text(g.value, style: TextStyle(color: isSelected ? primaryOlive : textPrimary, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, fontFamily: 'Cairo', fontSize: 13.5))),
                      if (isSelected) const Icon(Icons.check_rounded, color: primaryOlive, size: 18),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

// ─── Boot loader ──────────────────────────────────────────────────────────────
class _BootLoader extends StatefulWidget {
  const _BootLoader();

  @override
  State<_BootLoader> createState() => _BootLoaderState();
}

class _BootLoaderState extends State<_BootLoader> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double>   _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
    _fade = Tween<double>(begin: 0.4, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color:     Colors.white,
              shape:     BoxShape.circle,
              boxShadow: [BoxShadow(color: primaryOlive.withValues(alpha: 0.4), blurRadius: 20, spreadRadius: 4)],
            ),
            child: ClipOval(
              child: Image.asset(
                'assets/logo.png',
                fit: BoxFit.contain,
              ),
            ),
          ),
          const SizedBox(height: 24),
          ShaderMask(
            shaderCallback: (b) => olivGradient.createShader(b),
            child: const Text('EGS AI', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 24, color: Colors.white, fontFamily: 'Cairo')),
          ),
          const SizedBox(height: 8),
          Text('جارٍ التحميل...', style: TextStyle(fontSize: 13, color: textSecondary, fontFamily: 'Cairo')),
        ],
      ),
    );
  }
}

// Legscy alias kept for compatibility
class PulsingLogoWidget extends StatelessWidget {
  const PulsingLogoWidget({super.key});
  @override
  Widget build(BuildContext context) => const _PulsingOrb();
}

// Legscy alias kept for compatibility
class SuggestionCard extends StatelessWidget {
  final String label;
  final String prompt;
  final VoidCallback onTap;

  const SuggestionCard({super.key, required this.label, required this.prompt, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return _SuggestionCard(
      icon:   Icons.lightbulb_outline_rounded,
      label:  label,
      desc:   prompt.length > 50 ? '${prompt.substring(0, 50)}...' : prompt,
      prompt: prompt,
      onTap:  (_) => onTap(),
    );
  }
}

// Legscy alias
class TypingIndicatorWidget extends StatelessWidget {
  const TypingIndicatorWidget({super.key});
  @override
  Widget build(BuildContext context) => const _ThinkingDots();
}

class _CourseSelectionChips extends StatelessWidget {
  final String selectedSubject;
  final List<Map<String, dynamic>> activeSubjects;
  final Function(String) onSubjectChanged;

  const _CourseSelectionChips({
    required this.selectedSubject,
    required this.activeSubjects,
    required this.onSubjectChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (activeSubjects.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color:        bgElevated,
          borderRadius: BorderRadius.circular(16),
          border:       Border.all(color: borderSubtle),
        ),
        child: const Text(
          'لا توجد مواد دراسية متاحة حالياً لهذا الصف.',
          style: TextStyle(fontSize: 13, fontFamily: 'Cairo', color: Colors.redAccent),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'اختر المادة الدراسية للبدء:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryOlive, fontFamily: 'Cairo'),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: activeSubjects.map((subj) {
            final name = subj['subject_name']?.toString() ?? '';
            final isSelected = name == selectedSubject;
            return GestureDetector(
              onTap: () => onSubjectChanged(name),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                decoration: BoxDecoration(
                  gradient:     isSelected ? olivGradient : null,
                  color:        isSelected ? null : bgElevated,
                  borderRadius: BorderRadius.circular(14),
                  border:       Border.all(color: isSelected ? Colors.transparent : borderSubtle),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: primaryOlive.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          )
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.book_rounded, size: 16, color: isSelected ? Colors.white : primaryOlive),
                    const SizedBox(width: 8),
                    Text(
                      name,
                      style: TextStyle(
                        fontSize:   13,
                        fontWeight: FontWeight.bold,
                        color:      isSelected ? Colors.white : textPrimary,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE QUIZ WIDGET (CHAT INLINE CARD)
// ═══════════════════════════════════════════════════════════════════════════════
class InteractiveQuizWidget extends StatefulWidget {
  final Map<String, dynamic> quiz;
  final Function(String)? onAnswerSubmit;

  const InteractiveQuizWidget({super.key, required this.quiz, this.onAnswerSubmit});

  @override
  State<InteractiveQuizWidget> createState() => _InteractiveQuizWidgetState();
}

class _InteractiveQuizWidgetState extends State<InteractiveQuizWidget> {
  int? _selectedMcq;
  bool? _selectedTf;
  final TextEditingController _essayController = TextEditingController();
  bool _submitted = false;

  bool _isCorrect() {
    final type = widget.quiz['type'] ?? 'multiple_choice';
    final correctAnswer = widget.quiz['correct_answer']?.toString() ?? '';
    if (type == 'multiple_choice') {
      if (_selectedMcq == null) return false;
      final options = widget.quiz['options'] as List<dynamic>?;
      if (options == null || _selectedMcq! >= options.length) return false;
      return options[_selectedMcq!].toString() == correctAnswer;
    } else if (type == 'true_false') {
      if (_selectedTf == null) return false;
      return _selectedTf.toString() == correctAnswer.toLowerCase();
    }
    return true;
  }

  void _submitAnswer(String answerText) {
    setState(() {
      _submitted = true;
    });
    if (widget.onAnswerSubmit != null) {
      widget.onAnswerSubmit!(answerText);
    }
  }

  @override
  void dispose() {
    _essayController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final type = widget.quiz['type'] ?? 'multiple_choice';
    final question = widget.quiz['question'] ?? 'السؤال؟';
    final explanation = widget.quiz['explanation'] ?? '';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: primaryOlive, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.quiz_rounded, color: primaryOlive, size: 16),
              const SizedBox(width: 8),
              Text(
                'اختبر فهمك مع EGS AI:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryOlive, fontFamily: 'Cairo'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            question,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, height: 1.4, fontFamily: 'Cairo'),
          ),
          const SizedBox(height: 12),

          // MCQ options
          if (type == 'multiple_choice') ...[
            ...((widget.quiz['options'] as List<dynamic>? ?? []).asMap().entries.map((entry) {
              final idx = entry.key;
              final opt = entry.value.toString();
              final isSelected = _selectedMcq == idx;
              final correctAnswer = widget.quiz['correct_answer']?.toString() ?? '';
              final isCorrectOpt = opt == correctAnswer;

              Color btnColor = bgCard;
              Color borderCol = borderSubtle;
              Color textCol = textPrimary;

              if (isSelected) {
                btnColor = primaryOlive.withValues(alpha: 0.1);
                borderCol = primaryOlive;
                textCol = primaryOlive;
              }

              if (_submitted) {
                if (isCorrectOpt) {
                  btnColor = Colors.green.withValues(alpha: 0.1);
                  borderCol = Colors.green;
                  textCol = Colors.green;
                } else if (isSelected) {
                  btnColor = Colors.red.withValues(alpha: 0.1);
                  borderCol = Colors.red;
                  textCol = Colors.red;
                }
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: _submitted
                      ? null
                      : () {
                          setState(() => _selectedMcq = idx);
                          _submitAnswer(opt);
                        },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: btnColor,
                      border: Border.all(color: borderCol, width: 1.5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${idx + 1}. $opt',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textCol, fontFamily: 'Cairo'),
                    ),
                  ),
                ),
              );
            })),
          ],

          // True/False options
          if (type == 'true_false') ...[
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _submitted
                        ? null
                        : () {
                            setState(() => _selectedTf = true);
                            _submitAnswer('true');
                          },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _selectedTf == true
                            ? (_submitted && _isCorrect() ? Colors.green.withValues(alpha: 0.1) : primaryOlive.withValues(alpha: 0.1))
                            : bgCard,
                        border: Border.all(
                          color: _selectedTf == true
                              ? (_submitted && _isCorrect() ? Colors.green : primaryOlive)
                              : borderSubtle,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Text(
                          'صح',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: primaryOlive, fontFamily: 'Cairo'),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _submitted
                        ? null
                        : () {
                            setState(() => _selectedTf = false);
                            _submitAnswer('false');
                          },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _selectedTf == false
                            ? (_submitted && _isCorrect() ? Colors.green.withValues(alpha: 0.1) : primaryOlive.withValues(alpha: 0.1))
                            : bgCard,
                        border: Border.all(
                          color: _selectedTf == false
                              ? (_submitted && _isCorrect() ? Colors.green : primaryOlive)
                              : borderSubtle,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Text(
                          'خطأ',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Colors.redAccent, fontFamily: 'Cairo'),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],

          // Essay options
          if (type == 'essay') ...[
            TextField(
              controller: _essayController,
              maxLines: 3,
              enabled: !_submitted,
              style: TextStyle(color: textPrimary, fontSize: 13, fontFamily: 'Cairo'),
              decoration: InputDecoration(
                hintText: 'اكتب إجابتك هنا يا بطل...',
                hintStyle: TextStyle(color: textMuted, fontSize: 12.5, fontFamily: 'Cairo'),
                fillColor: bgCard,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: borderSubtle)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: primaryOlive)),
              ),
            ),
            const SizedBox(height: 10),
            if (!_submitted)
              ElevatedButton(
                onPressed: () {
                  final txt = _essayController.text.trim();
                  if (txt.isNotEmpty) {
                    _submitAnswer(txt);
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryOlive,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                child: const Text('إرسال الإجابة للتقييم', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, fontFamily: 'Cairo')),
              ),
          ],

          // Submitted feedback
          if (_submitted) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: bgCard,
                borderRadius: BorderRadius.circular(10),
                border: Border(
                  left: BorderSide(
                    color: type == 'essay' ? primaryOlive : (_isCorrect() ? Colors.green : Colors.red),
                    width: 4,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    type == 'essay'
                        ? 'تم إرسال إجابتك للتحليل!'
                        : (_isCorrect() ? 'إجابة صحيحة! أحسنت يا بطل!' : 'إجابة خاطئة، لا بأس فالهدف هو التعلم!'),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: type == 'essay' ? primaryOlive : (_isCorrect() ? Colors.green : Colors.red),
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'الشرح والتوضيح: $explanation',
                    style: TextStyle(fontSize: 12, color: textSecondary, height: 1.4, fontFamily: 'Cairo'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAM INVITE WIDGET (CHAT INLINE CARD)
// ═══════════════════════════════════════════════════════════════════════════════
class ExamInviteWidget extends StatelessWidget {
  final Map<String, dynamic> exam;
  final Function(Map<String, dynamic>)? onGoToExams;

  const ExamInviteWidget({super.key, required this.exam, this.onGoToExams});

  @override
  Widget build(BuildContext context) {
    final title = exam['title'] ?? 'امتحان تقييمي ذكي';
    final subject = exam['subject_name'] ?? '';
    final grade = exam['grade_level'] ?? '';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: primaryOlive, width: 2, style: BorderStyle.solid),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.stars_rounded, color: primaryOlive, size: 18),
              const SizedBox(width: 8),
              Text(
                'امتحان مقترح من EGS AI:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: primaryOlive, fontFamily: 'Cairo'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, fontFamily: 'Cairo'),
          ),
          const SizedBox(height: 4),
          Text(
            'المادة: $subject · الصف الدراسي: ${_gradeNames[grade] ?? grade}',
            style: TextStyle(fontSize: 11.5, color: textSecondary, fontFamily: 'Cairo'),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () {
              if (onGoToExams != null) {
                onGoToExams!(exam);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryOlive,
              foregroundColor: Colors.white,
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            child: const Text('بدء الامتحان الآن', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Cairo')),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLASHCARDS INVITE WIDGET (CHAT INLINE CARD)
// ═══════════════════════════════════════════════════════════════════════════════
class FlashcardsInviteWidget extends StatefulWidget {
  final Map<String, dynamic> flashcards;
  final String websiteLink;

  const FlashcardsInviteWidget({super.key, required this.flashcards, required this.websiteLink});

  @override
  State<FlashcardsInviteWidget> createState() => _FlashcardsInviteWidgetState();
}

class _FlashcardsInviteWidgetState extends State<FlashcardsInviteWidget> {
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    _autoSave();
  }

  Future<void> _autoSave() async {
    if (_saved) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final deviceId = prefs.getString('device_id');
      final grade = prefs.getString('selected_grade') ?? '3_high';
      final apiBase = resolveWebsiteLink(widget.websiteLink);

      final cards = widget.flashcards['cards'];
      if (cards is List && cards.isNotEmpty) {
        await http.post(
          Uri.parse('$apiBase/api/flashcards'),
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
            if (deviceId != null) 'x-device-id': deviceId,
          },
          body: jsonEncode({
            'subject_name': widget.flashcards['subject_name'] ?? 'عام',
            'grade_level': grade,
            'title': widget.flashcards['title'] ?? 'مجموعة كروت جديدة',
            'cards': cards,
          }),
        );
        setState(() => _saved = true);
      }
    } catch (e) {
      debugPrint('Auto save flashcards error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.flashcards['title'] ?? 'مجموعة كروت جديدة';
    final subject = widget.flashcards['subject_name'] ?? '';
    final count = (widget.flashcards['cards'] as List?)?.length ?? 0;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: primaryOlive, width: 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: primaryOlive,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'Cairo'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '$subject • $count كارت تعليمي',
                        style: TextStyle(fontSize: 11.5, color: textSecondary, fontFamily: 'Cairo'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => FlashcardsScreen(websiteLink: widget.websiteLink)),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryOlive,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            child: const Text('مراجعة 🧠', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMS DASHBOARD SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
class ExamsScreen extends StatefulWidget {
  final Map<String, dynamic>? initialExam;
  final String websiteLink;
  const ExamsScreen({super.key, this.initialExam, required this.websiteLink});

  @override
  State<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends State<ExamsScreen> {
  bool _loading = true;
  bool _generating = false;
  List<Map<String, dynamic>> _exams = [];
  List<Map<String, dynamic>> _submissions = [];

  String? _authToken;
  String? _deviceId;
  String _gradeLevel = '3_high';
  String _subjectName = 'الفيزياء';
  double _coins = 0.0;

  String get _apiBase => resolveWebsiteLink(widget.websiteLink);

  Map<String, String> get _apiHeaders => {
        'Content-Type': 'application/json',
        if (_authToken != null && _authToken!.isNotEmpty) 'Authorization': 'Bearer $_authToken',
        if (_deviceId != null && _deviceId!.isNotEmpty) 'x-device-id': _deviceId!,
      };

  @override
  void initState() {
    super.initState();
    _loadSettingsAndData();
  }

  Future<void> _loadSettingsAndData() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
    _deviceId = prefs.getString('device_id');
    _gradeLevel = prefs.getString('selected_grade') ?? '3_high';
    _subjectName = prefs.getString('selected_subject') ?? 'الفيزياء';

    final userJson = prefs.getString('auth_user');
    if (userJson != null) {
      try {
        final user = jsonDecode(userJson);
        _coins = double.tryParse(user['coins']?.toString() ?? '0.0') ?? 0.0;
      } catch (_) {}
    }

    if (_authToken != null) {
      await _refreshCoins();
      await _fetchData();
    } else {
      setState(() {
        _loading = false;
      });
    }

    if (widget.initialExam != null && _authToken != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _startExam(widget.initialExam!);
      });
    }
  }

  Future<void> _fetchData() async {
    if (_authToken == null) return;
    setState(() => _loading = true);
    try {
      final examsRes = await http.get(
        Uri.parse('$_apiBase/api/exams?subject_name=${Uri.encodeComponent(_subjectName)}'),
        headers: _apiHeaders,
      );
      final subsRes = await http.get(
        Uri.parse('$_apiBase/api/exams/submissions'),
        headers: _apiHeaders,
      );

      final examsData = jsonDecode(utf8.decode(examsRes.bodyBytes));
      final subsData = jsonDecode(utf8.decode(subsRes.bodyBytes));

      setState(() {
        _exams = examsRes.statusCode == 200 && examsData is List
            ? List<Map<String, dynamic>>.from(examsData)
            : [];
        _submissions = subsRes.statusCode == 200 && subsData is List
            ? List<Map<String, dynamic>>.from(subsData)
            : [];
      });
    } catch (e) {
      debugPrint('Error fetching exams data: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showCustomExamDialog() {
    if (_coins <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ليس لديك رصيد كافٍ من النقاط لإنشاء الامتحان. يرجى الترقية أو الشحن.', style: TextStyle(fontFamily: 'Cairo'))),
      );
      return;
    }
    final topicCtrl = TextEditingController();
    String mode = 'auto';
    int totalCount = 5;
    int mcqCount = 2;
    int tfCount = 2;
    int essayCount = 1;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                backgroundColor: bgCard,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                title: const Text(
                  'إنشاء امتحان مخصص بالذكاء الاصطناعي',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                ),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'الموضوع الدراسي للاختبار:',
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: Colors.white70),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: topicCtrl,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'مثال: قوانين نيوتن، التكاثر في النبات...',
                          hintStyle: TextStyle(color: textMuted, fontSize: 12.5),
                          fillColor: bgSurface,
                          filled: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: borderSubtle)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'طريقة تحديد الأسئلة:',
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: Colors.white70),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: bgSurface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: borderSubtle),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: mode,
                            dropdownColor: bgCard,
                            isExpanded: true,
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: Colors.white),
                            onChanged: (val) {
                              if (val != null) {
                                setDialogState(() => mode = val);
                              }
                            },
                            items: const [
                              DropdownMenuItem(value: 'auto', child: Text('توليد تلقائي بالكامل')),
                              DropdownMenuItem(value: 'total_only', child: Text('تحديد إجمالي عدد الأسئلة فقط')),
                              DropdownMenuItem(value: 'custom_types', child: Text('تحديد عدد كل نوع بالتفصيل')),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (mode == 'total_only') ...[
                        const Text(
                          'إجمالي عدد الأسئلة:',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: Colors.white70),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            fillColor: bgSurface,
                            filled: true,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onChanged: (val) {
                            totalCount = int.tryParse(val) ?? 5;
                          },
                          controller: TextEditingController(text: totalCount.toString()),
                        ),
                      ],
                      if (mode == 'custom_types') ...[
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                children: [
                                  const Text('اختيار من متعدد', style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Colors.white70)),
                                  const SizedBox(height: 4),
                                  TextField(
                                    keyboardType: TextInputType.number,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                    decoration: InputDecoration(fillColor: bgSurface, filled: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                                    onChanged: (val) => mcqCount = int.tryParse(val) ?? 0,
                                    controller: TextEditingController(text: mcqCount.toString()),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                children: [
                                  const Text('صح أم خطأ', style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Colors.white70)),
                                  const SizedBox(height: 4),
                                  TextField(
                                    keyboardType: TextInputType.number,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                    decoration: InputDecoration(fillColor: bgSurface, filled: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                                    onChanged: (val) => tfCount = int.tryParse(val) ?? 0,
                                    controller: TextEditingController(text: tfCount.toString()),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                children: [
                                  const Text('أسئلة مقالية', style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Colors.white70)),
                                  const SizedBox(height: 4),
                                  TextField(
                                    keyboardType: TextInputType.number,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                    decoration: InputDecoration(fillColor: bgSurface, filled: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                                    onChanged: (val) => essayCount = int.tryParse(val) ?? 0,
                                    controller: TextEditingController(text: essayCount.toString()),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: Colors.white70)),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      final topic = topicCtrl.text.trim();
                      if (topic.isNotEmpty) {
                        Navigator.pop(context);
                        _generateExam(
                          topic: topic,
                          mode: mode,
                          totalCount: totalCount,
                          mcqCount: mcqCount,
                          tfCount: tfCount,
                          essayCount: essayCount,
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: primaryOlive),
                    child: const Text('إنشاء الآن', style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _generateExam({
    String? topic,
    String? mode,
    int? totalCount,
    int? mcqCount,
    int? tfCount,
    int? essayCount,
  }) async {
    if (_coins <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ليس لديك رصيد كافٍ من النقاط لإنشاء الامتحان. يرجى الترقية أو الشحن.', style: TextStyle(fontFamily: 'Cairo'))),
      );
      return;
    }
    setState(() => _generating = true);
    try {
      final res = await http.post(
        Uri.parse('$_apiBase/api/exams/generate'),
        headers: _apiHeaders,
        body: jsonEncode({
          'subject_name': _subjectName,
          'grade_level': _gradeLevel,
          'topic': topic,
          'mode': mode ?? 'auto',
          'total_count': totalCount,
          'mcq_count': mcqCount,
          'tf_count': tfCount,
          'essay_count': essayCount,
        }),
      );
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) {
        throw Exception(data['error'] ?? 'فشل توليد الامتحان');
      }

      await _refreshCoins();
      await _fetchData();
      _startExam(Map<String, dynamic>.from(data));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل توليد الامتحان: ${e.toString().replaceFirst('Exception: ', '')}')));
      }
    } finally {
      setState(() => _generating = false);
    }
  }

  Future<void> _refreshCoins() async {
    try {
      final res = await http.get(Uri.parse('$_apiBase/api/config'), headers: _apiHeaders);
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        final user = data['user'];
        if (user != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('auth_user', jsonEncode(user));
          setState(() => _coins = double.tryParse(user['coins']?.toString() ?? '0.0') ?? 0.0);
        }
      }
    } catch (_) {}
  }

  void _startExam(Map<String, dynamic> exam) async {
    // Chat-emitted exams ([CREATE_EXAM]) have no id yet; persist first
    if (exam['id'] == null) {
      try {
        final res = await http.post(
          Uri.parse('$_apiBase/api/exams'),
          headers: _apiHeaders,
          body: jsonEncode({
            'title': exam['title'],
            'subject_name': exam['subject_name'] ?? _subjectName,
            'grade_level': exam['grade_level'] ?? _gradeLevel,
            'questions': exam['questions'],
          }),
        );
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        if (res.statusCode != 200) {
          throw Exception(data['error'] ?? 'فشل حفظ الامتحان');
        }
        exam = Map<String, dynamic>.from(data);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل حفظ الامتحان: ${e.toString().replaceFirst('Exception: ', '')}')));
        }
        return;
      }
    }
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TakeExamScreen(
          exam: exam,
          websiteLink: widget.websiteLink,
        ),
      ),
    ).then((_) {
      _refreshCoins();
      _fetchData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgSurface,
        appBar: AppBar(
          title: const Text('الامتحانات والاختبارات التقييمية', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
          backgroundColor: bgCard,
          elevation: 0,
          foregroundColor: primaryOlive,
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: primaryOlive))
            : _authToken == null
                ? Center(
                    child: Container(
                      margin: const EdgeInsets.all(24),
                      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
                      decoration: BoxDecoration(
                        color: bgCard,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: borderSubtle),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 16,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: primaryOlive.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.lock_outline_rounded,
                              color: primaryOlive,
                              size: 32,
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'تسجيل الدخول مطلوب',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: primaryOlive,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'الرجاء تسجيل الدخول لعرض أو إنشاء أو تقديم الامتحانات التقييمية.',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              color: textSecondary,
                              height: 1.4,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.pop(context);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryOlive,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              icon: const Icon(Icons.arrow_back_rounded, size: 18),
                              label: const Text(
                                'العودة للخلف',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top welcome card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: bgCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: borderSubtle),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.auto_awesome_rounded, color: primaryOlive, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'الامتحانات الذكية لـ EGS AI',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: primaryOlive, fontFamily: 'Cairo'),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'ولد امتحانات مخصصة لمستواك ومادتك بناءً على ما قمت بمذاكرته!',
                                      style: TextStyle(fontSize: 11.5, color: textSecondary, fontFamily: 'Cairo'),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _generating ? null : _showCustomExamDialog,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryOlive,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: _generating
                                  ? const Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                                        SizedBox(width: 8),
                                        Text('جاري توليد امتحانك الذكي...', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                                      ],
                                    )
                                  : const Text('توليد امتحان مخصص جديد', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Two columns layout via flex
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Left/Main part: Available Exams
                        Expanded(
                          flex: 3,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'الامتحانات المتوفرة',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: primaryOlive, fontFamily: 'Cairo'),
                              ),
                              const SizedBox(height: 12),
                              if (_exams.isEmpty)
                                Container(
                                  padding: const EdgeInsets.all(24),
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    color: bgCard,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: borderSubtle, style: BorderStyle.solid),
                                  ),
                                  child: const Column(
                                    children: [
                                      Icon(Icons.assignment_outlined, color: Colors.grey, size: 24),
                                      SizedBox(height: 8),
                                      Text(
                                        'لا توجد امتحانات مخصصة نشطة حالياً. يمكنك الضغط على توليد امتحان مخصص بالذكاء الاصطناعي أعلاه لبدء اختبار فهمك.',
                                        style: TextStyle(fontSize: 12, color: Colors.grey, fontFamily: 'Cairo', height: 1.4),
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                )
                              else
                                ..._exams.map((ex) => Container(
                                      margin: const EdgeInsets.only(bottom: 10),
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: bgCard,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: borderSubtle),
                                      ),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  ex['title'] ?? 'امتحان تقييمي ذكي',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, fontFamily: 'Cairo'),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  'المادة: ${ex['subject_name']} · الأسئلة: ${(ex['questions'] as List?)?.length ?? 3}',
                                                  style: TextStyle(fontSize: 11, color: textSecondary, fontFamily: 'Cairo'),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            onPressed: () => _startExam(ex),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: primaryOlive,
                                              foregroundColor: Colors.white,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                            ),
                                            child: const Text('ابدأ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
                                          ),
                                        ],
                                      ),
                                    )),
                            ],
                          ),
                        ),
                        const SizedBox(width: 14),

                        // Right part: Grade logs
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'سجل الدرجات',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: primaryOlive, fontFamily: 'Cairo'),
                              ),
                              const SizedBox(height: 12),
                              if (_submissions.isEmpty)
                                Container(
                                  padding: const EdgeInsets.all(24),
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    color: bgCard,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: borderSubtle, style: BorderStyle.solid),
                                  ),
                                  child: const Column(
                                    children: [
                                      Icon(Icons.history_edu_rounded, color: Colors.grey, size: 24),
                                      SizedBox(height: 8),
                                      Text(
                                        'لم تقم بتسليم أي امتحانات بعد.',
                                        style: TextStyle(fontSize: 12, color: Colors.grey, fontFamily: 'Cairo'),
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                )
                              else
                                ..._submissions.map((sub) {
                                  final title = sub['exam_title'] ?? 'امتحان تقييمي';
                                  final score = sub['score'] ?? 0;
                                  final submittedAt = sub['submitted_at'] != null
                                      ? DateTime.parse(sub['submitted_at']).toLocal()
                                      : DateTime.now();
                                  final dateStr = "${submittedAt.year}/${submittedAt.month}/${submittedAt.day}";

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 10),
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: bgCard,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: borderSubtle),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          title,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, fontFamily: 'Cairo'),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              'الدرجة: $score/100',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: score >= 50 ? Colors.green : Colors.redAccent,
                                                fontFamily: 'Cairo',
                                              ),
                                            ),
                                            Text(
                                              dateStr,
                                              style: TextStyle(fontSize: 10.5, color: textMuted, fontFamily: 'Cairo'),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        SizedBox(
                                          width: double.infinity,
                                          child: TextButton(
                                            onPressed: () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (context) => GradedResultScreen(
                                                    score: (score as num).toInt(),
                                                    evaluation: sub['evaluation'] ?? '',
                                                    examTitle: title,
                                                  ),
                                                ),
                                              );
                                            },
                                            style: TextButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(vertical: 4),
                                              foregroundColor: primaryOlive,
                                            ),
                                            child: const Text('عرض التقرير التقييمي الكامل', style: TextStyle(fontSize: 11, fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
class TakeExamScreen extends StatefulWidget {
  final Map<String, dynamic> exam;
  final String websiteLink;

  const TakeExamScreen({
    super.key,
    required this.exam,
    required this.websiteLink,
  });

  @override
  State<TakeExamScreen> createState() => _TakeExamScreenState();
}

class _TakeExamScreenState extends State<TakeExamScreen> {
  final Map<String, String> _answers = {};
  bool _grading = false;
  Timer? _timer;
  int _timeRemaining = 0;

  @override
  void initState() {
    super.initState();
    _initTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _initTimer() async {
    final questions = widget.exam['questions'] as List<dynamic>? ?? [];
    final durationSeconds = questions.length * 120;
    final prefs = await SharedPreferences.getInstance();
    final examId = widget.exam['id']?.toString() ?? '';
    
    final savedExamId = prefs.getString('egs_active_exam_id');
    final savedTimeStr = prefs.getString('egs_active_exam_time');
    
    if (savedExamId == examId && savedTimeStr != null) {
      _timeRemaining = int.tryParse(savedTimeStr) ?? durationSeconds;
    } else {
      _timeRemaining = durationSeconds;
      await prefs.setString('egs_active_exam_id', examId);
      await prefs.setString('egs_active_exam_time', _timeRemaining.toString());
    }
    
    if (mounted) setState(() {});
    
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (_timeRemaining > 0) {
        if (mounted) {
          setState(() {
            _timeRemaining--;
          });
        } else {
          _timeRemaining--;
        }
        await prefs.setString('egs_active_exam_time', _timeRemaining.toString());
        if (_timeRemaining <= 0) {
          _timer?.cancel();
          _autoSubmit();
        }
      }
    });
  }

  void _autoSubmit() {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('انتهى الوقت المحدد للامتحان! يتم تسليم الإجابات الحالية تلقائياً.')),
      );
      _submit(isAutoSubmit: true);
    }
  }

  void _submit({bool isAutoSubmit = false}) async {
    final questions = widget.exam['questions'] as List<dynamic>? ?? [];
    if (!isAutoSubmit && _answers.length < questions.length) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى الإجابة على جميع الأسئلة أولاً!')),
      );
      return;
    }

    setState(() => _grading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final authToken = prefs.getString('auth_token');
      final deviceId = prefs.getString('device_id');
      if (authToken == null) {
        throw Exception('يجب تسجيل الدخول لتصحيح الامتحان');
      }

      final cleanLink = widget.websiteLink.trim().replaceAll(RegExp(r'/$'), '');
      final res = await http.post(
        Uri.parse('$cleanLink/api/exams/submit'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
          if (deviceId != null) 'x-device-id': deviceId,
        },
        body: jsonEncode({
          'exam_id': widget.exam['id'],
          'answers': _answers,
        }),
      );

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) {
        throw Exception(data['error'] ?? 'فشل تصحيح الامتحان الذكي');
      }

      await prefs.remove('egs_active_exam_id');
      await prefs.remove('egs_active_exam_time');

      final score = double.tryParse(data['score']?.toString() ?? '0') ?? 0.0;
      final evaluation = data['evaluation']?.toString() ?? '';
      final questionsReview = data['questions_review'] is List
          ? List<Map<String, dynamic>>.from(data['questions_review'])
          : <Map<String, dynamic>>[];

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => GradedResultScreen(
              examTitle: widget.exam['title'] ?? 'امتحان تقييمي ذكي',
              score: score.toInt(),
              evaluation: evaluation,
              questionsReview: questionsReview,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('حدث خطأ أثناء التصحيح: ${e.toString().replaceFirst('Exception: ', '')}')));
      }
    } finally {
      if (mounted) {
        setState(() => _grading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final questions = widget.exam['questions'] as List<dynamic>? ?? [];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgSurface,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () async {
              final confirmExit = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: bgCard,
                  title: const Text('مغادرة الامتحان؟', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                  content: const Text('هل أنت متأكد من مغادرة الامتحان؟ لن يتم حفظ إجاباتك الحالية.', style: TextStyle(fontFamily: 'Cairo')),
                  actions: [
                    TextButton(
                      child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: primaryOlive)),
                      onPressed: () => Navigator.pop(context, false),
                    ),
                    TextButton(
                      child: const Text('مغادرة', style: TextStyle(fontFamily: 'Cairo', color: Colors.red)),
                      onPressed: () => Navigator.pop(context, true),
                    ),
                  ],
                ),
              );
              if (confirmExit == true) {
                final prefs = await SharedPreferences.getInstance();
                await prefs.remove('egs_active_exam_id');
                await prefs.remove('egs_active_exam_time');
                if (mounted) Navigator.pop(context);
              }
            },
          ),
          title: Text(widget.exam['title'] ?? 'تقديم الامتحان', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15)),
          backgroundColor: bgCard,
          elevation: 0,
          foregroundColor: primaryOlive,
          actions: [
            Padding(
              padding: const EdgeInsets.only(left: 16.0),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: _timeRemaining <= 60 ? Colors.red.withOpacity(0.1) : Colors.black.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _timeRemaining <= 60 ? Colors.red : borderSubtle),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.timer_outlined, size: 16, color: _timeRemaining <= 60 ? Colors.red : textPrimary),
                      const SizedBox(width: 4),
                      Text(
                        '${(_timeRemaining ~/ 60).toString().padLeft(2, '0')}:${(_timeRemaining % 60).toString().padLeft(2, '0')}',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.bold,
                          fontSize: 12.5,
                          color: _timeRemaining <= 60 ? Colors.red : textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        body: _grading
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const CircularProgressIndicator(color: primaryOlive),
                      const SizedBox(height: 16),
                      Text(
                        'جاري إرسال إجاباتك وتصحيحها بواسطة EGS AI...',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textPrimary, fontFamily: 'Cairo'),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            : Column(
                children: [
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: questions.length,
                      itemBuilder: (context, idx) {
                        final q = questions[idx] as Map<String, dynamic>;
                        final qId = q['id']?.toString() ?? 'q$idx';
                        final type = q['type'] ?? 'multiple_choice';
                        final questionText = q['question'] ?? '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 20),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: bgCard,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: borderSubtle),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: primaryOlive, borderRadius: BorderRadius.circular(6)),
                                    child: Text(
                                      'س ${idx + 1}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white, fontFamily: 'Cairo'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      questionText,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, fontFamily: 'Cairo'),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Answer widget
                              if (type == 'multiple_choice') ...[
                                ...((q['options'] as List<dynamic>? ?? []).map((opt) {
                                  final val = opt.toString();
                                  final isChecked = _answers[qId] == val;
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: InkWell(
                                      onTap: () => setState(() => _answers[qId] = val),
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: isChecked ? primaryOlive.withValues(alpha: 0.1) : bgSurface,
                                          border: Border.all(color: isChecked ? primaryOlive : borderSubtle, width: 1.5),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          children: [
                                            Radio<String>(
                                              value: val,
                                              groupValue: _answers[qId],
                                              onChanged: (newVal) => setState(() => _answers[qId] = newVal!),
                                              activeColor: primaryOlive,
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(child: Text(val, style: const TextStyle(fontSize: 12.5, fontFamily: 'Cairo'))),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                })),
                              ],

                              if (type == 'true_false') ...[
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () => setState(() => _answers[qId] = 'true'),
                                        child: Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: _answers[qId] == 'true' ? primaryOlive.withValues(alpha: 0.1) : bgSurface,
                                            border: Border.all(color: _answers[qId] == 'true' ? primaryOlive : borderSubtle, width: 1.5),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: const Center(child: Text('صح', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold))),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () => setState(() => _answers[qId] = 'false'),
                                        child: Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: _answers[qId] == 'false' ? primaryOlive.withValues(alpha: 0.1) : bgSurface,
                                            border: Border.all(color: _answers[qId] == 'false' ? primaryOlive : borderSubtle, width: 1.5),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: const Center(child: Text('خطأ', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Colors.redAccent))),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],

                              if (type == 'essay') ...[
                                TextField(
                                  maxLines: 4,
                                  onChanged: (val) => setState(() => _answers[qId] = val.trim()),
                                  style: TextStyle(color: textPrimary, fontSize: 13, fontFamily: 'Cairo'),
                                  decoration: InputDecoration(
                                    hintText: 'اكتب إجابتك المقالية النموذجية بالتفصيل هنا...',
                                    hintStyle: TextStyle(color: textMuted, fontSize: 12.5, fontFamily: 'Cairo'),
                                    fillColor: bgSurface,
                                    filled: true,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderSubtle)),
                                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: primaryOlive)),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  ),

                  // Bottom submit bar
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: bgCard,
                      border: Border(top: BorderSide(color: borderSubtle)),
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _answers.length < questions.length ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryOlive,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('تقديم الامتحان للتصحيح 📤', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13.5)),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADED RESULT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
class GradedResultScreen extends StatelessWidget {
  final String examTitle;
  final int score;
  final String evaluation;
  final List<Map<String, dynamic>> questionsReview;

  const GradedResultScreen({
    super.key,
    required this.examTitle,
    required this.score,
    required this.evaluation,
    this.questionsReview = const [],
  });

  @override
  Widget build(BuildContext context) {
    final Color scoreColor = score >= 80 ? Colors.green : (score >= 50 ? Colors.orange : Colors.red);
    final String scoreTitle = score >= 80 ? 'ممتاز جداً' : (score >= 50 ? 'جيد (يحتاج تحسين)' : 'ضعيف');

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgSurface,
        appBar: AppBar(
          title: const Text('نتيجة التقييم والدرجة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15)),
          backgroundColor: bgCard,
          elevation: 0,
          foregroundColor: primaryOlive,
          automaticallyImplyLeading: false,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 10),
              const Center(child: Icon(Icons.stars_rounded, color: primaryOlive, size: 48)),
              const SizedBox(height: 10),
              Text(
                'الامتحان: $examTitle',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15.5, fontFamily: 'Cairo'),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Circle gauge score
              Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: scoreColor, width: 6),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$score%',
                        style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: scoreColor, fontFamily: 'Cairo'),
                      ),
                      Text(
                        scoreTitle,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: textMuted, fontFamily: 'Cairo'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // Evaluation advice card
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  'تحليل وتصحيح EGS AI:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: primaryOlive, fontFamily: 'Cairo'),
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderSubtle),
                ),
                child: MarkdownFormatterWidget(text: evaluation),
              ),
              const SizedBox(height: 28),

              // Per-question corrections (revealed only after grading)
              if (questionsReview.isNotEmpty) ...[
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    'مراجعة الأسئلة والإجابات النموذجية:',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: primaryOlive, fontFamily: 'Cairo'),
                  ),
                ),
                const SizedBox(height: 10),
                ...questionsReview.asMap().entries.map((entry) {
                  final q = entry.value;
                  final studentAnswer = q['student_answer']?.toString();
                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: bgCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderSubtle),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'س ${entry.key + 1}: ${q['question'] ?? ''}',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: textPrimary, fontFamily: 'Cairo'),
                        ),
                        const SizedBox(height: 8),
                        if (studentAnswer != null && studentAnswer.isNotEmpty)
                          Text(
                            'إجابتك: $studentAnswer',
                            style: TextStyle(fontSize: 12, color: textSecondary, fontFamily: 'Cairo'),
                          ),
                        const SizedBox(height: 4),
                        Text(
                          'الإجابة النموذجية: ${q['correct_answer'] ?? ''}',
                          style: const TextStyle(fontSize: 12, color: primaryOlive, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                        ),
                        if ((q['explanation'] ?? '').toString().isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            'الشرح: ${q['explanation']}',
                            style: TextStyle(fontSize: 11.5, color: textSecondary, height: 1.5, fontFamily: 'Cairo'),
                          ),
                        ],
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 18),
              ],

              // Close button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryOlive,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('الرجوع للامتحانات والاختبارات', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13.5)),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLASHCARDS SCREEN (LEITNER SYSTEM)
// ═══════════════════════════════════════════════════════════════════════════════
class FlashcardsScreen extends StatefulWidget {
  final String websiteLink;

  const FlashcardsScreen({super.key, required this.websiteLink});

  @override
  State<FlashcardsScreen> createState() => _FlashcardsScreenState();
}

class _FlashcardsScreenState extends State<FlashcardsScreen> {
  List<dynamic> _decks = [];
  bool _loading = true;
  bool _generating = false;
  String? _authToken;
  String? _deviceId;
  String _gradeLevel = '3_high';

  // Subject Stack Review State
  String? _selectedSubjectName;
  List<dynamic> _subjectDecks = [];
  List<dynamic> _subjectCards = [];
  int _activeStackIndex = 0;
  bool _isCardFlipped = false;
  bool _isDealingAway = false;
  String _viewMode = 'grid'; // 'grid' | 'stack'
  final Set<String> _revealedCardIds = {};
  String? _selectedDeckFilter;

  void _advancePlayingCard([int? targetIndex]) {
    if (_isDealingAway) return;
    setState(() => _isDealingAway = true);
    Future.delayed(const Duration(milliseconds: 380), () {
      if (mounted) {
        setState(() {
          _isCardFlipped = false;
          if (targetIndex != null) {
            _activeStackIndex = targetIndex;
          } else {
            _activeStackIndex++;
          }
          _isDealingAway = false;
        });
      }
    });
  }

  String get _apiBase => resolveWebsiteLink(widget.websiteLink);

  Map<String, String> get _apiHeaders => {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
        if (_deviceId != null) 'x-device-id': _deviceId!,
      };

  @override
  void initState() {
    super.initState();
    _loadSettingsAndData();
  }

  Future<void> _loadSettingsAndData() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
    _deviceId = prefs.getString('device_id');
    _gradeLevel = prefs.getString('selected_grade') ?? '3_high';
    
    if (_authToken != null) {
      _fetchDecks();
    } else {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchDecks() async {
    setState(() => _loading = true);
    try {
      final res = await http.get(
        Uri.parse('$_apiBase/api/flashcards'),
        headers: _apiHeaders,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        if (data['success'] == true) {
          setState(() {
            _decks = data['decks'] ?? [];
          });
        }
      }
    } catch (e) {
      debugPrint('Fetch Decks error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchSubjectCards(String subjectName) async {
    setState(() => _loading = true);
    try {
      final res = await http.get(
        Uri.parse('$_apiBase/api/flashcards/subject?subject_name=${Uri.encodeComponent(subjectName)}'),
        headers: _apiHeaders,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        if (data['success'] == true) {
          setState(() {
            _selectedSubjectName = subjectName;
            _subjectDecks = data['decks'] ?? [];
            _subjectCards = data['cards'] ?? [];
            _activeStackIndex = 0;
            _isCardFlipped = false;
            _isDealingAway = false;
            _viewMode = 'grid';
            _revealedCardIds.clear();
            _selectedDeckFilter = null;
          });
        }
      }
    } catch (e) {
      debugPrint('Fetch Subject Cards error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _submitSubjectCardReview(String cardId, int rating) async {
    try {
      http.post(
        Uri.parse('$_apiBase/api/flashcards/review'),
        headers: _apiHeaders,
        body: jsonEncode({
          'card_id': cardId,
          'rating': rating,
        }),
      );
      _advancePlayingCard();
    } catch (e) {
      debugPrint('Review subject card error: $e');
    }
  }

  Future<void> _editCardDialog(Map card) async {
    final qCtrl = TextEditingController(text: card['question'] ?? '');
    final aCtrl = TextEditingController(text: card['answer'] ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: bgCard,
        title: const Text('تعديل الكارت', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: qCtrl,
              maxLines: 2,
              style: TextStyle(color: textPrimary, fontFamily: 'Cairo', fontSize: 13),
              decoration: const InputDecoration(labelText: 'السؤال', labelStyle: TextStyle(fontFamily: 'Cairo')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: aCtrl,
              maxLines: 2,
              style: TextStyle(color: textPrimary, fontFamily: 'Cairo', fontSize: 13),
              decoration: const InputDecoration(labelText: 'الإجابة', labelStyle: TextStyle(fontFamily: 'Cairo')),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo'))),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final res = await http.patch(
                Uri.parse('$_apiBase/api/flashcards/card'),
                headers: _apiHeaders,
                body: jsonEncode({'id': card['id'], 'question': qCtrl.text, 'answer': aCtrl.text}),
              );
              if (res.statusCode == 200) {
                if (_selectedSubjectName != null) _fetchSubjectCards(_selectedSubjectName!);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: primaryOlive),
            child: const Text('حفظ', style: TextStyle(fontFamily: 'Cairo', color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteCard(String cardId) async {
    try {
      final res = await http.delete(
        Uri.parse('$_apiBase/api/flashcards/card?id=$cardId'),
        headers: _apiHeaders,
      );
      if (res.statusCode == 200) {
        if (_selectedSubjectName != null) _fetchSubjectCards(_selectedSubjectName!);
      }
    } catch (e) {
      debugPrint('Delete card error: $e');
    }
  }

  Future<void> _generateDeck(String subject, String topic) async {
    setState(() => _generating = true);
    try {
      final res = await http.post(
        Uri.parse('$_apiBase/api/flashcards/generate'),
        headers: _apiHeaders,
        body: jsonEncode({
          'subject_name': subject,
          'grade_level': _gradeLevel,
          'topic': topic,
          'count': 5,
        }),
      );
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 && data['success'] == true) {
        _fetchDecks();
        if (_selectedSubjectName == subject) _fetchSubjectCards(subject);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'فشل توليد الكروت التعليمية', style: const TextStyle(fontFamily: 'Cairo'))),
          );
        }
      }
    } catch (e) {
      debugPrint('Generate deck error: $e');
    } finally {
      setState(() => _generating = false);
    }
  }

  void _showGenerateDialog() {
    String mode = 'ai';
    final topicCtrl = TextEditingController();
    final titleCtrl = TextEditingController();
    String selectedSubj = 'الفيزياء';
    List<Map<String, String>> manualCards = [{'question': '', 'answer': ''}];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          backgroundColor: bgCard,
          title: const Text('إنشاء كروت مراجعة جديدة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        label: const Center(child: Text('بالذكاء الاصطناعي', style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold))),
                        selected: mode == 'ai',
                        onSelected: (val) => setDlgState(() => mode = 'ai'),
                        selectedColor: primaryOlive,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ChoiceChip(
                        label: const Center(child: Text('كتابة يدوي', style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold))),
                        selected: mode == 'manual',
                        onSelected: (val) => setDlgState(() => mode = 'manual'),
                        selectedColor: primaryOlive,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (mode == 'ai') ...[
                  TextField(
                    controller: topicCtrl,
                    style: TextStyle(color: textPrimary, fontFamily: 'Cairo', fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'الموضوع (مثال: قوانين نيوتن، الباب الأول)...',
                      hintStyle: TextStyle(color: textMuted, fontFamily: 'Cairo', fontSize: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ] else ...[
                  TextField(
                    controller: titleCtrl,
                    style: TextStyle(color: textPrimary, fontFamily: 'Cairo', fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'عنوان مجموعة الكروت...',
                      hintStyle: TextStyle(color: textMuted, fontFamily: 'Cairo', fontSize: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...manualCards.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final card = entry.value;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: bgElevated, borderRadius: BorderRadius.circular(8)),
                      child: Column(
                        children: [
                          TextField(
                            onChanged: (val) => card['question'] = val,
                            style: TextStyle(color: textPrimary, fontFamily: 'Cairo', fontSize: 12),
                            decoration: InputDecoration(hintText: 'السؤال ${idx + 1}...', isDense: true),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            onChanged: (val) => card['answer'] = val,
                            style: TextStyle(color: textPrimary, fontFamily: 'Cairo', fontSize: 12),
                            decoration: InputDecoration(hintText: 'الإجابة ${idx + 1}...', isDense: true),
                          ),
                        ],
                      ),
                    );
                  }),
                  TextButton.icon(
                    onPressed: () => setDlgState(() => manualCards.add({'question': '', 'answer': ''})),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('إضافة كارت آخر', style: TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              child: Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: textSecondary)),
              onPressed: () => Navigator.pop(context),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: primaryOlive),
              child: const Text('إنشاء', style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.bold)),
              onPressed: () async {
                Navigator.pop(context);
                if (mode == 'ai') {
                  final topic = topicCtrl.text.trim();
                  if (topic.isNotEmpty) _generateDeck(selectedSubj, topic);
                } else {
                  final title = titleCtrl.text.trim();
                  final valid = manualCards.where((c) => c['question']!.trim().isNotEmpty && c['answer']!.trim().isNotEmpty).toList();
                  if (title.isNotEmpty && valid.isNotEmpty) {
                    await http.post(
                      Uri.parse('$_apiBase/api/flashcards'),
                      headers: _apiHeaders,
                      body: jsonEncode({
                        'subject_name': selectedSubj,
                        'grade_level': _gradeLevel,
                        'title': title,
                        'cards': valid,
                      }),
                    );
                    _fetchDecks();
                    if (_selectedSubjectName == selectedSubj) _fetchSubjectCards(selectedSubj);
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgSurface,
        appBar: AppBar(
          title: const Text('المدرب الذكي (Flashcards)', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
          backgroundColor: bgCard,
          elevation: 0,
          foregroundColor: primaryOlive,
          actions: [
            if (_selectedSubjectName == null)
              IconButton(
                icon: const Icon(Icons.add_circle_outline_rounded),
                onPressed: _generating ? null : _showGenerateDialog,
              ),
          ],
        ),
        body: _loading || _generating
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: primaryOlive),
                    const SizedBox(height: 16),
                    Text(
                      _generating ? 'جاري إنشاء كروت المراجعة الذكية...' : 'جاري التحميل...',
                      style: TextStyle(fontFamily: 'Cairo', color: textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              )
            : _authToken == null
                ? const Center(child: Text('يجب تسجيل الدخول لاستخدام الكروت التعليمية', style: TextStyle(fontFamily: 'Cairo')))
                : _selectedSubjectName != null
                    ? _buildSubjectStackReviewView()
                    : _buildSubjectGridView(),
      ),
    );
  }

  Widget _buildSubjectGridView() {
    if (_decks.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.psychology_rounded, size: 64, color: textMuted),
              const SizedBox(height: 16),
              const Text(
                'لا توجد مجموعات كروت تعليمية بعد',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Text(
                'اضغط على زر الإضافة لتوليد أو كتابة كروت مراجعة ذكية مخصصة!',
                style: TextStyle(fontFamily: 'Cairo', color: textSecondary, fontSize: 12.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _showGenerateDialog,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryOlive,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('إنشاء كروت جديدة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      );
    }

    final Map<String, Map<String, dynamic>> subjectGroups = {};
    for (var deck in _decks) {
      final sName = deck['subject_name']?.toString() ?? 'عام';
      if (!subjectGroups.containsKey(sName)) {
        subjectGroups[sName] = {
          'subject_name': sName,
          'decks': [],
          'total_count': 0,
          'due_count': 0,
        };
      }
      subjectGroups[sName]!['decks'].add(deck);
      subjectGroups[sName]!['total_count'] += (deck['total_count'] as num? ?? 0).toInt();
      subjectGroups[sName]!['due_count'] += (deck['due_count'] as num? ?? 0).toInt();
    }

    final groupList = subjectGroups.values.toList();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: groupList.length,
      itemBuilder: (context, idx) {
        final group = groupList[idx];
        final sName = group['subject_name'];
        final totalCount = group['total_count'];
        final dueCount = group['due_count'];
        final decksCount = (group['decks'] as List).length;

        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    sName,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: primaryOlive, fontFamily: 'Cairo'),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: primaryOlive.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$totalCount كارت',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryOlive, fontFamily: 'Cairo'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'محتوى $decksCount مجموعة كروت مجمعة',
                style: TextStyle(fontSize: 12, color: textSecondary, fontFamily: 'Cairo'),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'المستحق للمراجعة: $dueCount',
                    style: TextStyle(fontSize: 12, color: textSecondary, fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                  ),
                  ElevatedButton(
                    onPressed: () => _fetchSubjectCards(sName),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryOlive,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('مراجعة الكروت المتراكمة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSubjectStackReviewView() {
    if (_subjectCards.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.psychology_outlined, size: 48, color: textMuted),
              const SizedBox(height: 12),
              const Text('لا توجد كروت تعليمية في هذه المادة بعد.', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => setState(() => _selectedSubjectName = null),
                icon: const Icon(Icons.arrow_back_rounded, size: 18),
                label: const Text('العودة للمواد', style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: primaryOlive),
              ),
            ],
          ),
        ),
      );
    }

    final displayCards = _selectedDeckFilter == null
        ? _subjectCards
        : _subjectCards.where((c) => c['deck_id'] == _selectedDeckFilter || c['deck_title'] == _selectedDeckFilter).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Header Bar inside Subject
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: bgCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: borderSubtle),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back_rounded, color: primaryOlive),
                          onPressed: () => setState(() => _selectedSubjectName = null),
                          tooltip: 'العودة للمواد',
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedSubjectName ?? '',
                              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 16, color: primaryOlive),
                            ),
                            Text(
                              'إجمالي ${_subjectCards.length} كارت',
                              style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: textSecondary),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline_rounded, color: primaryOlive),
                      onPressed: _showGenerateDialog,
                      tooltip: 'إضافة كارت جديد',
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        avatar: Icon(Icons.grid_view_rounded, size: 16, color: _viewMode == 'grid' ? Colors.white : textSecondary),
                        label: const Center(child: Text('جميع الكروت', style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold))),
                        selected: _viewMode == 'grid',
                        onSelected: (val) => setState(() => _viewMode = 'grid'),
                        selectedColor: primaryOlive,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ChoiceChip(
                        avatar: Icon(Icons.style_rounded, size: 16, color: _viewMode == 'stack' ? Colors.white : textSecondary),
                        label: const Center(child: Text('مراجعة متتابعة', style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold))),
                        selected: _viewMode == 'stack',
                        onSelected: (val) => setState(() => _viewMode = 'stack'),
                        selectedColor: primaryOlive,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Deck Filters Row
          if (_subjectDecks.isNotEmpty) ...[
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: FilterChip(
                      label: Text('الكل (${_subjectCards.length})', style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold)),
                      selected: _selectedDeckFilter == null,
                      onSelected: (_) => setState(() => _selectedDeckFilter = null),
                      selectedColor: primaryOlive.withOpacity(0.25),
                    ),
                  ),
                  ..._subjectDecks.map((d) {
                    final dId = d['id'];
                    final isSel = _selectedDeckFilter == dId;
                    return Padding(
                      padding: const EdgeInsets.only(left: 6),
                      child: FilterChip(
                        label: Text(d['title'] ?? '', style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold)),
                        selected: isSel,
                        onSelected: (_) => setState(() => _selectedDeckFilter = isSel ? null : dId),
                        selectedColor: primaryOlive.withOpacity(0.25),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (displayCards.isEmpty) ...[
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              decoration: BoxDecoration(color: bgCard, borderRadius: BorderRadius.circular(16)),
              child: Text('لا توجد كروت تعليمية تعرض حسب هذا الفلتر.', style: TextStyle(fontFamily: 'Cairo', color: textMuted)),
            ),
          ] else if (_viewMode == 'grid') ...[
            // ALL CARDS LIST VIEW
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'عرض جميع الكروت (${displayCards.length} كارت):',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12.5, color: textSecondary),
                ),
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      final allRev = displayCards.every((c) => _revealedCardIds.contains(c['id']));
                      if (allRev) {
                        _revealedCardIds.clear();
                      } else {
                        for (var c in displayCards) {
                          _revealedCardIds.add(c['id'].toString());
                        }
                      }
                    });
                  },
                  icon: Icon(displayCards.every((c) => _revealedCardIds.contains(c['id'])) ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 16, color: primaryOlive),
                  label: Text(
                    displayCards.every((c) => _revealedCardIds.contains(c['id'])) ? 'إخفاء الكل' : 'عرض الكل',
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold, color: primaryOlive),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...displayCards.map((card) {
              final cId = card['id'].toString();
              final isRevealed = _revealedCardIds.contains(cId);
              final boxVal = (card['box'] as num? ?? 1).toInt();
              final boxLabel = boxVal == 1 ? 'مبتدئ' : boxVal == 2 ? 'متوسط' : 'متقدم';

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: bgCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isRevealed ? primaryOlive.withOpacity(0.4) : borderSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: bgElevated,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            card['deck_title'] ?? 'كارت مراجعة',
                            style: TextStyle(fontFamily: 'Cairo', fontSize: 10.5, color: textSecondary, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: boxVal == 1 ? Colors.orange.withOpacity(0.15) : primaryOlive.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'صندوق $boxVal ($boxLabel)',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: boxVal == 1 ? Colors.orange : primaryOlive,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: Icon(Icons.edit_outlined, size: 16, color: textMuted),
                              onPressed: () => _editCardDialog(card),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, size: 16, color: Colors.redAccent),
                              onPressed: () => _deleteCard(card['id']),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('السؤال:', style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold, color: primaryOlive)),
                    const SizedBox(height: 2),
                    Text(
                      card['question'] ?? '',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 13.5, fontWeight: FontWeight.bold, color: textPrimary),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          setState(() {
                            if (isRevealed) {
                              _revealedCardIds.remove(cId);
                            } else {
                              _revealedCardIds.add(cId);
                            }
                          });
                        },
                        icon: Icon(isRevealed ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 16, color: primaryOlive),
                        label: Text(
                          isRevealed ? 'إخفاء الإجابة' : 'عرض الإجابة',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold, color: primaryOlive),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: primaryOlive.withOpacity(0.3)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    if (isRevealed) ...[
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: primaryOlive.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: primaryOlive.withOpacity(0.25)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('الإجابة النموذجية:', style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold, color: Colors.greenAccent)),
                            const SizedBox(height: 4),
                            Text(
                              card['answer'] ?? '',
                              style: TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.bold, color: textPrimary),
                            ),
                            const SizedBox(height: 10),
                            Divider(color: borderSubtle, height: 1),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('تقييم الاستدعاء:', style: TextStyle(fontFamily: 'Cairo', fontSize: 10.5, color: textMuted)),
                                Row(
                                  children: [1, 2, 3, 4, 5].map((val) {
                                    return Padding(
                                      padding: const EdgeInsets.only(left: 4),
                                      child: InkWell(
                                        onTap: () => _submitSubjectCardReview(cId, val),
                                        borderRadius: BorderRadius.circular(6),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: bgElevated,
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: borderSubtle),
                                          ),
                                          child: Text(
                                            val.toString(),
                                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold, color: primaryOlive),
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }),
          ] else ...[
            // FOCUS STACK REVIEW MODE
            if (_activeStackIndex >= displayCards.length) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: bgCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderSubtle)),
                child: Column(
                  children: [
                    const Icon(Icons.emoji_events_rounded, size: 56, color: primaryOlive),
                    const SizedBox(height: 12),
                    Text(
                      'أحسنت! أتممت مراجعة كل كروت $_selectedSubjectName',
                      style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15, color: textPrimary),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => setState(() {
                        _activeStackIndex = 0;
                        _isCardFlipped = false;
                        _isDealingAway = false;
                      }),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('خلط وإعادة المراجعة', style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(backgroundColor: primaryOlive),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Controls row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_right_rounded, color: primaryOlive),
                    onPressed: (_activeStackIndex == 0 || _isDealingAway)
                        ? null
                        : () => setState(() {
                              _activeStackIndex--;
                              _isCardFlipped = false;
                            }),
                  ),
                  Text(
                    'الكارت ${_activeStackIndex + 1} من ${displayCards.length}',
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13, color: primaryOlive),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_left_rounded, color: primaryOlive),
                    onPressed: (_activeStackIndex >= displayCards.length - 1 || _isDealingAway)
                        ? null
                        : () => _advancePlayingCard(_activeStackIndex + 1),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Playing Cards Deck Presentation Stack
              Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  // Layered Backing 2
                  if (_activeStackIndex + 2 < displayCards.length)
                    Transform.translate(
                      offset: const Offset(0, 16),
                      child: Transform.rotate(
                        angle: 0.05,
                        child: Transform.scale(
                          scale: 0.92,
                          child: Container(
                            height: 260,
                            decoration: BoxDecoration(color: bgCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderSubtle)),
                          ),
                        ),
                      ),
                    ),
                  // Layered Backing 1
                  if (_activeStackIndex + 1 < displayCards.length)
                    Transform.translate(
                      offset: const Offset(0, 8),
                      child: Transform.rotate(
                        angle: -0.03,
                        child: Transform.scale(
                          scale: 0.96,
                          child: Container(
                            height: 265,
                            decoration: BoxDecoration(color: bgCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderSubtle)),
                          ),
                        ),
                      ),
                    ),

                  // Top Playing Card with Deal Animation
                  AnimatedSlide(
                    offset: _isDealingAway ? const Offset(-1.4, 0.2) : Offset.zero,
                    duration: const Duration(milliseconds: 380),
                    curve: Curves.easeOutCubic,
                    child: AnimatedRotation(
                      turns: _isDealingAway ? -0.08 : 0.0,
                      duration: const Duration(milliseconds: 380),
                      child: GestureDetector(
                        onTap: () {
                          if (_isDealingAway) return;
                          if (!_isCardFlipped) {
                            setState(() => _isCardFlipped = true);
                          } else {
                            _advancePlayingCard();
                          }
                        },
                        child: Stack(
                          children: [
                            FlipCardWidget(
                              isFlipped: _isCardFlipped,
                              front: _buildCardSide(
                                title: displayCards[_activeStackIndex]['deck_title'] ?? 'السؤال',
                                content: displayCards[_activeStackIndex]['question'] ?? '',
                                subText: 'اضغط لقلب الكارت ورؤية الإجابة',
                                color: primaryOlive.withOpacity(0.05),
                                textColor: textPrimary,
                              ),
                              back: _buildCardSide(
                                title: 'الإجابة النموذجية',
                                content: displayCards[_activeStackIndex]['answer'] ?? '',
                                subText: 'اضغط للتمرير للكارت التالي',
                                color: primaryOlive.withOpacity(0.12),
                                textColor: textPrimary,
                                borderColor: primaryOlive.withOpacity(0.4),
                              ),
                            ),
                            Positioned(
                              top: 12,
                              left: 12,
                              child: Row(
                                children: [
                                  IconButton(
                                    icon: Icon(Icons.edit_outlined, size: 18, color: textMuted),
                                    onPressed: () => _editCardDialog(displayCards[_activeStackIndex]),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.redAccent),
                                    onPressed: () => _deleteCard(displayCards[_activeStackIndex]['id']),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              if (_isCardFlipped)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: bgCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderSubtle),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'كيف كان استدعاؤك للمعلومة؟',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12.5, color: textSecondary),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildRatingButtonSubject(displayCards[_activeStackIndex]['id'].toString(), 1, 'صعب', Colors.red),
                          _buildRatingButtonSubject(displayCards[_activeStackIndex]['id'].toString(), 2, 'خاطئ', Colors.orange),
                          _buildRatingButtonSubject(displayCards[_activeStackIndex]['id'].toString(), 3, 'مقبول', Colors.yellow),
                          _buildRatingButtonSubject(displayCards[_activeStackIndex]['id'].toString(), 4, 'سهل', primaryOlive),
                          _buildRatingButtonSubject(displayCards[_activeStackIndex]['id'].toString(), 5, 'ممتاز', Colors.greenAccent),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildRatingButtonSubject(String cardId, int val, String label, Color color) {
    return InkWell(
      onTap: () => _submitSubjectCardReview(cardId, val),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(val.toString(), style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13, fontFamily: 'Cairo')),
            Text(label, style: TextStyle(fontSize: 10, color: color, fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildCardSide({
    required String title,
    required String content,
    required String subText,
    required Color color,
    required Color textColor,
    Color? borderColor,
  }) {
    return Container(
      width: double.infinity,
      height: 260,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor ?? borderSubtle, width: borderColor != null ? 2 : 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: primaryOlive, letterSpacing: 1.5, fontFamily: 'Cairo'),
          ),
          const Spacer(),
          Text(
            content,
            style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.bold, color: textColor, height: 1.6, fontFamily: 'Cairo'),
            textAlign: TextAlign.center,
          ),
          const Spacer(),
          Text(
            subText,
            style: TextStyle(fontSize: 10, color: textMuted, fontFamily: 'Cairo'),
          ),
        ],
      ),
    );
  }
}

class FlipCardWidget extends StatelessWidget {
  final Widget front;
  final Widget back;
  final bool isFlipped;

  const FlipCardWidget({
    super.key,
    required this.front,
    required this.back,
    required this.isFlipped,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 500),
      layoutBuilder: (currentChild, previousChildren) => Stack(
        children: <Widget>[
          if (currentChild != null) currentChild,
          ...previousChildren,
        ],
      ),
      transitionBuilder: (Widget child, Animation<double> animation) {
        final rotateAnim = Tween<double>(begin: pi, end: 0.0).animate(animation);
        return AnimatedBuilder(
          animation: rotateAnim,
          child: child,
          builder: (context, child) {
            final isBack = child!.key == const ValueKey('back');
            var tilt = 0.002;
            tilt = isBack ? -tilt : tilt;
            final rotation = isBack ? rotateAnim.value - pi : rotateAnim.value;
            return Transform(
              transform: Matrix4.rotationY(rotation)..setEntry(3, 0, tilt),
              alignment: Alignment.center,
              child: child,
            );
          },
        );
      },
      child: isFlipped
          ? SizedBox(key: const ValueKey('back'), child: back)
          : SizedBox(key: const ValueKey('front'), child: front),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD SCREEN (GAMIFICATION RANKINGS)
// ═══════════════════════════════════════════════════════════════════════════════
class LeaderboardScreen extends StatefulWidget {
  final String websiteLink;

  const LeaderboardScreen({super.key, required this.websiteLink});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  List<dynamic> _leaderboard = [];
  bool _loading = true;
  String? _authToken;
  String _filter = 'my';
  String? _currentUserId;

  String get _apiBase => resolveWebsiteLink(widget.websiteLink);

  @override
  void initState() {
    super.initState();
    _loadSettingsAndData();
  }

  Future<void> _loadSettingsAndData() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
    
    final userJson = prefs.getString('auth_user');
    if (userJson != null) {
      try {
        final user = jsonDecode(userJson);
        _currentUserId = user['id']?.toString();
      } catch (_) {}
    }

    if (_authToken != null) {
      _fetchLeaderboard();
    } else {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchLeaderboard() async {
    setState(() => _loading = true);
    try {
      final res = await http.get(
        Uri.parse('$_apiBase/api/leaderboard?grade_level=$_filter'),
        headers: {
          'Authorization': 'Bearer $_authToken',
        },
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        if (data['success'] == true) {
          setState(() {
            _leaderboard = data['leaderboard'] ?? [];
          });
        }
      }
    } catch (e) {
      debugPrint('Fetch Leaderboard error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgSurface,
        appBar: AppBar(
          title: const Text('لوحة المتصدرين', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
          backgroundColor: bgCard,
          elevation: 0,
          foregroundColor: primaryOlive,
        ),
        body: Column(
          children: [
            Container(
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 10),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderSubtle),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _filter = 'my';
                        });
                        _fetchLeaderboard();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _filter == 'my' ? primaryOlive : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Text(
                            'صفي الدراسي',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.bold,
                              fontSize: 12.5,
                              color: _filter == 'my' ? Colors.white : textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _filter = 'all';
                        });
                        _fetchLeaderboard();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _filter == 'all' ? primaryOlive : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Text(
                            'الترتيب العام',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.bold,
                              fontSize: 12.5,
                              color: _filter == 'all' ? Colors.white : textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: primaryOlive))
                  : _authToken == null
                      ? const Center(child: Text('يجب تسجيل الدخول لعرض لوحة المتصدرين', style: TextStyle(fontFamily: 'Cairo')))
                      : _leaderboard.isEmpty
                          ? const Center(child: Text('لا توجد بيانات ترتيب حالياً', style: TextStyle(fontFamily: 'Cairo')))
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _leaderboard.length,
                              itemBuilder: (context, idx) {
                                final row = _leaderboard[idx];
                                final rank = row['rank_number'] ?? (idx + 1);
                                final isCurrentUser = row['user_id']?.toString() == _currentUserId;

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: isCurrentUser ? primaryOlive.withOpacity(0.08) : bgCard,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: isCurrentUser ? primaryOlive : borderSubtle,
                                      width: isCurrentUser ? 1.5 : 1,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 32,
                                        height: 32,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: rank == 1
                                              ? const Color(0xFFFFD700)
                                              : rank == 2
                                                  ? const Color(0xFFC0C0C0)
                                                  : rank == 3
                                                      ? const Color(0xFFCD7F32)
                                                      : bgSurface,
                                          border: Border.all(color: borderSubtle),
                                        ),
                                        child: Center(
                                          child: Text(
                                            rank.toString(),
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                              color: rank <= 3 ? Colors.black : textSecondary,
                                              fontFamily: 'Cairo',
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  row['name'] ?? '',
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 13.5,
                                                    color: textPrimary,
                                                    fontFamily: 'Cairo',
                                                  ),
                                                ),
                                                if (isCurrentUser) ...[
                                                  const SizedBox(width: 6),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                    decoration: BoxDecoration(
                                                      color: primaryOlive.withOpacity(0.2),
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: const Text(
                                                      'أنت',
                                                      style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: primaryOlive, fontFamily: 'Cairo'),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.monetization_on_rounded, size: 14, color: Color(0xFFFFD700)),
                                              const SizedBox(width: 3),
                                              Text(
                                                (double.tryParse(row['coins']?.toString() ?? '0') ?? 0.0).toInt().toString(),
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFFFD700), fontFamily: 'Cairo'),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.local_fire_department_rounded, size: 14, color: Colors.orange),
                                              const SizedBox(width: 3),
                                              Text(
                                                '${row['study_streak'] ?? 1} يوم',
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.orange, fontFamily: 'Cairo'),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}


