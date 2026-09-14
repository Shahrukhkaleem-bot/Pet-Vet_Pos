import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vetpet_mobile/core/network/api_client.dart';
import 'package:vetpet_mobile/core/storage/storage_service.dart';
import 'package:vetpet_mobile/core/constants/api_constants.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final Map<String, dynamic>? user;
  final String? error;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.error,
  });

  AuthState copyWith({bool? isLoading, bool? isAuthenticated, Map<String, dynamic>? user, String? error}) => AuthState(
    isLoading: isLoading ?? this.isLoading,
    isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    user: user ?? this.user,
    error: error,
  );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final _api = ApiClient();
  final _storage = StorageService();

  AuthNotifier() : super(const AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await _storage.getToken();
    final user = await _storage.getUser();
    if (token != null && user != null) {
      state = state.copyWith(isAuthenticated: true, user: user);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _api.post(ApiConstants.login, data: {
        'email': email,
        'password': password,
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final token = data['token'] as String;
        final user = data['user'] as Map<String, dynamic>;

        await _storage.saveToken(token);
        await _storage.saveUser(user);

        state = state.copyWith(isLoading: false, isAuthenticated: true, user: user);
        return true;
      }

      state = state.copyWith(isLoading: false, error: response.data['message'] ?? 'Login failed.');
      return false;
    } catch (e) {
      String msg = 'Connection failed. Check your network.';
      if (e.toString().contains('401')) msg = 'Invalid email or password.';
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.clearAuth();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());
