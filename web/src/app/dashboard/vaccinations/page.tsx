'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Syringe, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

const dueBadge: Record<string, string> = {
  OVERDUE: 'bg-red-100 text-red-700 border-red-200',
  DUE_SOON: 'bg-amber-100 text-amber-700 border-amber-200',
  UPCOMING: 'bg-green-100 text-green-700 border-green-200',
};

export default function VaccinationsPage() {
  const { data: upcoming } = useQuery({
    queryKey: ['vaccinations', 'upcoming'],
    queryFn: async () => { const r = await api.get('/vaccinations', { params: { status: 'upcoming', days_ahead: 30 } }); return r.data.data; },
  });
  const { data: overdue } = useQuery({
    queryKey: ['vaccinations', 'overdue'],
    queryFn: async () => { const r = await api.get('/vaccinations', { params: { status: 'overdue' } }); return r.data.data; },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vaccinations</h1>
          <p className="text-slate-500 text-sm">Track vaccination schedules and reminders</p>
        </div>
        <Link href="/dashboard/vaccinations/new"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Syringe className="w-4 h-4" /> Record Vaccination
        </Link>
      </div>

      {/* Overdue */}
      {overdue && overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-red-800">Overdue Vaccinations ({overdue.length})</h2>
          </div>
          <div className="space-y-2">
            {overdue.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between bg-white border border-red-100 rounded-lg p-3">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{v.pet?.name} — {v.vaccine_name}</p>
                  <p className="text-xs text-slate-500">Owner: {v.pet?.owner?.name} · Was due: {formatDate(v.next_due_date)}</p>
                </div>
                <a href={`https://wa.me/${v.pet?.owner?.whatsapp_number?.replace(/\D/g, '')}?text=${encodeURIComponent(`Reminder: ${v.pet?.name}'s ${v.vaccine_name} is overdue. Please visit us.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors">
                  WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-800">Upcoming (Next 30 Days)</h2>
        </div>
        {!upcoming || upcoming.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No vaccinations due in the next 30 days.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((v: any) => (
              <div key={v.id} className="flex items-center gap-4 border border-slate-100 rounded-xl p-3 hover:border-teal-200 transition-colors">
                <div className={cn('text-xs px-2 py-1 rounded-full border font-medium shrink-0', dueBadge[v.due_status])}>
                  {v.due_status === 'DUE_SOON' ? 'Due Soon' : 'Upcoming'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{v.pet?.name} — {v.vaccine_name}</p>
                  <p className="text-xs text-slate-500">{v.pet?.owner?.name} · Due: {formatDate(v.next_due_date)}</p>
                </div>
                <a href={`https://wa.me/${(v.pet?.owner?.whatsapp_number || v.pet?.owner?.phone)?.replace(/\D/g, '')}?text=${encodeURIComponent(`Reminder: ${v.pet?.name}'s ${v.vaccine_name} is due on ${v.next_due_date}. Please book an appointment.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap">
                  Send Reminder
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
