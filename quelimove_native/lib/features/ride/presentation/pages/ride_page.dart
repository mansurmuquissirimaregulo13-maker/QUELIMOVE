import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../providers/ride_provider.dart';

class RidePage extends ConsumerStatefulWidget {
  const RidePage({super.key});

  @override
  ConsumerState<RidePage> createState() => _RidePageState();
}

class _RidePageState extends ConsumerState<RidePage> {
  GoogleMapController? _controller;
  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(-17.8833, 36.8833), // Quelimane
    zoom: 14,
  );

  @override
  Widget build(BuildContext context) {
    final rideState = ref.watch(rideProvider);

    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: _initialPosition,
            onMapCreated: (controller) {
              _controller = controller;
              _controller?.setMapStyle(_darkMapStyle);
            },
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapStyle: _darkMapStyle, // Needs to be loaded from assets
          ),
          
          // Floating Search Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _SearchCard(
                    icon: Icons.my_location,
                    label: rideState.pickup ?? 'Local de partida',
                    onTap: () {}, // Open search modal
                  ),
                  const SizedBox(height: 8),
                  _SearchCard(
                    icon: Icons.location_on,
                    label: rideState.destination ?? 'Para onde vamos?',
                    onTap: () {}, // Open search modal
                  ),
                ],
              ),
            ),
          ),
          
          // Bottom Sheet for Vehicle Selection
          Align(
            alignment: Alignment.bottomCenter,
            child: _VehicleSelectionSheet(
              onSelected: (type) => ref.read(rideProvider.notifier).setVehicleType(type),
              selectedType: rideState.vehicleType,
              onRequest: () => ref.read(rideProvider.notifier).requestRide(),
              isLoading: rideState.isLoading,
            ),
          ),
        ],
      ),
    );
  }

  static const String _darkMapStyle = '''
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
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#64779e"}]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#4b6878"}]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#334e87"}]
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
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#6f9ba5"}]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#1d2c4d"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#023e58"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#3C7680"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#304a7d"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#98a5be"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#1d2c4d"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{"color": "#2c6675"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#255763"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#b0d5ce"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#023e58"}]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#98a5be"}]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#1d2c4d"}]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#283d6a"}]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [{"color": "#3a4762"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#0e1626"}]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#4e6d70"}]
  }
]
''';
}

class _SearchCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SearchCard({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10)],
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFFFBBF24)),
            const SizedBox(width: 12),
            Text(label, style: const TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }
}

class _VehicleSelectionSheet extends StatelessWidget {
  final Function(String) onSelected;
  final String? selectedType;
  final VoidCallback onRequest;
  final bool isLoading;

  const _VehicleSelectionSheet({
    required this.onSelected,
    this.selectedType,
    required this.onRequest,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Escolha sua viagem', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _VehicleOption(
                type: 'mota',
                label: 'Moto',
                icon: Icons.motorcycle,
                isSelected: selectedType == 'mota',
                onTap: () => onSelected('mota'),
              ),
              _VehicleOption(
                type: 'txopela',
                label: 'Txopela',
                icon: Icons.electric_rickshaw,
                isSelected: selectedType == 'txopela',
                onTap: () => onSelected('txopela'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: selectedType == null || isLoading ? null : onRequest,
              child: isLoading 
                ? const CircularProgressIndicator(color: Colors.black)
                : const Text('Confirmar Pedido', style: TextStyle(fontSize: 18)),
            ),
          ),
        ],
      ),
    );
  }
}

class _VehicleOption extends StatelessWidget {
  final String type;
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _VehicleOption({
    required this.type,
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFFFBBF24) : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(20),
              border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
            ),
            child: Icon(icon, size: 40, color: isSelected ? Colors.black : Colors.white),
          ),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}
