'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, FlaskConical, Save, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const TEST_TYPES = [
  { value: 'BLOOD_CBC', label: 'Complete Blood Count (CBC)' },
  { value: 'BLOOD_CHEMISTRY', label: 'Serum Biochemistry' },
  { value: 'URINALYSIS', label: 'Urinalysis' },
  { value: 'FECAL', label: 'Fecal Flotation / Parasite Exam' },
  { value: 'CULTURE', label: 'Bacterial Culture & Sensitivity' },
  { value: 'XRAY', label: 'Digital X-Ray / Radiograph' },
  { value: 'ULTRASOUND', label: 'Ultrasonography' },
  { value: 'BIOPSY', label: 'Biopsy / Cytology' },
  { value: 'OTHER', label: 'Other Diagnostic Test' },
];

export default function NewLabTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const prefilledPetId = searchParams.get('pet_id') || '';
  const prefilledConsultationId = searchParams.get('consultation_id') || '';

  const [form, setForm] = useState({
    pet_id: prefilledPetId,
    consultation_id: prefilledConsultationId,
    test_type: 'BLOOD_CBC',
    test_name: 'Complete Blood Count (CBC)',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

  // Load pets
  const { data: pets } = useQuery({
    queryKey: ['pets', 'all'],
    queryFn: async () => {
      const res = await api.get('/pets', { params: { limit: 200 } });
      return res.data.data;
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/lab-tests', {
        pet_id: parseInt(form.pet_id),
        consultation_id: form.consultation_id ? parseInt(form.consultation_id) : undefined,
        test_type: form.test_type,
        test_name: form.test_name.trim(),
        notes: form.notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] });
      if (form.consultation_id) {
        queryClient.invalidateQueries({ queryKey: ['consultation', form.consultation_id] });
        router.push(`/dashboard/consultations/${form.consultation_id}`);
      } else {
        router.push('/dashboard/lab-tests');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to request lab test.');
    },
  });

  const handleTypeChange = (typeVal: string) => {
    const matched = TEST_TYPES.find(t => t.value === typeVal);
    setForm(p => ({
      ...p,
      test_type: typeVal,
      test_name: matched ? matched.label : p.test_name,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.pet_id) {
      setErrorMsg('Please select a patient.');
      return;
    }
    if (!form.test_name.trim()) {
      setErrorMsg('Please enter the test name.');
      return;
    }

    requestMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Request Diagnostic Lab Test</h1>
          <p className="text-slate-500 text-sm">Order in-house or external laboratory investigation</p>
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
            <FlaskConical className="w-4 h-4 text-teal-600" /> Test Specification
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

          {/* Test Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Modality</label>
            <select
              value={form.test_type}
              onChange={e => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {TEST_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Name / Panels <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.test_name}
              onChange={e => setForm(p => ({ ...p, test_name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Clinical Reason / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Indication / Sample Instructions
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Rule out pancreatitis, evaluate kidney function, collect fasting morning serum..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
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
            disabled={requestMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {requestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {requestMutation.isPending ? 'Requesting...' : 'Request Investigation'}
          </button>
        </div>
      </form>
    </div>
  );
}
