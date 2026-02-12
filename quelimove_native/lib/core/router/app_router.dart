import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

import '../../features/home/presentation/pages/home_page.dart';
import '../../features/ride/presentation/pages/ride_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/driver/presentation/pages/driver_dashboard_page.dart';
import '../../features/driver/presentation/pages/driver_registration_page.dart';

// Placeholder Pages (will be implemented next)
import '../../features/admin/presentation/pages/admin_dashboard_page.dart';

import '../../features/auth/presentation/pages/role_selection_page.dart';

final AppRouter = GoRouter(
  initialLocation: '/select-role',
  routes: [
    GoRoute(
      path: '/select-role',
      builder: (context, state) => const RoleSelectionPage(),
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
  ],
);
