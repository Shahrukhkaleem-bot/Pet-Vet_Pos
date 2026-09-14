'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatPKR } from '@/lib/utils';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Receipt } from 'lucide-react';
import Link from 'next/link';

const ITEM_TYPES = ['CONSULTATION', 'MEDICINE', 'VACCINE', 'LAB_TEST', 'PROCEDURE', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER'];

interface LineItem {
  item_type: string;
  medicine_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

const defaultItem = (): LineItem => ({
  item_type: 'CONSULTATION',
  medicine_id: '',
  description: '',
  quantity: 1,
  unit_price: 0,
});

export default function CreateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    pet_id: searchParams.get('pet_id') || '',
    owner_id: '',
    consultation_id: searchParams.get('consultation_id') || '',
    discount: '0',
    notes: '',
  });
  const [items, setItems] = useState<LineItem[]>([{ ...defaultItem(), item_type: 'CONSULTATION', description: 'Consultation fee', unit_price: 1500 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  // Load pets
  const { data: pets } = useQuery({
    queryKey: ['pets', 'all'],
    queryFn: async () => { const r = await api.get('/pets', { params: { limit: 200 } }); return r.data.data; },
  });

  // Auto-fill owner when pet selected
  const selectedPet = (pets || []).find((p: any) => p.id.toString() === form.pet_id);

  // Load medicines for medicine items
  const { data: medicines } = useQuery({
    queryKey: ['medicines', 'list'],
    queryFn: async () => { const r = await api.get('/medicines', { params: { limit: 200, in_stock: true } }); return r.data.data; },
  });

  const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
  const discount = parseFloat(form.discount) || 0;
  const total = Math.max(0, subtotal - discount);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const owner_id = selectedPet?.owner?.id || form.owner_id;
      const res = await api.post('/invoices', {
        pet_id: parseInt(form.pet_id),
        owner_id: parseInt(owner_id),
        consultation_id: form.consultation_id ? parseInt(form.consultation_id) : undefined,
        discount: parseFloat(form.discount) || 0,
        tax: 0,
        notes: form.notes || undefined,
        items: items.map(i => ({
          ...i,
          medicine_id: i.medicine_id ? parseInt(i.medicine_id) : undefined,
          quantity: parseInt(i.quantity.toString()),
          unit_price: parseFloat(i.unit_price.toString()),
        })),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      router.push(`/dashboard/billing/${data.data.id}`);
    },
    onError: (e: any) => setApiError(e?.response?.data?.message || 'Failed to create invoice.'),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.pet_id) e.pet_id = 'Select a patient.';
    if (items.some(i => !i.description)) e.items = 'All line items need a description.';
    if (items.some(i => i.unit_price <= 0)) e.items = 'All prices must be greater than 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addItem = () => setItems(prev => [...prev, defaultItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Auto-fill medicine details
      if (field === 'medicine_id' && value) {
        const med = (medicines || []).find((m: any) => m.id.toString() === value);
        if (med) {
          updated.description = med.name;
          updated.unit_price = med.selling_price;
        }
      }
      return updated;
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/billing" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Invoice</h1>
          <p className="text-slate-500 text-sm">PKR billing for clinic services</p>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{apiError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Patient */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Patient Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient <span className="text-red-500">*</span></label>
              <select
                value={form.pet_id}
                onChange={e => setForm(p => ({ ...p, pet_id: e.target.value }))}
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white ${errors.pet_id ? 'border-red-300' : 'border-slate-200'}`}
              >
                <option value="">Select patient...</option>
                {(pets || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.owner?.name}</option>
                ))}
              </select>
              {errors.pet_id && <p className="text-red-500 text-xs mt-1">{errors.pet_id}</p>}
            </div>
            {selectedPet && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-xs text-teal-600 font-medium">Owner: {selectedPet.owner?.name} · {selectedPet.owner?.phone}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Line Items</h2>
              {errors.items && <p className="text-red-500 text-xs">{errors.items}</p>}
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={item.item_type}
                      onChange={e => updateItem(idx, 'item_type', e.target.value)}
                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {ITEM_TYPES.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                    </select>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="ml-auto text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {item.item_type === 'MEDICINE' && (
                    <select
                      value={item.medicine_id}
                      onChange={e => updateItem(idx, 'medicine_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Select medicine...</option>
                      {(medicines || []).map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock_quantity})</option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-center"
                      />
                    </div>
                    <div className="col-span-4">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unit_price}
                          onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-700">
                      = {formatPKR(item.unit_price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-teal-600 border border-dashed border-teal-300 rounded-xl py-2.5 hover:bg-teal-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Line Item
            </button>
          </div>

          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Payment terms, additional notes..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
            />
          </div>
        </div>

        {/* Totals sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 sticky top-6">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-600" /> Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-xs shrink-0">Discount (Rs.)</span>
                <input
                  type="number"
                  min="0"
                  value={form.discount}
                  onChange={e => setForm(p => ({ ...p, discount: e.target.value }))}
                  className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-right"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="font-bold text-slate-800">Total</span>
                <span className="font-bold text-xl text-teal-700">{formatPKR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={() => { if (validate()) mutate(); }}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isPending ? 'Creating...' : 'Create Invoice'}
            </button>

            <Link href="/dashboard/billing"
              className="block text-center text-sm text-slate-500 hover:text-slate-700 py-1">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
