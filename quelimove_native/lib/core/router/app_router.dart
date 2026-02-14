import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';

import '../../features/home/presentation/pages/home_page.dart';
import '../../features/ride/presentation/pages/ride_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/driver/presentation/pages/driver_dashboard_page.dart';
import '../../features/driver/presentation/pages/driver_registration_page.dart';
import '../../features/admin/presentation/pages/admin_dashboard_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/otp_page.dart';
import '../../features/auth/presentation/pages/pending_approval_page.dart';
import '../../features/auth/presentation/pages/role_selection_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/select-role',
    routes: [
      GoRoute(
        path: '/select-role',
        builder: (context, state) => const RoleSelectionPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) {
           final role = state.extra as String?;
           return LoginPage(role: role);
        },
      ),
      GoRoute(
        path: '/otp',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return OtpPage(
            phone: extra['phone'] as String,
            role: extra['role'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/ride',
        builder: (context, state) => const RidePage(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(
        path: '/driver-dash',
        builder: (context, state) => const DriverDashboardPage(),
      ),
      GoRoute(
        path: '/driver-reg',
        builder: (context, state) => const DriverRegistrationPage(),
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboardPage(),
      ),
      GoRoute(
        path: '/pending-approval',
        builder: (context, state) => const PendingApprovalPage(),
      ),
    ],
    redirect: (context, state) {
      final isLoggedIn = authState.asData?.value != null;
      final isLoggingIn = state.uri.toString() == '/login' ||
          state.uri.toString() == '/otp' ||
          state.uri.toString() == '/select-role';

      if (!isLoggedIn && !isLoggingIn) {
        return '/select-role';
      }

      if (isLoggedIn && isLoggingIn) {
        // If logged in and trying to go to login pages, send to home
        return '/';
      }

      return null;
    },
  );
});

