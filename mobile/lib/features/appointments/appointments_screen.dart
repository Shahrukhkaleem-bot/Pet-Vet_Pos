import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

// Stub screens — to be implemented in Phase 2
class AppointmentsScreen extends StatelessWidget {
  const AppointmentsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Appointments')),
    body: const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text('📅', style: TextStyle(fontSize: 48)),
      SizedBox(height: 12),
      Text('Appointment Calendar', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      SizedBox(height: 4),
      Text('Full calendar view — Phase 2', style: TextStyle(color: AppTheme.slate500, fontSize: 13)),
      SizedBox(height: 4),
      Text('API: GET /api/v1/appointments — Live ✓', style: TextStyle(color: AppTheme.primary, fontSize: 12)),
    ])),
  );
}
