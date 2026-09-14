import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ConsultationScreen extends StatelessWidget {
  final int petId;
  final int? appointmentId;
  const ConsultationScreen({super.key, required this.petId, this.appointmentId});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('New Consultation')),
    body: const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text('🩺', style: TextStyle(fontSize: 48)),
      SizedBox(height: 12),
      Text('Consultation Workspace', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      SizedBox(height: 4),
      Text('Full consultation form — Phase 2', style: TextStyle(color: AppTheme.slate500, fontSize: 13)),
      SizedBox(height: 4),
      Text('API: POST /api/v1/consultations — Live ✓', style: TextStyle(color: AppTheme.primary, fontSize: 12)),
    ])),
  );
}
