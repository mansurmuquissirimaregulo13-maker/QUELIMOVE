import 'package:flutter/material.dart';

class AdminDashboardPage extends StatelessWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin QUELIMOVE')),
      body: GridView.count(
        padding: const EdgeInsets.all(24),
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        children: [
          _AdminCard(title: 'Motoristas', icon: Icons.motorcycle, count: '48', color: Colors.blue),
          _AdminCard(title: 'Viagens Hoje', icon: Icons.map, count: '124', color: Colors.green),
          _AdminCard(title: 'Novos Pedidos', icon: Icons.pending_actions, count: '3', color: Colors.orange),
          _AdminCard(title: 'Ganhos Mes', icon: Icons.payments, count: '12.5k', color: Colors.yellow),
        ],
      ),
    );
  }
}

class _AdminCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final String count;
  final Color color;

  const _AdminCard({required this.title, required this.icon, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 40, color: color),
          const SizedBox(height: 12),
          Text(count, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          Text(title, textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
        ],
      ),
    );
  }
}
