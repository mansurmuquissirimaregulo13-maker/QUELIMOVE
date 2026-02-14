import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';
import '../../../../services/supabase_service.dart';
import '../providers/auth_provider.dart';

class OtpPage extends ConsumerStatefulWidget {
  final String phone;
  final String? role;

  const OtpPage({super.key, required this.phone, this.role});

  @override
  ConsumerState<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends ConsumerState<OtpPage> {
  final _otpController = TextEditingController();

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verifyOtp(String pin) async {
    // 1. Verify OTP
    await ref.read(authProvider.notifier).verifyOTP(widget.phone, pin);
    
    if (!mounted) return;
    
    final authState = ref.read(authProvider);
    if (authState.hasError) {
       ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(content: Text('Erro ao verificar código: ${authState.error}')),
       );
       return;
    }

    // 2. Check/Create Profile
    try {
      final user = ref.read(supabaseServiceProvider).currentUser;
      if (user != null) {
        final service = ref.read(supabaseServiceProvider);
        final profile = await service.getProfile(user.id);
        
        if (profile == null && widget.role != null) {
          await service.createProfile(
            id: user.id,
            phone: widget.phone,
            role: widget.role!,
          );
        }

        // Check for pending status for drivers
        if (profile != null && profile['role'] == 'driver' && profile['status'] == 'pending') {
             if (mounted) context.go('/pending-approval');
             return;
        }
      }
      
      if (mounted) {
        context.go('/'); 
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao criar perfil: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.isLoading;

    final defaultPinTheme = PinTheme(
      width: 56,
      height: 56,
      textStyle: const TextStyle(
        fontSize: 20,
        color: Colors.white,
        fontWeight: FontWeight.w600,
      ),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white24),
        borderRadius: BorderRadius.circular(16),
      ),
    );

    final focusedPinTheme = defaultPinTheme.copyDecorationWith(
      border: Border.all(color: const Color(0xFFFBBF24)),
      borderRadius: BorderRadius.circular(16),
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: BackButton(color: Colors.white),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Text(
              'Verificação',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Enviamos um código para ${widget.phone}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 48),
            Pinput(
              length: 6,
              controller: _otpController,
              defaultPinTheme: defaultPinTheme,
              focusedPinTheme: focusedPinTheme,
              onCompleted: _verifyOtp,
              enabled: !isLoading,
            ),
            const SizedBox(height: 32),
            if (isLoading)
              const CircularProgressIndicator(color: Color(0xFFFBBF24)),
          ],
        ),
      ),
    );
  }
}
