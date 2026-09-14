'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Pill, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface RxItem {
  medicine_id: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions: string;
}

const FREQUENCY_OPTIONS = [
  'Once daily (OD)',
  'Twice daily (BD)',
  'Three times daily (TDS)',
  'Four times daily (QID)',
  'Every 12 hours',
  'Every 8 hours',
  'As needed (PRN)',
  'Once a week',
];

const defaultItem = (): RxItem => ({
  medicine_id: '',
  dosage: '1 tablet',
  frequency: 'Twice daily (BD)',
  duration_days: 5,
  instructions: 'Give with food',
});

export default function NewPrescriptionPage() {
  const { id: consultationId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<RxItem[]>([defaultItem()]);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load consultation details to see pet & doctor
  const { data: consultation, isLoading: loadingConsultation } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      const res = await api.get(`/consultations/${consultationId}`);
      return res.data.data;
    },
  });

  // Load available medicines from inventory
  const { data: medicines, isLoading: loadingMedicines } = useQuery({
    queryKey: ['medicines', 'active'],
    queryFn: async () => {
      const res = await api.get('/medicines', { params: { limit: 200 } });
      return res.data.data;
    },
  });

  const createRxMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/prescriptions', {
        consultation_id: parseInt(consultationId as string),
        instructions: generalInstructions.trim() || undefined,
        items: items.map(item => ({
          medicine_id: parseInt(item.medicine_id),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration_days: parseInt(item.duration_days.toString()),
          instructions: item.instructions.trim() || undefined,
        })),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] });
      router.push(`/dashboard/consultations/${consultationId}`);
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to create prescription.');
    },
  });

  const addItem = () => setItems(prev => [...prev, defaultItem()]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof RxItem, value: any) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('Please add at least one medicine.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].medicine_id) {
        setErrorMsg(`Please select a medicine for item #${i + 1}.`);
        return;
      }
      if (!items[i].dosage.trim()) {
        setErrorMsg(`Please specify dosage for item #${i + 1}.`);
        return;
      }
      if (items[i].duration_days < 1) {
        setErrorMsg(`Duration must be at least 1 day for item #${i + 1}.`);
        return;
      }
    }

    createRxMutation.mutate();
  };

  if (loadingConsultation) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Consultation
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Prescription</h1>
          {consultation?.pet && (
            <p className="text-slate-500 text-sm">
              Patient: <span className="font-semibold text-slate-800">{consultation.pet.name}</span> ({consultation.pet.species?.name}) · Owner: {consultation.pet.owner?.name}
            </p>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={validateAndSubmit} className="space-y-5">
        {/* Prescription items */}
        <div className="space-y-4">
          {items.map((item, index) => {
            const selectedMed = medicines?.find((m: any) => m.id.toString() === item.medicine_id);

            return (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Prescribed Medicine</h3>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Remove medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Medicine Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Medicine <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={item.medicine_id}
                    onChange={e => updateItem(index, 'medicine_id', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose medicine from inventory --</option>
                    {medicines?.map((m: any) => (
                      <option key={m.id} value={m.id} disabled={m.stock_quantity <= 0}>
                        {m.name} ({m.generic_name || m.category}) — Stock: {m.stock_quantity} {m.unit}s {m.stock_quantity <= 0 ? '(Out of stock)' : ''}
                      </option>
                    ))}
                  </select>

                  {selectedMed && selectedMed.stock_quantity <= (selectedMed.min_stock_alert || 10) && (
                    <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Low stock alert: Only {selectedMed.stock_quantity} {selectedMed.unit}s left in clinic.
                    </p>
                  )}
                </div>

                {/* Dosage, Frequency, Duration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dosage <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.dosage}
                      onChange={e => updateItem(index, 'dosage', e.target.value)}
                      placeholder="e.g. 1 tablet, 2.5ml"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Frequency <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={item.frequency}
                      onChange={e => updateItem(index, 'frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {FREQUENCY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duration (Days) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={item.duration_days}
                      onChange={e => updateItem(index, 'duration_days', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>

                {/* Specific Instructions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Instructions</label>
                  <input
                    type="text"
                    value={item.instructions}
                    onChange={e => updateItem(index, 'instructions', e.target.value)}
                    placeholder="e.g. After meals, avoid direct sunlight"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Another Medicine Button */}
        <button
          type="button"
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-teal-300 hover:border-teal-400 bg-teal-50/50 hover:bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Another Medicine
        </button>

        {/* General Advice / Instructions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <label className="block text-sm font-bold text-slate-800">
            Dietary Advice & General Instructions
          </label>
          <textarea
            value={generalInstructions}
            onChange={e => setGeneralInstructions(e.target.value)}
            rows={3}
            placeholder="Special diet instructions, activity limits, home care notes..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createRxMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {createRxMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {createRxMutation.isPending ? 'Generating PDF...' : 'Issue Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}
