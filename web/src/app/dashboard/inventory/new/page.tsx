'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Package, Save, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  'ANTIBIOTIC',
  'ANALGESIC',
  'ANTI_INFLAMMATORY',
  'VACCINE',
  'PARASITICIDE',
  'VITAMIN',
  'DERMATOLOGY',
  'FLUID',
  'OTHER',
];

const UNITS = ['tablet', 'ml', 'vial', 'tube', 'capsule', 'bottle', 'sachet', 'ampoule'];

export default function NewMedicinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Next year date for batch expiry
  const getNextYearDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    name: '',
    generic_name: '',
    category: 'ANTIBIOTIC',
    unit: 'tablet',
    purchase_price: '',
    selling_price: '',
    min_stock_alert: '10',
    description: '',
    // Initial batch
    batch_number: 'BATCH-' + Math.floor(1000 + Math.random() * 9000),
    quantity: '50',
    expiry_date: getNextYearDate(),
  });

  const [errorMsg, setErrorMsg] = useState('');

  const addMedMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/medicines', {
        name: form.name.trim(),
        generic_name: form.generic_name.trim() || undefined,
        category: form.category,
        unit: form.unit,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
        selling_price: parseFloat(form.selling_price),
        min_stock_alert: parseInt(form.min_stock_alert) || 10,
        description: form.description.trim() || undefined,
        batch_number: form.batch_number.trim(),
        quantity: parseInt(form.quantity),
        expiry_date: form.expiry_date,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['medicine-alerts'] });
      router.push('/dashboard/inventory');
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to add medicine.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name.trim()) {
      setErrorMsg('Please enter the medicine brand name.');
      return;
    }
    if (!form.selling_price || parseFloat(form.selling_price) <= 0) {
      setErrorMsg('Please specify a valid selling price in PKR.');
      return;
    }
    if (!form.batch_number.trim()) {
      setErrorMsg('Please provide the initial batch number.');
      return;
    }
    if (!form.quantity || parseInt(form.quantity) < 1) {
      setErrorMsg('Initial stock quantity must be at least 1.');
      return;
    }
    if (!form.expiry_date) {
      setErrorMsg('Please specify the batch expiry date.');
      return;
    }

    addMedMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Medicine</h1>
          <p className="text-slate-500 text-sm">Register medicine with initial stock batch</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Medicine Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-600" /> Medicine Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medicine Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Augmentin 625mg, Meloxicam"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Generic / Active Formula
              </label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin + Clavulanic Acid"
                value={form.generic_name}
                onChange={e => setForm(p => ({ ...p, generic_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dispensing Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price (PKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 150"
                value={form.selling_price}
                onChange={e => setForm(p => ({ ...p, selling_price: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost (PKR)</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 100"
                value={form.purchase_price}
                onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Low Stock Alert Level</label>
              <input
                type="number"
                min="1"
                value={form.min_stock_alert}
                onChange={e => setForm(p => ({ ...p, min_stock_alert: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Usage / Storage Notes</label>
            <textarea
              rows={2}
              placeholder="Storage temperature, handling notes, contraindications..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
        </div>

        {/* Initial Batch */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Initial Batch & Expiry (FEFO Tracking)</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.batch_number}
                onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))}
                placeholder="e.g. BATCH-7782"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.expiry_date}
                onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={addMedMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {addMedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {addMedMutation.isPending ? 'Saving...' : 'Add to Inventory'}
          </button>
        </div>
      </form>
    </div>
  );
}
