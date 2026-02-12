import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DriverDashboardPage extends StatefulWidget {
  const DriverDashboardPage({super.key});

  @override
  State<DriverDashboardPage> createState() => _DriverDashboardPageState();
}

class _DriverDashboardPageState extends State<DriverDashboardPage> {
  bool _isOnline = false;
  GoogleMapController? _mapController;
  
  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(-17.8833, 36.8833),
    zoom: 15,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // Mapa com estilo Midnight
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
          
          // Header Flutuante
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10)],
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
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  _CircularActionButton(
                    icon: Icons.menu,
                    onTap: () => Scaffold.of(context).openDrawer(),
                  ),
                ],
              ),
            ),
          ),
          
          // Painel Inferior de Estatísticas
          Align(
            alignment: Alignment.bottomCenter,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Interruptor principal
                GestureDetector(
                  onTap: () => setState(() => _isOnline = !_isOnline),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: _isOnline ? Colors.red.withOpacity(0.9) : const Color(0xFFFBBF24),
                      borderRadius: BorderRadius.circular(40),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 15)],
                    ),
                    child: Text(
                      _isOnline ? 'FICAR OFFLINE' : 'FICAR ONLINE',
                      style: TextStyle(
                        color: _isOnline ? Colors.white : Colors.black,
                        fontWeight: FontWeight.black,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ),
                
                // Cards de Estatísticas
                Container(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 40),
                  decoration: const BoxDecoration(
                    color: Color(0xFF1E293B),
                    borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _StatCard(label: 'Viagens', value: '14', icon: Icons.map),
                          _StatCard(label: 'Ganhos', value: '850 MT', icon: Icons.payments, isPrimary: true),
                          _StatCard(label: 'Nota', value: '4.9', icon: Icons.star),
                        ],
                      ),
                      if (_isOnline) ...[
                        const SizedBox(height: 24),
                        const Divider(color: Colors.white10),
                        const SizedBox(height: 16),
                        const Row(
                          children: [
                            Icon(Icons.radar, color: Color(0xFFFBBF24), size: 20),
                            SizedBox(width: 12),
                            Text(
                              'Procurando viagens próximas...',
                              style: TextStyle(color: Colors.white70, fontStyle: FontStyle.italic),
                            ),
                            Spacer(),
                            SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 2)),
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
    "stylers": [{"color": "#1d2c4d"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#8ec3b9"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#1a3646"}]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#4b6878"}]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{"color": "#023e58"}]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{"color": "#283d6a"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#304a7d"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#0e1626"}]
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
          color: const Color(0xFF1E293B),
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10)],
        ),
        child: Icon(icon, color: Colors.white, size: 20),
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
            color: isPrimary ? const Color(0xFFFBBF24).withOpacity(0.1) : Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(icon, color: isPrimary ? const Color(0xFFFBBF24) : Colors.white60, size: 24),
        ),
        const SizedBox(height: 12),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.black,
            color: isPrimary ? const Color(0xFFFBBF24) : Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 11),
        ),
      ],
    );
  }
}
