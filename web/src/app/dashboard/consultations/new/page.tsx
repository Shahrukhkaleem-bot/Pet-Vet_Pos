'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { ArrowLeft, Save, Loader2, Stethoscope, Thermometer, Heart, Wind, Weight, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function NewConsultationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const petId = searchParams.get('pet_id') || '';
  const appointmentId = searchParams.get('appointment_id') || '';

  const [form, setForm] = useState({
    pet_id: petId,
    appointment_id: appointmentId,
    chief_complaint: '',
    symptoms: '',
    physical_exam: '',
    temperature_f: '',
    heart_rate_bpm: '',
    respiratory_rate: '',
    weight_kg: '',
    diagnosis: '',
    treatment_plan: '',
    clinical_notes: '',
    follow_up_date: '',
    follow_up_notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load pet info
  const { data: pet } = useQuery({
    queryKey: ['pet', petId],
    queryFn: async () => { const r = await api.get(`/pets/${petId}`); return r.data.data; },
    enabled: !!petId,
  });

  // Load pets for dropdown if no pet_id
  const { data: pets } = useQuery({
    queryKey: ['pets', 'all'],
    queryFn: async () => { const r = await api.get('/pets', { params: { limit: 200 } }); return r.data.data; },
    enabled: !petId,
  });

  const { mutate, isPending, error: apiError } = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      // Clean empty optionals
      ['temperature_f', 'heart_rate_bpm', 'respiratory_rate', 'weight_kg'].forEach(f => {
        if (!payload[f]) delete payload[f]; else payload[f] = parseFloat(payload[f]);
      });
      if (!payload.follow_up_date) delete payload.follow_up_date;
      if (!payload.follow_up_notes) delete payload.follow_up_notes;
      if (!payload.appointment_id) delete payload.appointment_id;
      if (!payload.symptoms) delete payload.symptoms;
      if (!payload.physical_exam) delete payload.physical_exam;
      if (!payload.clinical_notes) delete payload.clinical_notes;

      const res = await api.post('/consultations', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pet', petId] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      router.push(`/dashboard/consultations/${data.data.id}`);
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.pet_id) e.pet_id = 'Please select a pet.';
    if (!form.chief_complaint.trim()) e.chief_complaint = 'Chief complaint is required.';
    if (!form.diagnosis.trim()) e.diagnosis = 'Diagnosis is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutate();
  };

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Consultation</h1>
          {pet && (
            <p className="text-slate-500 text-sm">
              {pet.name} — {pet.species?.name} · {pet.owner?.name}
            </p>
          )}
        </div>
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {(apiError as any)?.response?.data?.message || 'Failed to save consultation.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Pet selection (if not pre-filled) */}
        {!petId && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Patient <span className="text-red-500">*</span>
            </label>
            <select
              value={form.pet_id}
              onChange={e => set('pet_id', e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white ${errors.pet_id ? 'border-red-300' : 'border-slate-200'}`}
            >
              <option value="">Select patient...</option>
              {(pets || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.species?.name}) — {p.owner?.name}</option>
              ))}
            </select>
            {errors.pet_id && <p className="text-red-500 text-xs mt-1">{errors.pet_id}</p>}
          </div>
        )}

        {/* Vitals */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-teal-600" /> Vitals & Weight
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Thermometer className="w-3 h-3" /> Temp (°F)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.temperature_f}
                onChange={e => set('temperature_f', e.target.value)}
                placeholder="101.5"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Heart className="w-3 h-3" /> Heart Rate
              </label>
              <input
                type="number"
                value={form.heart_rate_bpm}
                onChange={e => set('heart_rate_bpm', e.target.value)}
                placeholder="80 bpm"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Wind className="w-3 h-3" /> Resp. Rate
              </label>
              <input
                type="number"
                value={form.respiratory_rate}
                onChange={e => set('respiratory_rate', e.target.value)}
                placeholder="/min"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Weight className="w-3 h-3" /> Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.weight_kg}
                onChange={e => set('weight_kg', e.target.value)}
                placeholder="kg"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Clinical Assessment */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" /> Clinical Assessment
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Chief Complaint <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.chief_complaint}
              onChange={e => set('chief_complaint', e.target.value)}
              placeholder="Reason for visit / presenting problem"
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${errors.chief_complaint ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {errors.chief_complaint && <p className="text-red-500 text-xs mt-1">{errors.chief_complaint}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Symptoms Observed</label>
            <textarea
              value={form.symptoms}
              onChange={e => set('symptoms', e.target.value)}
              rows={2}
              placeholder="List observed symptoms..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Physical Examination Findings</label>
            <textarea
              value={form.physical_exam}
              onChange={e => set('physical_exam', e.target.value)}
              rows={3}
              placeholder="Describe physical exam findings (auscultation, palpation, etc.)"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Diagnosis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.diagnosis}
              onChange={e => set('diagnosis', e.target.value)}
              rows={2}
              placeholder="Working diagnosis..."
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none ${errors.diagnosis ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {errors.diagnosis && <p className="text-red-500 text-xs mt-1">{errors.diagnosis}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Treatment Plan</label>
            <textarea
              value={form.treatment_plan}
              onChange={e => set('treatment_plan', e.target.value)}
              rows={3}
              placeholder="Outline the treatment plan and instructions..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
            <textarea
              value={form.clinical_notes}
              onChange={e => set('clinical_notes', e.target.value)}
              rows={2}
              placeholder="Internal notes, prognosis, client instructions..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
            />
          </div>
        </div>

        {/* Follow-up */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" /> Follow-up
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={e => set('follow_up_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Notes</label>
              <input
                type="text"
                value={form.follow_up_notes}
                onChange={e => set('follow_up_notes', e.target.value)}
                placeholder="Reason for follow-up"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>
          {form.follow_up_date && (
            <p className="text-xs text-teal-600 bg-teal-50 rounded-lg px-3 py-2">
              ✓ A reminder will be automatically created 24h before this date.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Saving...' : 'Save Consultation'}
          </button>
        </div>
      </form>
    </div>
  );
}
