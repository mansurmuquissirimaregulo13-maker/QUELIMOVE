import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  final _client = Supabase.instance.client;

  SupabaseClient get client => _client;

  // Auth Methods
  Future<void> signInWithPhone(String phone) async {
    try {
      await _client.auth.signInWithOtp(
        phone: phone,
        channel: OtpChannel.whatsapp,
      );
    } on AuthException catch (e) {
      if (e.message.contains('Unsupported phone provider')) {
         // Fallback to SMS if WhatsApp is not configured
         await _client.auth.signInWithOtp(
           phone: phone,
           channel: OtpChannel.sms,
         );
      } else {
        rethrow;
      }
    }
  }

  Future<AuthResponse> verifyOTP(String phone, String token) async {
    return await _client.auth.verifyOTP(
      phone: phone,
      token: token,
      type: OtpType.sms,
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  // Example: Get current user
  User? get currentUser => _client.auth.currentUser;

  // User Profile Methods
  Future<Map<String, dynamic>?> getProfile(String userId) async {
    return await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
  }

  Future<void> createProfile({
    required String id,
    required String phone,
    required String role,
    String? fullName,
  }) async {
    await _client.from('profiles').insert({
      'id': id,
      'phone_number': phone,
      'role': role,
      'full_name': fullName ?? 'Novo Usuário',
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<String?> checkUserStatus(String userId) async {
    final response = await _client
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .maybeSingle();
    return response?['status'] as String?;
  }
  Stream<List<Map<String, dynamic>>> subscribeToRides() {
    return _client
        .from('rides')
        .stream(primaryKey: ['id'])
        .order('created_at');
  }

  // Example: Update driver location
  Future<void> updateDriverLocation(String driverId, double lat, double lng) async {
    await _client.from('profiles').update({
      'current_lat': lat,
      'current_lng': lng,
      'last_online': DateTime.now().toIso8601String(),
    }).eq('id', driverId);
  }
}
