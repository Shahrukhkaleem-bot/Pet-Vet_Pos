import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/storage/storage_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/queue/queue_screen.dart';
import 'features/pets/screens/pet_search_screen.dart';
import 'features/pets/screens/pet_detail_screen.dart';
import 'features/consultation/consultation_screen.dart';
import 'features/appointments/appointments_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.initHive();
  runApp(const ProviderScope(child: VetPetApp()));
}

final _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (ctx, state) => const LoginScreen()),
    GoRoute(
      path: '/home',
      builder: (ctx, state) => const MainShell(),
    ),
    GoRoute(
      path: '/pets/:id',
      builder: (ctx, state) => PetDetailScreen(petId: int.parse(state.pathParameters['id']!)),
    ),
    GoRoute(
      path: '/consultations/new',
      builder: (ctx, state) => ConsultationScreen(
        petId: int.parse(state.uri.queryParameters['pet_id'] ?? '0'),
        appointmentId: state.uri.queryParameters['appointment_id'] != null
            ? int.parse(state.uri.queryParameters['appointment_id']!)
            : null,
      ),
    ),
  ],
  redirect: (context, state) async {
    final token = await StorageService().getToken();
    final isOnLogin = state.matchedLocation == '/login';
    if (token == null && !isOnLogin) return '/login';
    if (token != null && isOnLogin) return '/home';
    return null;
  },
);

class VetPetApp extends ConsumerWidget {
  const VetPetApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'VetPet PK',
      theme: AppTheme.light,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final _screens = const [
    DashboardScreen(),
    AppointmentsScreen(),
    QueueScreen(),
    PetSearchScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined), activeIcon: Icon(Icons.calendar_today), label: 'Appointments'),
          BottomNavigationBarItem(icon: Icon(Icons.queue_outlined), activeIcon: Icon(Icons.queue), label: 'Queue'),
          BottomNavigationBarItem(icon: Icon(Icons.pets_outlined), activeIcon: Icon(Icons.pets), label: 'Pets'),
        ],
      ),
    );
  }
}
