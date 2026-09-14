'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Pet } from '@/lib/types';
import { formatDate, statusColors, speciesEmoji, cn } from '@/lib/utils';
import { Search, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

export default function PetsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['pets', search, page],
    queryFn: async () => {
      const res = await api.get('/pets', { params: { search, page, limit: 20 } });
      return res.data;
    },
  });

  const pets: Pet[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pets</h1>
          <p className="text-slate-500 text-sm">{pagination?.total || 0} registered pets</p>
        </div>
        <Link
          href="/dashboard/pets/new"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register Pet
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by pet name, microchip ID, owner name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🐾</p>
          <p className="text-slate-500">No pets found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/dashboard/pets/${pet.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-teal-200 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-teal-50 flex items-center justify-center text-3xl shrink-0 border border-teal-100">
                  {pet.photo_path ? (
                    <img
                      src={`${API_URL}${pet.photo_path}`}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    speciesEmoji[pet.species?.name] || '🐾'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 truncate">{pet.name}</h3>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 shrink-0 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pet.species?.name} {pet.breed ? `· ${pet.breed.name}` : ''} · {pet.gender === 'MALE' ? '♂' : pet.gender === 'FEMALE' ? '♀' : ''}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 font-medium truncate">{pet.owner?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{pet.owner?.phone}</p>
                  {pet.weight_kg && (
                    <p className="text-xs text-teal-600 mt-1">{pet.weight_kg} kg</p>
                  )}
                </div>
              </div>
              {(pet.allergies || pet.existing_conditions) && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{pet.allergies || pet.existing_conditions}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-white bg-white transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-white bg-white transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
