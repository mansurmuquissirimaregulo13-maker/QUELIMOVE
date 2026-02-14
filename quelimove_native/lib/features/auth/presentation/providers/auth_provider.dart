import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../services/supabase_service.dart';

// Create a provider for the SupabaseService
final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService();
});

final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<Session?>>((ref) {
  return AuthNotifier(ref.watch(supabaseServiceProvider));
});

class AuthNotifier extends StateNotifier<AsyncValue<Session?>> {
  final SupabaseService _supabaseService;

  AuthNotifier(this._supabaseService) : super(const AsyncValue.loading()) {
    _init();
  }

  Future<void> _init() async {
    final session = _supabaseService.client.auth.currentSession;
    state = AsyncValue.data(session);

    _supabaseService.client.auth.onAuthStateChange.listen((data) {
      if (mounted) {
         state = AsyncValue.data(data.session);
      }
    });
  }

  Future<void> signInWithPhone(String phone) async {
    state = const AsyncValue.loading();
    try {
      await _supabaseService.signInWithPhone(phone);
      // We don't change state to data here because we are still waiting for OTP
      // But we could set a "waiting for OTP" state if we had a more complex state object
      // For now, loading -> data(null) (still not signed in) is okay, or just keep previous state
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> verifyOTP(String phone, String token) async {
    state = const AsyncValue.loading();
    try {
      await _supabaseService.verifyOTP(phone, token);
      // State updated via onAuthStateChange listener
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> signOut() async {
    await _supabaseService.signOut();
  }
}
