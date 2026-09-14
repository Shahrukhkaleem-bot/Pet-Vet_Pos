import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_theme.dart';

final petSearchProvider = FutureProvider.family<List<dynamic>, String>((ref, query) async {
  if (query.isEmpty) return [];
  final response = await ApiClient().get(ApiConstants.pets, params: {'search': query, 'limit': 20});
  return response.data['data'] as List<dynamic>;
});

class PetSearchScreen extends ConsumerStatefulWidget {
  const PetSearchScreen({super.key});

  @override
  ConsumerState<PetSearchScreen> createState() => _PetSearchScreenState();
}

class _PetSearchScreenState extends ConsumerState<PetSearchScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final petsAsync = ref.watch(petSearchProvider(_query));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pets'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Search by pet name, owner, phone...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _query = '');
                      })
                    : null,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.slate200)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              onChanged: (v) {
                if (v.length >= 2 || v.isEmpty) setState(() => _query = v);
              },
            ),
          ),
        ),
      ),
      body: _query.isEmpty
          ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.search, size: 56, color: AppTheme.slate200),
              SizedBox(height: 12),
              Text('Search for a pet', style: TextStyle(color: AppTheme.slate500, fontWeight: FontWeight.w600)),
              Text('Enter a name, owner name, or phone number', style: TextStyle(color: AppTheme.slate500, fontSize: 13)),
            ]))
          : petsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (pets) => pets.isEmpty
                  ? Center(child: Text('No pets found for "$_query"', style: const TextStyle(color: AppTheme.slate500)))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: pets.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (ctx, i) {
                        final pet = pets[i] as Map<String, dynamic>;
                        final owner = pet['owner'] as Map<String, dynamic>? ?? {};
                        final species = pet['species'] as Map<String, dynamic>? ?? {};
                        final breed = pet['breed'] as Map<String, dynamic>?;
                        return ListTile(
                          tileColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppTheme.slate200)),
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.primaryLight,
                            child: Text(_speciesEmoji(species['name']), style: const TextStyle(fontSize: 22)),
                          ),
                          title: Text(pet['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${species['name'] ?? ''}${breed != null ? ' · ${breed['name']}' : ''}\n${owner['name'] ?? ''} · ${owner['phone'] ?? ''}'),
                          isThreeLine: true,
                          trailing: const Icon(Icons.chevron_right, color: AppTheme.slate200),
                          onTap: () => context.push('/pets/${pet['id']}'),
                        );
                      },
                    ),
            ),
    );
  }

  String _speciesEmoji(String? name) {
    switch (name) {
      case 'Dog': return '🐕';
      case 'Cat': return '🐈';
      case 'Bird': return '🦜';
      case 'Rabbit': return '🐇';
      case 'Horse': return '🐎';
      default: return '🐾';
    }
  }
}
