'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatPKR, formatDate, cn } from '@/lib/utils';
import { Package, AlertTriangle, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';

export default function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['medicines'],
    queryFn: async () => { const r = await api.get('/medicines', { params: { limit: 100 } }); return r.data.data; },
  });
  const { data: alerts } = useQuery({
    queryKey: ['medicine-alerts'],
    queryFn: async () => { const r = await api.get('/medicines/alerts'); return r.data.data; },
  });

  const medicines = data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medicine Inventory</h1>
          <p className="text-slate-500 text-sm">{medicines.length} medicines in stock</p>
        </div>
        <Link href="/dashboard/inventory/new"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Medicine
        </Link>
      </div>

      {/* Alerts */}
      {alerts && (alerts.low_stock?.length > 0 || alerts.expiring_soon?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.low_stock?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <h3 className="font-semibold text-orange-800 text-sm">Low Stock ({alerts.low_stock.length})</h3>
              </div>
              {alerts.low_stock.slice(0, 5).map((m: any) => (
                <p key={m.id} className="text-xs text-orange-700 py-0.5">
                  {m.name} — <span className="font-semibold">{m.stock_quantity} {m.unit}s left</span>
                </p>
              ))}
            </div>
          )}
          {alerts.expiring_soon?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h3 className="font-semibold text-red-800 text-sm">Expiring Soon ({alerts.expiring_soon.length})</h3>
              </div>
              {alerts.expiring_soon.slice(0, 5).map((b: any) => (
                <p key={b.id} className="text-xs text-red-700 py-0.5">
                  {b.medicine?.name} — Batch {b.batch_number} expires {formatDate(b.expiry_date)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Medicine</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden md:table-cell">Category</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Stock</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden lg:table-cell">Sell Price</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden lg:table-cell">Expiry</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : medicines.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 text-sm">{m.name}</p>
                  {m.generic_name && <p className="text-xs text-slate-400">{m.generic_name}</p>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{m.category}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{m.stock_quantity} <span className="text-xs text-slate-400 font-normal">{m.unit}s</span></p>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm text-slate-700">{formatPKR(m.selling_price)}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{m.nearest_expiry ? formatDate(m.nearest_expiry) : 'N/A'}</td>
                <td className="px-4 py-3">
                  {m.is_low_stock && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Low Stock</span>}
                  {m.has_expiring_batches && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium ml-1">Expiring</span>}
                  {!m.is_low_stock && !m.has_expiring_batches && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
