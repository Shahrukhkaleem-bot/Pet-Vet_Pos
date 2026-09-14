import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_theme.dart';

final petDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, petId) async {
  final response = await ApiClient().get('${ApiConstants.pets}/$petId');
  return response.data['data'] as Map<String, dynamic>;
});

class PetDetailScreen extends ConsumerWidget {
  final int petId;
  const PetDetailScreen({super.key, required this.petId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final petAsync = ref.watch(petDetailProvider(petId));

    return petAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(appBar: AppBar(), body: Center(child: Text('Error: $e'))),
      data: (pet) {
        final owner = pet['owner'] as Map<String, dynamic>? ?? {};
        final species = pet['species'] as Map<String, dynamic>? ?? {};
        final breed = pet['breed'] as Map<String, dynamic>?;
        final vaccinations = pet['vaccinations'] as List<dynamic>? ?? [];
        final consultations = pet['consultations'] as List<dynamic>? ?? [];

        return Scaffold(
          appBar: AppBar(
            title: Text(pet['name'] as String? ?? 'Pet'),
            actions: [
              IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () {}),
            ],
          ),
          body: ListView(
            children: [
              // Pet header
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(20),
                child: Row(children: [
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(child: Text(_emoji(species['name']), style: const TextStyle(fontSize: 40))),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(pet['name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
                    Text('${species['name'] ?? ''}${breed != null ? ' · ${breed['name']}' : ''} · ${_gender(pet['gender'])}',
                      style: const TextStyle(color: AppTheme.slate500)),
                    const SizedBox(height: 4),
                    Text('${pet['age_years'] ?? 0}y ${pet['age_months'] ?? 0}m · ${pet['weight_kg'] ?? 'N/A'} kg',
                      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600, fontSize: 13)),
                  ])),
                ]),
              ),

              // Alerts
              if (pet['allergies'] != null || pet['existing_conditions'] != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      if (pet['allergies'] != null) Text('Allergies: ${pet['allergies']}',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF92400E))),
                      if (pet['existing_conditions'] != null) Text('Conditions: ${pet['existing_conditions']}',
                        style: const TextStyle(fontSize: 13, color: Color(0xFF92400E))),
                    ])),
                  ]),
                ),

              // Owner card
              _SectionCard(
                title: 'Owner',
                child: Row(children: [
                  const CircleAvatar(backgroundColor: AppTheme.primaryLight, child: Icon(Icons.person, color: AppTheme.primary)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(owner['name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text(owner['phone'] as String? ?? '', style: const TextStyle(color: AppTheme.slate500, fontSize: 13)),
                  ])),
                ]),
              ),

              // Quick actions
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(children: [
                  _ActionBtn(Icons.medical_services, 'Consultation', AppTheme.primary, () => context.push('/consultations/new?pet_id=$petId')),
                  const SizedBox(width: 10),
                  _ActionBtn(Icons.vaccines, 'Vaccination', Colors.purple, () {}),
                  const SizedBox(width: 10),
                  _ActionBtn(Icons.receipt_long, 'Invoice', Colors.blue, () {}),
                ]),
              ),

              // Vaccination timeline
              _SectionCard(
                title: 'Vaccinations (${vaccinations.length})',
                child: vaccinations.isEmpty
                    ? const Center(child: Padding(padding: EdgeInsets.all(16), child: Text('No vaccinations recorded.', style: TextStyle(color: AppTheme.slate500))))
                    : Column(children: vaccinations.take(5).map((v) => _VaccinationRow(v as Map<String, dynamic>)).toList()),
              ),

              // Medical history
              _SectionCard(
                title: 'Medical History (${consultations.length})',
                child: consultations.isEmpty
                    ? const Center(child: Padding(padding: EdgeInsets.all(16), child: Text('No consultations recorded.', style: TextStyle(color: AppTheme.slate500))))
                    : Column(children: consultations.take(5).map((c) => _ConsultationRow(c as Map<String, dynamic>)).toList()),
              ),

              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  String _emoji(String? s) {
    switch (s) { case 'Dog': return '🐕'; case 'Cat': return '🐈'; case 'Bird': return '🦜'; case 'Rabbit': return '🐇'; default: return '🐾'; }
  }

  String _gender(String? g) {
    switch (g) { case 'MALE': return 'Male ♂'; case 'FEMALE': return 'Female ♀'; default: return ''; }
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.slate200),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        ),
        const Divider(height: 1),
        Padding(padding: const EdgeInsets.all(12), child: child),
      ]),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn(this.icon, this.label, this.color, this.onTap);

  @override
  Widget build(BuildContext context) => Expanded(
    child: OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16, color: color),
      label: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: color.withOpacity(0.3)),
        backgroundColor: color.withOpacity(0.06),
        padding: const EdgeInsets.symmetric(vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
  );
}

class _VaccinationRow extends StatelessWidget {
  final Map<String, dynamic> v;
  const _VaccinationRow(this.v);

  @override
  Widget build(BuildContext context) {
    final status = v['due_status'] as String? ?? 'UPCOMING';
    final statusColor = status == 'OVERDUE' ? AppTheme.rose : status == 'DUE_SOON' ? AppTheme.amber : AppTheme.green;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Icon(Icons.vaccines, size: 16, color: statusColor),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(v['vaccine_name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          Text('Next due: ${_fmt(v['next_due_date'])}', style: const TextStyle(fontSize: 11, color: AppTheme.slate500)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
          child: Text(status.replaceAll('_', ' '), style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }

  String _fmt(String? date) {
    if (date == null) return 'N/A';
    final d = DateTime.tryParse(date);
    if (d == null) return date;
    return '${d.day}/${d.month}/${d.year}';
  }
}

class _ConsultationRow extends StatelessWidget {
  final Map<String, dynamic> c;
  const _ConsultationRow(this.c);

  @override
  Widget build(BuildContext context) {
    final doctor = c['doctor'] as Map<String, dynamic>? ?? {};
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        const Icon(Icons.medical_services, size: 16, color: AppTheme.primary),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(c['chief_complaint'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text('${c['diagnosis'] ?? ''}', style: const TextStyle(fontSize: 11, color: AppTheme.slate500), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text('Dr. ${doctor['name'] ?? ''} · ${_fmt(c['consultation_date'])}', style: const TextStyle(fontSize: 10, color: AppTheme.primary)),
        ])),
      ]),
    );
  }

  String _fmt(String? date) {
    if (date == null) return '';
    final d = DateTime.tryParse(date);
    if (d == null) return date;
    return '${d.day}/${d.month}/${d.year}';
  }
}
