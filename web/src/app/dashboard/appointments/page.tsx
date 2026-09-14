'use client';
import Link from 'next/link';
export default function AppointmentsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <Link href="/dashboard/appointments/new" className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
          + Book Appointment
        </Link>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-slate-600 font-medium">Appointment Calendar</p>
        <p className="text-slate-400 text-sm mt-1">Calendar view with day/week/month — coming in next phase build.</p>
        <p className="text-xs text-teal-600 mt-3 font-medium">API: GET /api/v1/appointments?date=YYYY-MM-DD — live data available ✓</p>
      </div>
    </div>
  );
}
