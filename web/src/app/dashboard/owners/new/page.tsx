'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Loader2, User, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

interface OwnerFormData {
  name: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  city: string;
  notes: string;
}

export default function NewOwnerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OwnerFormData>({
    name: '', phone: '+92', whatsapp_number: '+92',
    email: '', address: '', city: 'Lahore', notes: '',
  });
  const [errors, setErrors] = useState<Partial<OwnerFormData>>({});

  const { mutate, isPending, error: apiError } = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      const payload: any = { ...data };
      if (!payload.email) delete payload.email;
      if (!payload.whatsapp_number || payload.whatsapp_number === '+92') delete payload.whatsapp_number;
      if (!payload.notes) delete payload.notes;
      const res = await api.post('/owners', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      router.push(`/dashboard/owners/${data.data.id}`);
    },
  });

  const validate = (): boolean => {
    const e: Partial<OwnerFormData> = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!/^\+92[0-9]{10}$/.test(form.phone)) e.phone = 'Must be in +923XXXXXXXXX format.';
    if (form.whatsapp_number && form.whatsapp_number !== '+92' && !/^\+92[0-9]{10}$/.test(form.whatsapp_number)) {
      e.whatsapp_number = 'Must be in +923XXXXXXXXX format.';
    }
    if (!form.city.trim()) e.city = 'City is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutate(form);
  };

  const set = (field: keyof OwnerFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Other'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/owners" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register Pet Owner</h1>
          <p className="text-slate-500 text-sm">Add a new pet owner to the clinic</p>
        </div>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {(apiError as any)?.response?.data?.message || 'Failed to save owner. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-teal-600" />
            <h2 className="font-semibold text-slate-800">Personal Information</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Muhammad Ahmed Khan"
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+923001234567"
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono ${errors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              <p className="text-xs text-slate-400 mt-1">Format: +923001234567</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number</label>
              <input
                type="tel"
                value={form.whatsapp_number}
                onChange={e => set('whatsapp_number', e.target.value)}
                placeholder="+923001234567 (optional)"
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono ${errors.whatsapp_number ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.whatsapp_number && <p className="text-red-500 text-xs mt-1">{errors.whatsapp_number}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="owner@example.com (optional)"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-teal-600" />
            <h2 className="font-semibold text-slate-800">Address</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="House number, street, area"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <select
              value={form.city}
              onChange={e => set('city', e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white ${errors.city ? 'border-red-300' : 'border-slate-200'}`}
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Any additional notes about this owner..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/dashboard/owners"
            className="flex-1 text-center py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Saving...' : 'Register Owner'}
          </button>
        </div>
      </form>
    </div>
  );
}
