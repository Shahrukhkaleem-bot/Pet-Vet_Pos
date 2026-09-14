import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/network/api_client.dart';
import '../../core/constants/api_constants.dart';
import '../../core/theme/app_theme.dart';

final queueProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final response = await ApiClient().get(ApiConstants.queue);
  return response.data['data'] as Map<String, dynamic>;
});

class QueueScreen extends ConsumerWidget {
  const QueueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queueAsync = ref.watch(queueProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Patient Queue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(queueProvider),
          ),
        ],
      ),
      body: queueAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load queue\n${err.toString()}',
          textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.slate500))),
        data: (data) {
          final queue = data['queue'] as List<dynamic>? ?? [];
          final summary = data['summary'] as Map<String, dynamic>? ?? {};

          return Column(children: [
            // Summary bar
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  _SummaryChip('Waiting', summary['waiting']?.toString() ?? '0', Colors.blue),
                  const SizedBox(width: 8),
                  _SummaryChip('In Consult', summary['in_consultation']?.toString() ?? '0', Colors.orange),
                  const SizedBox(width: 8),
                  _SummaryChip('Done', summary['completed_today']?.toString() ?? '0', Colors.green),
                ],
              ),
            ),
            const Divider(height: 1),

            // Queue list
            Expanded(
              child: queue.isEmpty
                ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.check_circle_outline, size: 56, color: Color(0xFFA7F3D0)),
                    SizedBox(height: 12),
                    Text('Queue is clear!', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.slate500)),
                    Text('No patients currently waiting.', style: TextStyle(color: AppTheme.slate500, fontSize: 13)),
                  ]))
                : RefreshIndicator(
                    color: AppTheme.primary,
                    onRefresh: () => ref.refresh(queueProvider.future),
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: queue.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (ctx, i) => _QueueCard(queue[i] as Map<String, dynamic>),
                    ),
                  ),
            ),
          ]);
        },
      ),
    );
  }
}

class _QueueCard extends StatelessWidget {
  final Map<String, dynamic> appt;
  const _QueueCard(this.appt);

  Color _statusColor(String status) {
    switch (status) {
      case 'CHECKED_IN': return Colors.amber.shade700;
      case 'IN_CONSULTATION': return Colors.orange;
      case 'COMPLETED': return Colors.green;
      default: return Colors.blue;
    }
  }

  String _statusLabel(String status) => status.replaceAll('_', ' ').toLowerCase().split(' ').map((w) => '${w[0].toUpperCase()}${w.substring(1)}').join(' ');

  @override
  Widget build(BuildContext context) {
    final pet = appt['pet'] as Map<String, dynamic>? ?? {};
    final owner = pet['owner'] as Map<String, dynamic>? ?? {};
    final doctor = appt['doctor'] as Map<String, dynamic>? ?? {};
    final status = appt['status'] as String? ?? 'SCHEDULED';
    final token = appt['token_number'];
    final whatsapp = (owner['whatsapp_number'] ?? owner['phone']) as String?;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(children: [
        // Token number
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppTheme.primaryLight,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              '#${token?.toString().padLeft(2, '0') ?? '--'}',
              style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 13),
            ),
          ),
        ),
        const SizedBox(width: 14),

        // Pet & owner info
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text('${pet['name'] ?? 'Unknown'}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _statusColor(status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(_statusLabel(status), style: TextStyle(color: _statusColor(status), fontSize: 10, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 2),
          Text('${owner['name'] ?? ''} · ${appt['start_time'] ?? ''}', style: const TextStyle(color: AppTheme.slate500, fontSize: 12)),
          Text('Dr. ${doctor['name'] ?? ''}', style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w500)),
        ])),

        // WhatsApp button
        if (whatsapp != null)
          IconButton(
            onPressed: () {
              final clean = whatsapp.replaceAll(RegExp(r'\D'), '');
              final msg = Uri.encodeComponent('Your turn is coming up soon, Token #${token?.toString().padLeft(2, '0')}');
              launchUrl(Uri.parse('https://wa.me/$clean?text=$msg'), mode: LaunchMode.externalApplication);
            },
            icon: const Icon(Icons.chat, color: Color(0xFF25D366), size: 22),
            tooltip: 'WhatsApp',
          ),
      ]),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _SummaryChip(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(children: [
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 18)),
          Text(label, style: TextStyle(color: color.withOpacity(0.7), fontSize: 11)),
        ]),
      ),
    );
  }
}
