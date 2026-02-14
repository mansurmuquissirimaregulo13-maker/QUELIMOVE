import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/supabase_service.dart';

class RideState {
  final bool isLoading;
  final String? error;
  final String? pickup;
  final String? destination;
  final String? vehicleType;

  RideState({
    this.isLoading = false,
    this.error,
    this.pickup,
    this.destination,
    this.vehicleType,
  });

  RideState copyWith({
    bool? isLoading,
    String? error,
    String? pickup,
    String? destination,
    String? vehicleType,
  }) {
    return RideState(
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      pickup: pickup ?? this.pickup,
      destination: destination ?? this.destination,
      vehicleType: vehicleType ?? this.vehicleType,
    );
  }
}

class RideNotifier extends StateNotifier<RideState> {
  final SupabaseService _supabaseService;

  RideNotifier(this._supabaseService) : super(RideState());

  void setPickup(String pickup) => state = state.copyWith(pickup: pickup);
  void setDestination(String destination) => state = state.copyWith(destination: destination);
  void setVehicleType(String type) => state = state.copyWith(vehicleType: type);

  Future<void> requestRide() async {
    if (state.pickup == null || state.destination == null || state.vehicleType == null) {
      state = state.copyWith(error: 'Preencha todos os campos');
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = _supabaseService.currentUser;
      if (user == null) throw Exception('Usuário não autenticado');

      await _supabaseService.client.from('rides').insert({
        'user_id': user.id,
        'pickup_location': state.pickup, // In real app, this should be JSON or separate lat/lng columns
        'destination_location': state.destination,
        'vehicle_type': state.vehicleType,
        'status': 'pending',
        'created_at': DateTime.now().toIso8601String(),
         // Add lat/lng fields if your schema supports them, e.g.
         // 'pickup_lat': ..., 'pickup_lng': ...
      });

      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final supabaseServiceProvider = Provider((ref) => SupabaseService());

final rideProvider = StateNotifierProvider<RideNotifier, RideState>((ref) {
  final service = ref.watch(supabaseServiceProvider);
  return RideNotifier(service);
});
