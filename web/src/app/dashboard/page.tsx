'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardStats, Appointment } from '@/lib/types';
import { formatPKR, formatDate, statusColors, speciesEmoji, makeWhatsAppLink } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Users, CheckCircle2, Syringe, TrendingUp,
  AlertTriangle, Package, Clock, Banknote, CreditCard, MessageCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, subtitle, isCurrency = false
}: {
  label: string; value: number; icon: any; color: string; subtitle?: string; isCurrency?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn('p-3 rounded-xl', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-900 leading-tight">
          {isCurrency ? formatPKR(value) : value.toLocaleString()}
        </p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Queue Token Card ───────────────────────────────────────────────────────────

function QueueCard({ appt }: { appt: Appointment }) {
  const whatsappMsg = `Hello ${appt.pet.owner.name}, your pet ${appt.pet.name} is being called for the appointment with ${appt.doctor.name}. Token #${String(appt.token_number).padStart(2, '0')}`;
  const wLink = makeWhatsAppLink(appt.pet.owner.whatsapp_number || appt.pet.owner.phone, whatsappMsg);

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-200 transition-colors group">
      <div className="w-10 h-10 bg-teal-50 border-2 border-teal-200 rounded-xl flex items-center justify-center">
        <span className="text-teal-700 font-bold text-sm">
          #{String(appt.token_number).padStart(2, '0')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{speciesEmoji[appt.pet.species?.name] || '🐾'}</span>
          <p className="font-semibold text-slate-800 text-sm truncate">{appt.pet.name}</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[appt.status])}>
            {appt.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {appt.pet.owner.name} · {appt.doctor.name} · {appt.start_time}
        </p>
      </div>
      <a
        href={wLink}
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all"
        title="Send WhatsApp message"
      >
        <MessageCircle className="w-4 h-4" />
      </a>
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: dashData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-6 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium">Failed to load dashboard data.</p>
        <p className="text-red-500 text-sm mt-1">Please check your connection and try again.</p>
      </div>
    );
  }

  const stats: DashboardStats = dashData?.stats || {};
  const queue: Appointment[] = dashData?.queue || [];
  const recentPets = dashData?.recent_pets || [];
  const revenueTrend = dashData?.revenue_trend || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinic Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Karachi' })}
          </p>
        </div>
        <span className="hidden md:flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Clinic Open
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Appointments" value={stats.today_appointments ?? 0} icon={CalendarDays} color="bg-blue-50 text-blue-600" />
        <StatCard label="Waiting Patients" value={stats.waiting_patients ?? 0} icon={Clock} color="bg-amber-50 text-amber-600" subtitle="In queue" />
        <StatCard label="Completed Today" value={stats.completed_today ?? 0} icon={CheckCircle2} color="bg-green-50 text-green-600" />
        <StatCard label="Vaccinations Due" value={stats.vaccinations_due_soon ?? 0} icon={Syringe} color="bg-purple-50 text-purple-600" subtitle="Next 7 days" />
        <StatCard label="Revenue Today" value={stats.revenue_today ?? 0} icon={Banknote} color="bg-teal-50 text-teal-600" isCurrency />
        <StatCard label="This Month" value={stats.revenue_this_month ?? 0} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" isCurrency />
        <StatCard label="Outstanding" value={stats.outstanding_balance ?? 0} icon={CreditCard} color="bg-red-50 text-red-500" isCurrency subtitle="Pending payments" />
        <StatCard label="Low Stock Alerts" value={stats.low_stock_alerts ?? 0} icon={Package} color="bg-orange-50 text-orange-500" subtitle="Medicines" />
      </div>

      {/* Revenue Chart + Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Revenue — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip
                formatter={(value: any) => [formatPKR(Number(value)), 'Revenue']}
                labelFormatter={(label: any) => `Date: ${label}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#0D9488"
                fill="#CCFBF1"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Live Queue</h2>
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
              {queue.length} patients
            </span>
          </div>
          {queue.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Queue is clear!</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-72">
              {queue.map((appt) => <QueueCard key={appt.id} appt={appt} />)}
            </div>
          )}
        </div>
      </div>

      {/* Recent Pets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Recently Registered Pets</h2>
        {recentPets.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No pets registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {recentPets.map((pet: any) => (
              <a key={pet.id} href={`/dashboard/pets/${pet.id}`}
                className="flex flex-col items-center p-4 border border-slate-200 rounded-xl hover:border-teal-200 hover:bg-teal-50/30 transition-all group text-center">
                <div className="w-12 h-12 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform">
                  {pet.photo_path ? (
                    <img src={`http://localhost:5000${pet.photo_path}`} alt={pet.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    speciesEmoji[pet.species?.name] || '🐾'
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate w-full">{pet.name}</p>
                <p className="text-xs text-slate-500 truncate w-full">{pet.owner?.name}</p>
              </a>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
