import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../constants/api_constants.dart';

/// Handles secure token storage and Hive-based local caching for offline support
class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  final _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // ── Token & User ──────────────────────────────────────────────────────────

  Future<void> saveToken(String token) =>
      _secureStorage.write(key: StorageKeys.authToken, value: token);

  Future<String?> getToken() =>
      _secureStorage.read(key: StorageKeys.authToken);

  Future<void> saveUser(Map<String, dynamic> user) =>
      _secureStorage.write(key: StorageKeys.userData, value: jsonEncode(user));

  Future<Map<String, dynamic>?> getUser() async {
    final data = await _secureStorage.read(key: StorageKeys.userData);
    if (data == null) return null;
    return jsonDecode(data) as Map<String, dynamic>;
  }

  Future<void> clearAuth() async {
    await _secureStorage.delete(key: StorageKeys.authToken);
    await _secureStorage.delete(key: StorageKeys.userData);
    await _secureStorage.delete(key: StorageKeys.clinicData);
  }

  // ── Hive Caching (Offline data) ───────────────────────────────────────────

  static Future<void> initHive() async {
    await Hive.initFlutter();
  }

  Future<void> cacheData(String key, dynamic data) async {
    final box = await Hive.openBox('vetpet_cache');
    await box.put(key, jsonEncode(data));
    // Store cache timestamp
    await box.put('${key}_ts', DateTime.now().millisecondsSinceEpoch);
  }

  Future<dynamic> getCachedData(String key, {int maxAgeMinutes = 30}) async {
    try {
      final box = await Hive.openBox('vetpet_cache');
      final ts = box.get('${key}_ts') as int?;
      if (ts == null) return null;

      final age = DateTime.now().millisecondsSinceEpoch - ts;
      if (age > maxAgeMinutes * 60 * 1000) return null; // Cache expired

      final data = box.get(key);
      if (data == null) return null;
      return jsonDecode(data as String);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearCache() async {
    final box = await Hive.openBox('vetpet_cache');
    await box.clear();
  }
}
