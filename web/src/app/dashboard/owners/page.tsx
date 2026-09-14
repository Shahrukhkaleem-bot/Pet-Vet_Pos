'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PetOwner } from '@/lib/types';
import { formatDate, makeWhatsAppLink } from '@/lib/utils';
import { Search, Plus, MessageCircle, Dog, ChevronRight, Phone, Users } from 'lucide-react';
import Link from 'next/link';

export default function OwnersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['owners', search, page],
    queryFn: async () => {
      const res = await api.get('/owners', { params: { search, page, limit: 20 } });
      return res.data;
    },
  });

  const owners: PetOwner[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pet Owners</h1>
          <p className="text-slate-500 text-sm">{pagination?.total || 0} registered owners</p>
        </div>
        <Link
          href="/dashboard/owners/new"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Owner
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name, phone, WhatsApp, or pet name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm"
        />
      </div>

      {/* Owner List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : owners.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No owners found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Owner</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Contact</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">City</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Pets</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Since</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {owners.map((owner) => (
                <tr key={owner.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                        {owner.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{owner.name}</p>
                        <p className="text-xs text-slate-400 md:hidden">{owner.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" /> {owner.phone}
                      </div>
                      {owner.whatsapp_number && (
                        <a
                          href={makeWhatsAppLink(owner.whatsapp_number, `Hello ${owner.name}, `)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-slate-600">{owner.city}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                      <Dog className="w-3.5 h-3.5 text-teal-500" />
                      {owner.pet_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">
                    {formatDate(owner.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/owners/${owner.id}`}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-teal-600 hover:text-teal-700 text-xs font-medium transition-all"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



