'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatPKR, formatDate, formatDateTime, cn } from '@/lib/utils';
import {
  ArrowLeft, Receipt, CreditCard, Download, Printer, Plus,
  CheckCircle2, Clock, AlertCircle, User, PawPrint, Calendar
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Credit/Debit Card' },
  { value: 'OTHER', label: 'Other' },
];

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'CASH',
    transaction_reference: '',
    notes: '',
  });
  const [payError, setPayError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data.data;
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/invoices/${id}/payments`, {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_method: 'CASH', transaction_reference: '', notes: '' });
      setPayError('');
    },
    onError: (err: any) => {
      setPayError(err?.response?.data?.message || 'Payment recording failed.');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse h-64" />
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-slate-500">Invoice not found.</div>;

  const invoice = data;
  const dueAmount = parseFloat(invoice.due_amount) || 0;
  const isPaid = invoice.status === 'PAID';

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PARTIALLY_PAID':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'UNPAID':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          {invoice.pdf_path && (
            <a
              href={`${API_URL}${invoice.pdf_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Download PDF
            </a>
          )}
          {!isPaid && (
            <button
              onClick={() => {
                setPaymentForm(p => ({ ...p, amount: dueAmount.toString() }));
                setShowPaymentModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <CreditCard className="w-4 h-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Invoice Main Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
        {/* Invoice Header */}
        <div className="flex flex-wrap items-start justify-between border-b border-slate-100 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900">{invoice.invoice_number}</h1>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold border', statusBadge(invoice.status))}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Issued on: {formatDateTime(invoice.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total Amount</p>
            <p className="text-2xl font-black text-slate-900">{formatPKR(invoice.total_amount)}</p>
            {dueAmount > 0 && (
              <p className="text-xs text-rose-600 font-semibold mt-0.5">Remaining Due: {formatPKR(dueAmount)}</p>
            )}
          </div>
        </div>

        {/* Parties Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 rounded-xl p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" /> Billed To (Owner)
            </p>
            <p className="text-sm font-bold text-slate-800">{invoice.owner?.name}</p>
            <p className="text-xs text-slate-600 mt-0.5 font-mono">{invoice.owner?.phone}</p>
            {invoice.owner?.address && <p className="text-xs text-slate-500 mt-0.5">{invoice.owner.address}</p>}
            <Link
              href={`/dashboard/owners/${invoice.owner?.id}`}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium inline-block mt-2"
            >
              View Owner Profile →
            </Link>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <PawPrint className="w-3.5 h-3.5 text-teal-600" /> Patient (Pet)
            </p>
            <p className="text-sm font-bold text-slate-800">{invoice.pet?.name}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {invoice.pet?.species?.name} {invoice.pet?.breed ? `· ${invoice.pet.breed.name}` : ''}
            </p>
            <Link
              href={`/dashboard/pets/${invoice.pet?.id}`}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium inline-block mt-2"
            >
              View Medical Record →
            </Link>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Invoice Items</h3>
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Item / Description</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{item.description}</p>
                      {item.medicine && (
                        <p className="text-xs text-slate-400">Generic: {item.medicine.generic_name || 'N/A'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {item.item_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{formatPKR(item.unit_price)}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {formatPKR(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Calculation */}
        <div className="flex justify-end pt-2">
          <div className="w-full md:w-72 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">{formatPKR(invoice.subtotal)}</span>
            </div>
            {parseFloat(invoice.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-mono font-medium">- {formatPKR(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total:</span>
              <span className="font-mono text-lg text-teal-700">{formatPKR(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Paid to Date:</span>
              <span className="font-mono font-semibold text-emerald-600">{formatPKR(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-1 text-rose-600">
              <span>Balance Due:</span>
              <span className="font-mono">{formatPKR(invoice.due_amount)}</span>
            </div>
          </div>
        </div>

        {/* Payments History */}
        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" /> Payments Received
            </h3>
            {!isPaid && (
              <button
                onClick={() => {
                  setPaymentForm(p => ({ ...p, amount: dueAmount.toString() }));
                  setShowPaymentModal(true);
                }}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Payment
              </button>
            )}
          </div>

          {!invoice.payments || invoice.payments.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-400 text-xs">
              No payments recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {invoice.payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{payment.payment_method.replace('_', ' ')}</p>
                      <p className="text-slate-400">{formatDateTime(payment.paid_at)}</p>
                      {payment.transaction_reference && (
                        <p className="text-slate-500 font-mono mt-0.5">Ref: {payment.transaction_reference}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-emerald-700">{formatPKR(payment.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {payError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {payError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">Rs.</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={dueAmount}
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    placeholder="e.g. 2500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Remaining balance: {formatPKR(dueAmount)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction / Slip Reference
                </label>
                <input
                  type="text"
                  value={paymentForm.transaction_reference}
                  onChange={e => setPaymentForm(p => ({ ...p, transaction_reference: e.target.value }))}
                  placeholder="e.g. TRX12345678 or Slip #"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes about payment"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={paymentMutation.isPending || !paymentForm.amount}
                onClick={() => paymentMutation.mutate()}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-sm font-semibold"
              >
                {paymentMutation.isPending ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
