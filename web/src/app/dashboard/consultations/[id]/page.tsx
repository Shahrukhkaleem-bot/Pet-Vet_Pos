'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import { ArrowLeft, Stethoscope, Syringe, FileText, Plus, Thermometer, Heart, Wind, Weight, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ConsultationDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['consultation', id],
    queryFn: async () => {
      const r = await api.get(`/consultations/${id}`);
      return r.data.data;
    },
  });

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse h-32" />
      ))}
    </div>
  );

  if (!data) return <div className="text-center py-20 text-slate-500">Consultation not found.</div>;

  const cons = data;
  const pet = cons.pet;
  const doctor = cons.doctor;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultation Record</h1>
          <p className="text-slate-500 text-sm">{formatDateTime(cons.consultation_date)} · Dr. {doctor?.name}</p>
        </div>
      </div>

      {/* Patient info bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-2xl">
            {pet?.species?.name === 'Dog' ? '🐕' : pet?.species?.name === 'Cat' ? '🐈' : '🐾'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800">{pet?.name}</p>
              <span className="text-xs text-slate-400">·</span>
              <p className="text-sm text-slate-500">{pet?.species?.name} {pet?.breed ? `· ${pet?.breed?.name}` : ''}</p>
            </div>
            <p className="text-sm text-slate-600">{pet?.owner?.name} · {pet?.owner?.phone}</p>
          </div>
        </div>
        <Link href={`/dashboard/pets/${pet?.id}`} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
          Pet Profile <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Vitals */}
      {(cons.temperature_f || cons.heart_rate_bpm || cons.respiratory_rate || cons.weight_kg) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-teal-600" /> Vitals
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cons.temperature_f && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Temperature</p>
                <p className={cn('text-lg font-bold', parseFloat(cons.temperature_f) > 102.5 ? 'text-red-600' : 'text-slate-800')}>
                  {cons.temperature_f}°F
                </p>
              </div>
            )}
            {cons.heart_rate_bpm && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Heart Rate</p>
                <p className="text-lg font-bold text-slate-800">{cons.heart_rate_bpm} <span className="text-xs font-normal text-slate-400">bpm</span></p>
              </div>
            )}
            {cons.respiratory_rate && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Resp. Rate</p>
                <p className="text-lg font-bold text-slate-800">{cons.respiratory_rate} <span className="text-xs font-normal text-slate-400">/min</span></p>
              </div>
            )}
            {cons.weight_kg && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Weight</p>
                <p className="text-lg font-bold text-teal-700">{cons.weight_kg} <span className="text-xs font-normal text-slate-400">kg</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clinical notes */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-600" /> Clinical Assessment
        </h2>

        {[
          { label: 'Chief Complaint', value: cons.chief_complaint },
          { label: 'Symptoms', value: cons.symptoms },
          { label: 'Physical Examination', value: cons.physical_exam },
          { label: 'Diagnosis', value: cons.diagnosis, highlight: true },
          { label: 'Treatment Plan', value: cons.treatment_plan },
          { label: 'Clinical Notes', value: cons.clinical_notes },
        ].filter(f => f.value).map(({ label, value, highlight }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={cn('text-sm text-slate-700 leading-relaxed', highlight && 'font-semibold text-slate-900 text-base')}>{value}</p>
          </div>
        ))}

        {cons.follow_up_date && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Calendar className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Follow-up: {formatDate(cons.follow_up_date)}</p>
              {cons.follow_up_notes && <p className="text-xs text-amber-700">{cons.follow_up_notes}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Prescriptions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" /> Prescriptions ({cons.prescriptions?.length || 0})
          </h2>
          <Link
            href={`/dashboard/consultations/${id}/prescriptions/new`}
            className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Rx
          </Link>
        </div>
        {!cons.prescriptions?.length ? (
          <p className="text-slate-400 text-sm text-center py-4">No prescriptions yet.</p>
        ) : (
          <div className="space-y-3">
            {cons.prescriptions.map((rx: any) => (
              <div key={rx.id} className="border border-purple-100 bg-purple-50/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">{formatDateTime(rx.created_at)}</p>
                  {rx.pdf_path && (
                    <a href={`http://localhost:5000${rx.pdf_path}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Download PDF
                    </a>
                  )}
                </div>
                <div className="space-y-1">
                  {rx.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-purple-400 rounded-full shrink-0" />
                      <span className="font-medium text-slate-700">{item.medicine?.name}</span>
                      <span className="text-slate-400">—</span>
                      <span className="text-slate-600">{item.dosage} · {item.frequency} · {item.duration_days} days</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lab tests */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-blue-600" /> Lab Tests ({cons.lab_tests?.length || 0})
          </h2>
          <Link
            href={`/dashboard/lab-tests/new?consultation_id=${id}&pet_id=${pet?.id}`}
            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3 h-3" /> Request Test
          </Link>
        </div>
        {!cons.lab_tests?.length ? (
          <p className="text-slate-400 text-sm text-center py-4">No lab tests requested.</p>
        ) : (
          <div className="space-y-2">
            {cons.lab_tests.map((lt: any) => (
              <div key={lt.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{lt.test_name}</p>
                  <p className="text-xs text-slate-400">{lt.test_type?.replaceAll('_', ' ')}</p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  lt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {lt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Link
          href={`/dashboard/billing/create?pet_id=${pet?.id}&consultation_id=${id}`}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Create Invoice for this Consultation
        </Link>
      </div>
    </div>
  );
}
