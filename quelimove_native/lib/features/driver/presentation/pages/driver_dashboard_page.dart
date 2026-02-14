import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import '../../auth/presentation/providers/auth_provider.dart';

class DriverDashboardPage extends ConsumerStatefulWidget {
  const DriverDashboardPage({super.key});

  @override
  ConsumerState<DriverDashboardPage> createState() => _DriverDashboardPageState();
}

class _DriverDashboardPageState extends ConsumerState<DriverDashboardPage> {
  bool _isOnline = false;
  GoogleMapController? _mapController;
  
  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(-17.8833, 36.8833),
    zoom: 15,
  );

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  Future<void> _checkStatus() async {
     // Check validation status or saved online state
  }

  StreamSubscription? _rideSubscription;
  List<Map<String, dynamic>> _pendingRides = [];

  @override
  void dispose() {
    _rideSubscription?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  void _startLocationUpdates() {
      // Simulate location updates every 10s
      // In real app, use geolocator stream
  }

  void _listenToRides() {
    _rideSubscription?.cancel();
    _rideSubscription = ref.read(supabaseServiceProvider).client
        .from('rides')
        .stream(primaryKey: ['id'])
        .eq('status', 'pending')
        .listen((rides) {
          if (mounted) {
            setState(() {
              _pendingRides = rides;
            });
            if (_pendingRides.isNotEmpty) {
              _showRideRequestDialog(_pendingRides.first);
            }
          }
        });
  }

  void _stopListeningToRides() {
    _rideSubscription?.cancel();
    if (mounted) {
      setState(() => _pendingRides = []);
    }
  }

  Future<void> _toggleOnline() async {
    setState(() => _isOnline = !_isOnline);
    
    final user = ref.read(supabaseServiceProvider).currentUser;
    if (user != null) {
      await ref.read(supabaseServiceProvider).client.from('profiles').update({
        'is_available': _isOnline,
        'status': _isOnline ? 'active' : 'inactive',
      }).eq('id', user.id);
      
      if (_isOnline) {
        _startLocationUpdates();
        _listenToRides();
      } else {
        _stopListeningToRides();
      }
    }
  }

  Future<void> _acceptRide(String rideId) async {
    final user = ref.read(supabaseServiceProvider).currentUser;
    if (user == null) return;
    
    try {
      await ref.read(supabaseServiceProvider).client.from('rides').update({
        'status': 'accepted',
        'driver_id': user.id,
      }).eq('id', rideId);
      
      if (mounted) {
        Navigator.pop(context); // Close dialog
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Corrida aceita!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao aceitar: $e')),
        );
      }
    }
  }

  void _showRideRequestDialog(Map<String, dynamic> ride) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Nova Solicitação'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Passageiro'),
              subtitle: const Text('Calculando distância...'),
            ),
            ListTile(
              leading: const Icon(Icons.my_location),
              title: const Text('Origem'),
              subtitle: Text(ride['pickup_location'] ?? 'Desconhecido'),
            ),
            ListTile(
              leading: const Icon(Icons.location_on),
              title: const Text('Destino'),
              subtitle: Text(ride['destination_location'] ?? 'Desconhecido'),
            ),
             Text(
              '${ride['vehicle_type']?.toString().toUpperCase()}',
              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFBBF24)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Recusar', style: TextStyle(color: Colors.red)),
          ),
          ElevatedButton(
            onPressed: () => _acceptRide(ride['id']),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Aceitar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white, 
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: _initialPosition,
            onMapCreated: (controller) {
              _mapController = controller;
              _mapController?.setMapStyle(_mapStyle);
            },
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: false,
          ),
          
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isOnline ? Colors.green : Colors.red,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _isOnline ? 'ONLINE' : 'OFFLINE',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black87),
                        ),
                      ],
                    ),
                  ),
                  _CircularActionButton(
                    icon: Icons.person_outline,
                    onTap: () => context.push('/profile'),
                  ),
                ],
              ),
            ),
          ),
          
          Align(
            alignment: Alignment.bottomCenter,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: _toggleOnline, // Updated to use method
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: _isOnline ? Colors.black : const Color(0xFFFBBF24),
                      borderRadius: BorderRadius.circular(40),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 15)],
                    ),
                    child: Text(
                      _isOnline ? 'SAIR DE SERVIÇO' : 'FICAR ONLINE',
                      style: TextStyle(
                        color: _isOnline ? Colors.white : Colors.black,
                        fontWeight: FontWeight.black,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ),
                
                Container(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 40),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
                    boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20, spreadRadius: 0)],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _StatCard(label: 'Viagens', value: '0', icon: Icons.map),
                          _StatCard(label: 'Ganhos', value: '0 MT', icon: Icons.payments, isPrimary: true),
                          _StatCard(label: 'Nota', value: '5.0', icon: Icons.star),
                        ],
                      ),
                      if (_isOnline) ...[
                        const SizedBox(height: 24),
                        const Divider(color: Colors.black12),
                        const SizedBox(height: 16),
                         Row(
                          children: [
                            const Icon(Icons.radar, color: Color(0xFFFBBF24), size: 20),
                            const SizedBox(width: 12),
                            const Text(
                              'Procurando viagens próximas...',
                              style: TextStyle(color: Colors.black54, fontStyle: FontStyle.italic),
                            ),
                            const Spacer(),
                            const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black)),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static const String _mapStyle = '''
[
  {
    "elementType": "geometry",
    "stylers": [{"color": "#f5f5f5"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#616161"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#f5f5f5"}]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#bdbdbd"}]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{"color": "#eeeeee"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#c9c9c9"}]
  }
]
''';
}

class _CircularActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircularActionButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
        ),
        child: Icon(icon, color: Colors.black87, size: 20),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool isPrimary;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isPrimary ? const Color(0xFFFBBF24).withOpacity(0.1) : Colors.grey.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(icon, color: isPrimary ? const Color(0xFFFBBF24) : Colors.black45, size: 24),
        ),
        const SizedBox(height: 12),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.black,
            color: isPrimary ? const Color(0xFFFBBF24) : Colors.black87,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(color: Colors.black38, fontSize: 11),
        ),
      ],
    );
  }
}
