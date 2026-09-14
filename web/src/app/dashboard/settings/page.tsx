'use client';
import { useAuth } from '@/lib/auth-context';
export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Clinic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-slate-400 mb-1">Clinic Name</p><p className="font-medium text-slate-800">{user?.clinic?.name}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">City</p><p className="font-medium text-slate-800">{user?.clinic?.city}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Currency</p><p className="font-medium text-slate-800">{user?.clinic?.currency}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Status</p>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{user?.clinic?.status}</span>
          </div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Your Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-slate-400 mb-1">Name</p><p className="font-medium text-slate-800">{user?.name}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Email</p><p className="font-medium text-slate-800">{user?.email}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Role</p><p className="font-medium text-slate-800 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Phone</p><p className="font-medium text-slate-800">{user?.phone}</p></div>
        </div>
      </div>
    </div>
  );
}
