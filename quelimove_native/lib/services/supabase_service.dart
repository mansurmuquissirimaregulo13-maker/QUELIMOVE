import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  final _client = Supabase.instance.client;

  // Example: Get current user
  User? get currentUser => _client.auth.currentUser;

  // Example: Listen to ride requests
  Stream<List<Map<String, dynamic>>> subscribeToRides() {
    return _client
        .from('rides')
        .stream(primaryKey: ['id'])
        .order('created_at');
  }

  // Example: Update driver location
  Future<void> updateDriverLocation(String driverId, double lat, double lng) async {
    await _client.from('drivers').update({
      'last_lat': lat,
      'last_lng': lng,
      'last_update': DateTime.now().toIso8601String(),
    }).eq('id', driverId);
  }
}
