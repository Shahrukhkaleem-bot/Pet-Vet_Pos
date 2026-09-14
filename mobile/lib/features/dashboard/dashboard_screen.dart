import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/storage_service.dart';
import '../../core/constants/api_constants.dart';
import '../../core/theme/app_theme.dart';

// Dashboard data provider with offline caching
final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ApiClient();
  final storage = StorageService();

  try {
    final response = await api.get(ApiConstants.dashboard);
    final data = response.data['data'] as Map<String, dynamic>;
    // Cache for offline use
    await storage.cacheData('dashboard', data);
    return data;
  } catch (e) {
    // Try cache on network error
    final cached = await storage.getCachedData('dashboard', maxAgeMinutes: 60);
    if (cached != null) return cached as Map<String, dynamic>;
    rethrow;
  }
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('VetPet PK', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            Text('Happy Paws Vet Clinic', style: TextStyle(fontSize: 11, color: AppTheme.slate500, fontWeight: FontWeight.w400)),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () => ref.refresh(dashboardProvider.future),
        child: dashAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.wifi_off, size: 48, color: AppTheme.slate500),
                const SizedBox(height: 12),
                const Text('Could not load data', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                const Text('Check your connection and pull to refresh', style: TextStyle(color: AppTheme.slate500, fontSize: 13), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () => ref.refresh(dashboardProvider),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ]),
            ),
          ),
          data: (data) {
            final stats = data['stats'] as Map<String, dynamic>? ?? {};
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Date header
                Text(
                  _todayLabel(),
                  style: const TextStyle(color: AppTheme.slate500, fontSize: 13),
                ),
                const SizedBox(height: 16),

                // Stats grid
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.6,
                  children: [
                    _StatCard('Today\'s Appts', stats['today_appointments']?.toString() ?? '0', Icons.calendar_today, Colors.blue),
                    _StatCard('Waiting', stats['waiting_patients']?.toString() ?? '0', Icons.access_time, Colors.amber.shade700),
                    _StatCard('Revenue Today', 'Rs.${_formatAmount(stats['revenue_today'])}', Icons.payments, AppTheme.primary),
                    _StatCard('Low Stock', stats['low_stock_alerts']?.toString() ?? '0', Icons.inventory_2, Colors.orange),
                  ],
                ),

                const SizedBox(height: 20),

                // Quick actions
                const Text('Quick Actions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 12),
                Row(children: [
                  _QuickAction(Icons.queue, 'Queue', AppTheme.primary, () {}),
                  const SizedBox(width: 12),
                  _QuickAction(Icons.search, 'Find Pet', Colors.blue, () {}),
                  const SizedBox(width: 12),
                  _QuickAction(Icons.vaccines, 'Vaccines', Colors.purple, () {}),
                ]),

                const SizedBox(height: 20),

                // Vaccinations due soon alert
                if ((stats['vaccinations_due_soon'] ?? 0) > 0) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.vaccines, color: Colors.amber),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${stats['vaccinations_due_soon']} vaccination(s) due soon',
                          style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF92400E))),
                        const Text('Check the vaccination schedule', style: TextStyle(fontSize: 12, color: Color(0xFFB45309))),
                      ])),
                    ]),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  String _todayLabel() {
    final now = DateTime.now();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${days[now.weekday - 1]}, ${now.day} ${months[now.month - 1]} ${now.year}';
  }

  String _formatAmount(dynamic amount) {
    if (amount == null) return '0';
    final n = double.tryParse(amount.toString()) ?? 0;
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return n.toStringAsFixed(0);
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 22),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          ]),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction(this.icon, this.label, this.color, this.onTap);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Column(children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }
}
