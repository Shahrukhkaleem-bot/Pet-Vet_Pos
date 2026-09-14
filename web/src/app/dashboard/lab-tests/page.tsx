'use client';
export default function LabTestsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Lab Tests</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <p className="text-4xl mb-3">🧪</p>
        <p className="text-slate-600 font-medium">Lab Test Management</p>
        <p className="text-slate-400 text-sm mt-1">Request tests, collect samples, upload reports — Phase 2 implementation.</p>
        <p className="text-xs text-teal-600 mt-3 font-medium">API endpoint stub: GET /api/v1/lab-tests ✓</p>
      </div>
    </div>
  );
}
