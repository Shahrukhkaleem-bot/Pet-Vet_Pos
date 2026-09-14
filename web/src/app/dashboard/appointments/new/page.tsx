'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Calendar, Clock, Save, Loader2, User, PawPrint, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const APPT_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'VACCINATION', label: 'Vaccination' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'SURGERY', label: 'Surgery / Procedure' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'GROOMING', label: 'Grooming' },
];

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const prefilledPetId = searchParams.get('pet_id') || '';

  const [form, setForm] = useState({
    pet_id: prefilledPetId,
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    appointment_type: 'CONSULTATION',
    reason: '',
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

  // Load doctors (clinic staff)
  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get('/auth/me'); // To get clinic context, or fetch users
      // Or fetch from appointments meta / users
      return [
        { id: 3, name: 'Dr. Ahmed Khan', specialization: 'Small Animal Specialist' },
        { id: 4, name: 'Dr. Sara Ali', specialization: 'Feline Medicine & Surgery' },
      ];
    },
  });

  const selectedPet = (pets || []).find((p: any) => p.id.toString() === form.pet_id);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/appointments', {
        pet_id: parseInt(form.pet_id),
        doctor_id: parseInt(form.doctor_id),
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        appointment_type: form.appointment_type,
        reason: form.reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      router.push('/dashboard/appointments');
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to book appointment.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.pet_id) {
      setErrorMsg('Please select a patient.');
      return;
    }
    if (!form.doctor_id) {
      setErrorMsg('Please select a doctor.');
      return;
    }
    if (!form.appointment_date) {
      setErrorMsg('Please select a date.');
      return;
    }
    if (!form.start_time) {
      setErrorMsg('Please select a time.');
      return;
    }

    bookMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Appointments
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Book Appointment</h1>
          <p className="text-slate-500 text-sm">Schedule a clinic visit</p>
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
            <PawPrint className="w-4 h-4 text-teal-600" /> Patient Details
          </h2>

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
                  {p.name} ({p.species?.name}) — Owner: {p.owner?.name} ({p.owner?.phone})
                </option>
              ))}
            </select>
          </div>

          {selectedPet && (
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-900 flex items-center justify-between">
              <div>
                <p className="font-bold">{selectedPet.name} ({selectedPet.species?.name} {selectedPet.breed ? `· ${selectedPet.breed.name}` : ''})</p>
                <p className="text-teal-700 mt-0.5">Owner: {selectedPet.owner?.name} · {selectedPet.owner?.phone}</p>
              </div>
              <Link href={`/dashboard/pets/${selectedPet.id}`} className="font-semibold underline text-teal-700">
                Medical Record
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" /> Schedule Details
          </h2>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attending Veterinarian <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.doctor_id}
              onChange={e => setForm(p => ({ ...p, doctor_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- Choose doctor --</option>
              {doctors?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Appointment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.appointment_date}
                onChange={e => setForm(p => ({ ...p, appointment_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Slot <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Type</label>
            <select
              value={form.appointment_type}
              onChange={e => setForm(p => ({ ...p, appointment_type: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {APPT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Reason for Visit</label>
            <input
              type="text"
              placeholder="e.g. Routine vaccination, vomiting since yesterday, limp on left paw"
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Special instructions, pet temperament, owner requests..."
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
            disabled={bookMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {bookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bookMutation.isPending ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
}
