import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Decorativo
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFBBF24).withOpacity(0.05),
              ),
            ),
          ),
          
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header com troca de modo
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'QUELIMOVE',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.black,
                          letterSpacing: 1,
                          color: Color(0xFFFBBF24),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => context.push('/driver-dash'),
                        icon: const Icon(Icons.motorcycle, size: 18, color: Colors.white70),
                        label: const Text('Modo Motorista', style: TextStyle(color: Colors.white70)),
                        style: TextButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.05),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const Spacer(),
                
                // Conteúdo Principal
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Olá, Viajante!',
                        style: TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.black,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Seu transporte rápido\ne seguro em Quelimane.',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.white.withOpacity(0.6),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 48),
                      
                      // Botão Central de Pedido
                      SizedBox(
                        width: double.infinity,
                        height: 64,
                        child: ElevatedButton(
                          onPressed: () => context.push('/ride'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFBBF24),
                            foregroundColor: Colors.black,
                            elevation: 8,
                            shadowColor: const Color(0xFFFBBF24).withOpacity(0.4),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'PEDIR UMA MOTO',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.black),
                              ),
                              SizedBox(width: 12),
                              Icon(Icons.arrow_forward_ios, size: 18),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
                
                // Footer
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _FooterLink(label: 'Admin', onTap: () => context.push('/admin')),
                      const _FooterDivider(),
                      _FooterLink(label: 'Suporte', onTap: () => context.push('/contact')),
                      const _FooterDivider(),
                      _FooterLink(label: 'Perfil', onTap: () => context.push('/profile')),
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
}

class _FooterLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _FooterLink({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Text(
        label,
        style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
      ),
    );
  }
}

class _FooterDivider extends StatelessWidget {
  const _FooterDivider();
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Text('|', style: TextStyle(color: Colors.white.withOpacity(0.1))),
    );
  }
}
