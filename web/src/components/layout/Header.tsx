'use client';

import { useAuth } from '@/lib/auth-context';
import { Bell, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function Header() {
  const { user } = useAuth();
  const today = new Date();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      {/* Left — Search */}
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search pets, owners, invoices..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent w-72 bg-slate-50"
          />
        </div>
      </div>

      {/* Right — Clinic info + notifications */}
      <div className="flex items-center gap-4">
        <div className="hidden md:block text-right">
          <p className="text-xs text-slate-500">
            {today.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Karachi' })}
          </p>
          <p className="text-xs text-teal-600 font-medium">{user?.clinic?.city || 'Pakistan'}</p>
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
