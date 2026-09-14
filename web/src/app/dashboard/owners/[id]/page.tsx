'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPKR, formatDate, makeWhatsAppLink, speciesEmoji, cn } from '@/lib/utils';
import {
  ArrowLeft, User, Phone, MessageCircle, MapPin, Mail,
  Plus, PawPrint, Receipt, ChevronRight, AlertCircle, Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function OwnerProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', id],
    queryFn: async () => {
      const res = await api.get(`/owners/${id}`);
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse h-48" />
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-slate-500">Owner not found.</div>;

  const owner = data;
  const pets = owner.pets || [];
  const invoices = owner.invoices || [];
  const outstandingBalance = parseFloat(owner.outstanding_balance || '0');
  const whatsappUrl = makeWhatsAppLink(owner.whatsapp_number || owner.phone, `Hello ${owner.name}, this is regarding your pet(s) at the clinic.`);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Owners
      </button>

      {/* Owner Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
              {owner.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{owner.name}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {pets.length} {pets.length === 1 ? 'Pet' : 'Pets'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {owner.address ? `${owner.address}, ` : ''}{owner.city || 'Pakistan'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Registered on {formatDate(owner.created_at)}</p>
            </div>
          </div>

          {/* Quick Communication & Balance */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`tel:${owner.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4 text-slate-500" /> Call
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>

        {/* Contact details grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 font-medium">Primary Phone</p>
            <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">{owner.phone}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 font-medium">WhatsApp</p>
            <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">{owner.whatsapp_number || 'Same as phone'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 font-medium">Outstanding Balance</p>
            <p className={cn('text-sm font-bold font-mono mt-0.5', outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700')}>
              {formatPKR(outstandingBalance)}
            </p>
          </div>
        </div>

        {owner.notes && (
          <div className="mt-4 p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs text-amber-800">
            <span className="font-semibold">Notes: </span> {owner.notes}
          </div>
        )}
      </div>

      {/* Pets Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-teal-600" /> Registered Pets ({pets.length})
          </h2>
          <Link
            href={`/dashboard/pets/new?owner_id=${owner.id}`}
            className="flex items-center gap-1.5 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Pet
          </Link>
        </div>

        {pets.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <p className="text-2xl mb-1">🐾</p>
            <p className="text-xs text-slate-400">No pets registered yet for this owner.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pets.map((pet: any) => (
              <Link
                key={pet.id}
                href={`/dashboard/pets/${pet.id}`}
                className="flex items-center justify-between p-4 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/20 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl shrink-0">
                    {speciesEmoji[pet.species?.name] || '🐾'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
                      {pet.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {pet.species?.name} {pet.breed ? `· ${pet.breed.name}` : ''}
                    </p>
                    {pet.weight_kg && (
                      <p className="text-[11px] text-teal-600 mt-0.5">{pet.weight_kg} kg</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Invoices History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-600" /> Invoices & Bills ({invoices.length})
          </h2>
          <Link
            href={`/dashboard/billing/create?owner_id=${owner.id}`}
            className="flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Create Invoice
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-xs text-slate-400">No invoices generated yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs font-bold text-slate-800">{inv.invoice_number}</p>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold',
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      inv.status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    )}>
                      {inv.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Issued: {formatDate(inv.created_at)}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-slate-900">{formatPKR(inv.total_amount)}</p>
                    {parseFloat(inv.due_amount) > 0 && (
                      <p className="text-[11px] text-rose-600 font-semibold font-mono">Due: {formatPKR(inv.due_amount)}</p>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/billing/${inv.id}`}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
