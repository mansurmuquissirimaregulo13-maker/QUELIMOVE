import 'package:flutter/material.dart';

class DriverRegistrationPage extends StatefulWidget {
  const DriverRegistrationPage({super.key});

  @override
  State<DriverRegistrationPage> createState() => _DriverRegistrationPageState();
}

class _DriverRegistrationPageState extends State<DriverRegistrationPage> {
  int _currentStep = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Cadastro de Motorista'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(primary: Color(0xFFFBBF24)),
        ),
        child: Stepper(
          type: StepperType.vertical,
          currentStep: _currentStep,
          onStepContinue: () {
            if (_currentStep < 2) {
              setState(() => _currentStep++);
            } else {
              // Finalizar cadastro
              Navigator.pop(context);
            }
          },
          onStepCancel: () {
            if (_currentStep > 0) {
              setState(() => _currentStep--);
            }
          },
          steps: [
            Step(
              title: const Text('Dados Pessoais'),
              content: Column(
                children: [
                  _RegField(label: 'Nome Completo', icon: Icons.person),
                  const SizedBox(height: 16),
                  _RegField(label: 'Telefone', icon: Icons.phone, keyboardType: TextInputType.phone),
                ],
              ),
              isActive: _currentStep >= 0,
            ),
            Step(
              title: const Text('Veículo'),
              content: Column(
                children: [
                  _RegField(label: 'Tipo de Veículo (Mota/Txopela)', icon: Icons.motorcycle),
                  const SizedBox(height: 16),
                  _RegField(label: 'Matrícula', icon: Icons.pin),
                ],
              ),
              isActive: _currentStep >= 1,
            ),
            Step(
              title: const Text('Documentação'),
              content: Column(
                children: [
                  _UploadCard(label: 'Carta de Condução', icon: Icons.contact_mail),
                  const SizedBox(height: 12),
                  _UploadCard(label: 'Documentos da Mota', icon: Icons.description),
                ],
              ),
              isActive: _currentStep >= 2,
            ),
          ],
        ),
      ),
    );
  }
}

class _RegField extends StatelessWidget {
  final String label;
  final IconData icon;
  final TextInputType? keyboardType;

  const _RegField({required this.label, required this.icon, this.keyboardType});

  @override
  Widget build(BuildContext context) {
    return TextField(
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: const Color(0xFFFBBF24)),
        filled: true,
        fillColor: const Color(0xFF1E293B),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      ),
    );
  }
}

class _UploadCard extends StatelessWidget {
  final String label;
  final IconData icon;

  const _UploadCard({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white54),
          const SizedBox(width: 16),
          Expanded(child: Text(label, style: const TextStyle(color: Colors.white70))),
          const Icon(Icons.cloud_upload, color: Color(0xFFFBBF24)),
        ],
      ),
    );
  }
}
