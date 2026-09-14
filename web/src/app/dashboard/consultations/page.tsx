'use client';
export default function ConsultationsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Consultations</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <p className="text-4xl mb-3">🩺</p>
        <p className="text-slate-600 font-medium">Consultation Workspace</p>
        <p className="text-slate-400 text-sm mt-1">Start from a pet profile or appointment. Full consultation form with vitals, diagnosis, and prescription.</p>
        <p className="text-xs text-teal-600 mt-3 font-medium">API: POST /api/v1/consultations — live ✓</p>
      </div>
    </div>
  );
}
