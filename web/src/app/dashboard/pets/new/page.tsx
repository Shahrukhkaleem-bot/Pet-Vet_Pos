'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Loader2, Upload, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const GENDERS = ['MALE', 'FEMALE', 'UNKNOWN'];

export default function NewPetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const prefilledOwnerId = searchParams.get('owner_id') || '';

  const [form, setForm] = useState({
    owner_id: prefilledOwnerId,
    name: '',
    species_id: '',
    breed_id: '',
    gender: 'MALE',
    date_of_birth: '',
    weight_kg: '',
    color: '',
    microchip_id: '',
    allergies: '',
    existing_conditions: '',
    notes: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load species list
  const { data: speciesData } = useQuery({
    queryKey: ['species'],
    queryFn: async () => { const r = await api.get('/pets/meta/species'); return r.data.data; },
  });

  // Load breeds for selected species
  const { data: breedsData } = useQuery({
    queryKey: ['breeds', form.species_id],
    queryFn: async () => {
      if (!form.species_id) return [];
      const r = await api.get(`/pets/meta/species/${form.species_id}/breeds`);
      return r.data.data;
    },
    enabled: !!form.species_id,
  });

  // Load owners for dropdown
  const { data: ownersData } = useQuery({
    queryKey: ['owners', 'all'],
    queryFn: async () => { const r = await api.get('/owners', { params: { limit: 200 } }); return r.data.data; },
  });

  const { mutate, isPending, error: apiError } = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (photo) formData.append('photo', photo);
      const res = await api.post('/pets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      router.push(`/dashboard/pets/${data.data.id}`);
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.owner_id) e.owner_id = 'Please select an owner.';
    if (!form.name.trim()) e.name = 'Pet name is required.';
    if (!form.species_id) e.species_id = 'Please select a species.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutate();
  };

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value, ...(field === 'species_id' ? { breed_id: '' } : {}) }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pets" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register New Pet</h1>
          <p className="text-slate-500 text-sm">Add a new patient to the clinic</p>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {(apiError as any)?.response?.data?.message || 'Failed to register pet.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Pet Photo</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">🐾</span>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors">
                <Upload className="w-4 h-4" />
                {photo ? photo.name : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              <p className="text-xs text-slate-400 mt-1.5">JPG, PNG up to 5MB</p>
              {photo && (
                <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  className="mt-1 flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Basic Information</h2>

          {/* Owner */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Owner <span className="text-red-500">*</span>
            </label>
            <select
              value={form.owner_id}
              onChange={e => set('owner_id', e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white ${errors.owner_id ? 'border-red-300' : 'border-slate-200'}`}
            >
              <option value="">Select owner...</option>
              {(ownersData || []).map((o: any) => (
                <option key={o.id} value={o.id}>{o.name} — {o.phone}</option>
              ))}
            </select>
            {errors.owner_id && <p className="text-red-500 text-xs mt-1">{errors.owner_id}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pet Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Bruno, Bella, Whiskers"
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Species & Breed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Species <span className="text-red-500">*</span>
              </label>
              <select
                value={form.species_id}
                onChange={e => set('species_id', e.target.value)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white ${errors.species_id ? 'border-red-300' : 'border-slate-200'}`}
              >
                <option value="">Select species...</option>
                {(speciesData || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.species_id && <p className="text-red-500 text-xs mt-1">{errors.species_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Breed</label>
              <select
                value={form.breed_id}
                onChange={e => set('breed_id', e.target.value)}
                disabled={!form.species_id || !breedsData?.length}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select breed (optional)</option>
                {(breedsData || []).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Gender, DOB, Weight, Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
              >
                {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => set('date_of_birth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.01"
                value={form.weight_kg}
                onChange={e => set('weight_kg', e.target.value)}
                placeholder="e.g. 28.5"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color / Coat</label>
              <input
                type="text"
                value={form.color}
                onChange={e => set('color', e.target.value)}
                placeholder="e.g. Black and Tan"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Microchip ID</label>
            <input
              type="text"
              value={form.microchip_id}
              onChange={e => set('microchip_id', e.target.value)}
              placeholder="Optional microchip number"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
            />
          </div>
        </div>

        {/* Medical Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-800">Medical Alerts</h2>
          </div>
          <p className="text-xs text-slate-500">These will be prominently displayed across the app as warnings.</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Known Allergies</label>
            <input
              type="text"
              value={form.allergies}
              onChange={e => set('allergies', e.target.value)}
              placeholder="e.g. Penicillin, Chicken protein"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Existing Conditions</label>
            <input
              type="text"
              value={form.existing_conditions}
              onChange={e => set('existing_conditions', e.target.value)}
              placeholder="e.g. Hip Dysplasia, Diabetes"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Temperament, special handling instructions, etc."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <Link href="/dashboard/pets"
            className="flex-1 text-center py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Registering...' : 'Register Pet'}
          </button>
        </div>
      </form>
    </div>
  );
}
