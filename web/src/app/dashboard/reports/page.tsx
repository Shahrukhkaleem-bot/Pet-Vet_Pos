'use client';
export default function ReportsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Reports & Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Revenue Report', 'Appointment Report', 'Vaccination Report', 'Medicine Sales', 'Doctor Performance', 'Inventory Report'].map(r => (
          <div key={r} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-teal-200 hover:shadow-sm transition-all cursor-pointer">
            <p className="font-semibold text-slate-800">{r}</p>
            <p className="text-slate-400 text-sm mt-1">CSV & PDF export — Phase 2</p>
          </div>
        ))}
      </div>
    </div>
  );
}
