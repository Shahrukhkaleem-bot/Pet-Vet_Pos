'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Pet, Consultation, Vaccination } from '@/lib/types';
import { formatDate, formatPKR, cn, speciesEmoji } from '@/lib/utils';
import {
  ArrowLeft, Stethoscope, Syringe, FlaskConical, Receipt,
  Calendar, Weight, Thermometer, AlertCircle, PawPrint, Edit, Plus, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

const dueBadge = (status: string) => {
  const m: Record<string, string> = {
    OVERDUE: 'bg-red-100 text-red-700',
    DUE_SOON: 'bg-amber-100 text-amber-700',
    UPCOMING: 'bg-green-100 text-green-700',
  };
  return m[status] || 'bg-slate-100 text-slate-600';
};

export default function PetDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['pet', id],
    queryFn: async () => {
      const res = await api.get(`/pets/${id}`);
      return res.data.data as Pet & { consultations?: Consultation[]; vaccinations?: Vaccination[]; upcoming_vaccinations?: Vaccination[] };
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse h-48" />
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-slate-500">Pet not found.</div>;

  const pet = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Pets
      </button>

      {/* Pet Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-teal-50 flex items-center justify-center text-5xl border-2 border-teal-100 shrink-0">
            {pet.photo_path ? (
              <img src={`${API_URL}${pet.photo_path}`} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              speciesEmoji[pet.species?.name] || '🐾'
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{pet.name}</h1>
                <p className="text-slate-500 mt-1">
                  {pet.species?.name} {pet.breed ? `· ${pet.breed.name}` : ''} ·{' '}
                  {pet.gender === 'MALE' ? 'Male ♂' : pet.gender === 'FEMALE' ? 'Female ♀' : 'Unknown'}
                </p>
              </div>
              <Link
                href={`/dashboard/pets/${pet.id}/edit`}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-teal-200 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </Link>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-400">Age</p>
                <p className="text-sm font-semibold text-slate-700">
                  {pet.age_years}y {pet.age_months}m
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Weight</p>
                <p className="text-sm font-semibold text-slate-700">{pet.weight_kg || 'N/A'} kg</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">DOB</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(pet.date_of_birth)}</p>
              </div>
              {pet.microchip_id && (
                <div>
                  <p className="text-xs text-slate-400">Microchip</p>
                  <p className="text-sm font-semibold text-slate-700 font-mono text-xs">{pet.microchip_id}</p>
                </div>
              )}
            </div>

            {/* Owner */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Owner</p>
                <p className="text-sm font-semibold text-slate-800">{pet.owner?.name}</p>
                <p className="text-xs text-slate-500">{pet.owner?.phone}</p>
              </div>
              <Link href={`/dashboard/owners/${pet.owner?.id}`} className="text-xs text-teal-600 hover:text-teal-700">
                View Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(pet.allergies || pet.existing_conditions) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {pet.allergies && <p className="text-sm text-amber-800"><span className="font-semibold">Allergies:</span> {pet.allergies}</p>}
                {pet.existing_conditions && <p className="text-sm text-amber-800 mt-0.5"><span className="font-semibold">Conditions:</span> {pet.existing_conditions}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/dashboard/consultations/new?pet_id=${pet.id}`}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Stethoscope className="w-4 h-4" /> New Consultation
        </Link>
        <Link href={`/dashboard/appointments/new?pet_id=${pet.id}`}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Calendar className="w-4 h-4" /> Book Appointment
        </Link>
        <Link href={`/dashboard/vaccinations/new?pet_id=${pet.id}`}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Syringe className="w-4 h-4" /> Add Vaccination
        </Link>
        <Link href={`/dashboard/billing/create?pet_id=${pet.id}`}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Receipt className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Medical History + Vaccinations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Medical History Timeline */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" /> Medical History
            </h2>
          </div>
          {!pet.consultations || pet.consultations.length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No consultation records yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pet.consultations.map((cons) => (
                <Link key={cons.id} href={`/dashboard/consultations/${cons.id}`}
                  className="block border border-slate-200 rounded-xl p-4 hover:border-teal-200 hover:bg-teal-50/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">{formatDate(cons.consultation_date)}</p>
                        <span className="text-xs text-teal-600 font-medium">Dr. {cons.doctor?.name}</span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm mt-1">{cons.chief_complaint}</p>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{cons.diagnosis}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                  </div>
                  {cons.prescriptions && cons.prescriptions.length > 0 && (
                    <p className="text-xs text-purple-600 mt-2">
                      📋 {cons.prescriptions[0].items?.length || 0} medicine(s) prescribed
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Vaccinations */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Syringe className="w-4 h-4 text-purple-600" /> Vaccinations
          </h2>
          {!pet.vaccinations || pet.vaccinations.length === 0 ? (
            <div className="text-center py-8">
              <Syringe className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No vaccination records yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pet.vaccinations.map((vac) => (
                <div key={vac.id} className="border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800 truncate">{vac.vaccine_name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2', dueBadge(vac.due_status))}>
                      {vac.due_status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Given: {formatDate(vac.administered_date)}</p>
                  <p className="text-xs text-slate-500">Next due: {formatDate(vac.next_due_date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}



