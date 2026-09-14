'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Syringe, Save, Loader2, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const COMMON_VACCINES = [
  'Rabies Vaccine',
  'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
  'DHLPP (with Leptospirosis)',
  'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
  'Feline Leukemia (FeLV)',
  'Kennel Cough (Bordetella)',
  'Deworming (Internal Parasite Treatment)',
  'Tick & Flea Prevention (External Parasite)',
];

export default function NewVaccinationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const prefilledPetId = searchParams.get('pet_id') || '';

  // Default next due date = today + 1 year
  const getNextYearDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    pet_id: prefilledPetId,
    vaccine_name: COMMON_VACCINES[0],
    batch_number: 'BATCH-' + Math.floor(100000 + Math.random() * 900000),
    administered_date: new Date().toISOString().split('T')[0],
    next_due_date: getNextYearDate(),
    adverse_reaction: '',
    notes: '',
  });

  const [customVaccine, setCustomVaccine] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load pets
  const { data: pets } = useQuery({
    queryKey: ['pets', 'all'],
    queryFn: async () => {
      const res = await api.get('/pets', { params: { limit: 200 } });
      return res.data.data;
    },
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/vaccinations', {
        pet_id: parseInt(form.pet_id),
        vaccine_name: form.vaccine_name.trim(),
        batch_number: form.batch_number.trim() || undefined,
        administered_date: form.administered_date,
        next_due_date: form.next_due_date,
        adverse_reaction: form.adverse_reaction.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      queryClient.invalidateQueries({ queryKey: ['pet', form.pet_id] });
      router.push('/dashboard/vaccinations');
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to record vaccination.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.pet_id) {
      setErrorMsg('Please select a patient.');
      return;
    }
    if (!form.vaccine_name.trim()) {
      setErrorMsg('Please specify the vaccine name.');
      return;
    }
    if (!form.administered_date) {
      setErrorMsg('Please specify the date administered.');
      return;
    }
    if (!form.next_due_date) {
      setErrorMsg('Please specify the next due date for reminders.');
      return;
    }

    recordMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Vaccinations
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Record Vaccination</h1>
          <p className="text-slate-500 text-sm">Add vaccine record and set automated reminder</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-purple-600" /> Vaccine & Patient Information
          </h2>

          {/* Pet */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.pet_id}
              onChange={e => setForm(p => ({ ...p, pet_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- Choose registered pet --</option>
              {pets?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species?.name}) — Owner: {p.owner?.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vaccine Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Vaccine Name <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setCustomVaccine(!customVaccine)}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                {customVaccine ? 'Choose from presets' : 'Type custom name'}
              </button>
            </div>

            {customVaccine ? (
              <input
                type="text"
                placeholder="e.g. Corona Virus Vaccine"
                value={form.vaccine_name}
                onChange={e => setForm(p => ({ ...p, vaccine_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            ) : (
              <select
                value={form.vaccine_name}
                onChange={e => setForm(p => ({ ...p, vaccine_name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {COMMON_VACCINES.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            )}
          </div>

          {/* Batch Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Vial Number</label>
            <input
              type="text"
              value={form.batch_number}
              onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))}
              placeholder="e.g. BATCH-98214"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administered Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={form.administered_date}
                onChange={e => setForm(p => ({ ...p, administered_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Due Date (Booster) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={form.administered_date}
                value={form.next_due_date}
                onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-800">
            ✓ Automated reminder will be queued and sent via WhatsApp/SMS 7 days before the booster due date.
          </div>

          {/* Reaction */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adverse Reactions (if any)
            </label>
            <input
              type="text"
              placeholder="e.g. Mild localized swelling, lethargy for 2 hours"
              value={form.adverse_reaction}
              onChange={e => setForm(p => ({ ...p, adverse_reaction: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Additional vaccination notes..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
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
            disabled={recordMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {recordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {recordMutation.isPending ? 'Recording...' : 'Save Vaccination'}
          </button>
        </div>
      </form>
    </div>
  );
}
