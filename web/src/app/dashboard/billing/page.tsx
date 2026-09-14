'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatPKR, cn } from '@/lib/utils';
import { Receipt, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const statusBadge: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, page],
    queryFn: async () => {
      const r = await api.get('/invoices', { params: { status: statusFilter || undefined, page, limit: 20 } });
      return r.data;
    },
  });

  const invoices = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
          <p className="text-slate-500 text-sm">{pagination?.total || 0} total invoices</p>
        </div>
        <Link href="/dashboard/billing/create"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', 'UNPAID', 'PARTIALLY_PAID', 'PAID'].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              statusFilter === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200')}>
            {s === '' ? 'All' : s.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Invoice</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden md:table-cell">Patient</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Total</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden md:table-cell">Paid</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden lg:table-cell">Due</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3">
                  <div className="h-4 bg-slate-200 rounded animate-pulse" />
                </td></tr>
              ))
              : invoices.length === 0
                ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No invoices found.</td></tr>
                : invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-teal-700">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-400">{formatDate(inv.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-slate-800 font-medium">{inv.pet?.name}</p>
                      <p className="text-xs text-slate-500">{inv.owner?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatPKR(inv.total_amount)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-green-700">{formatPKR(inv.paid_amount)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-red-600 font-medium">
                      {parseFloat(inv.due_amount) > 0 ? formatPKR(inv.due_amount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusBadge[inv.status])}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/billing/${inv.id}`}
                        className="opacity-0 group-hover:opacity-100 text-xs text-teal-600 flex items-center gap-0.5 transition-all">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">Page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-50 bg-white">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-50 bg-white">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


