// VetPet PK API Constants
class ApiConstants {
  static const String baseUrl = 'http://10.0.2.2:5000/api/v1'; // Android emulator localhost
  // For physical device: replace with your actual server IP, e.g. 'http://192.168.1.100:5000/api/v1'

  // Auth
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String logout = '/auth/logout';

  // Dashboard
  static const String dashboard = '/dashboard';

  // Queue
  static const String queue = '/queue/today';
  static const String callNext = '/queue/call-next';

  // Owners
  static const String owners = '/owners';

  // Pets
  static const String pets = '/pets';

  // Appointments
  static const String appointments = '/appointments';

  // Consultations
  static const String consultations = '/consultations';

  // Vaccinations
  static const String vaccinations = '/vaccinations';

  // Medicines
  static const String medicines = '/medicines';
  static const String medicineAlerts = '/medicines/alerts';

  // Invoices
  static const String invoices = '/invoices';
}

class StorageKeys {
  static const String authToken = 'vetpet_token';
  static const String userData = 'vetpet_user';
  static const String clinicData = 'vetpet_clinic';
  static const String todayQueue = 'cache_today_queue';
  static const String recentPets = 'cache_recent_pets';
}

class AppColors {
  static const primaryTeal = 0xFF0D9488;
  static const primaryTealLight = 0xFFCCFBF1;
  static const darkSlate = 0xFF0F172A;
  static const slate700 = 0xFF334155;
  static const slate500 = 0xFF64748B;
  static const slate200 = 0xFFE2E8F0;
  static const slate100 = 0xFFF1F5F9;
  static const amber = 0xFFD97706;
  static const rose = 0xFFE11D48;
  static const green = 0xFF16A34A;
}
