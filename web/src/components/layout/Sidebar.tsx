'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  PawPrint, LayoutDashboard, Users, Dog, CalendarDays,
  Stethoscope, Syringe, FlaskConical, Package, Receipt,
  BarChart3, Settings, LogOut, ChevronLeft, Menu,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
  { href: '/dashboard/owners', icon: Users, label: 'Pet Owners', roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
  { href: '/dashboard/pets', icon: Dog, label: 'Pets', roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
  { href: '/dashboard/appointments', icon: CalendarDays, label: 'Appointments', roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
  { href: '/dashboard/consultations', icon: Stethoscope, label: 'Consultations', roles: ['CLINIC_ADMIN', 'DOCTOR'] },
  { href: '/dashboard/vaccinations', icon: Syringe, label: 'Vaccinations', roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
  { href: '/dashboard/lab-tests', icon: FlaskConical, label: 'Lab Tests', roles: ['CLINIC_ADMIN', 'DOCTOR'] },
  { href: '/dashboard/inventory', icon: Package, label: 'Inventory', roles: ['CLINIC_ADMIN'] },
  { href: '/dashboard/billing', icon: Receipt, label: 'Billing', roles: ['CLINIC_ADMIN', 'RECEPTIONIST'] },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports', roles: ['CLINIC_ADMIN'] },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', roles: ['CLINIC_ADMIN', 'SUPER_ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter(item =>
    item.roles.includes(user?.role || '')
  );

  return (
    <aside className={cn(
      'flex flex-col h-full bg-slate-900 transition-all duration-300 border-r border-slate-800',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-sm">VetPet PK</span>
              <p className="text-slate-400 text-xs truncate max-w-[130px]">{user?.clinic?.name}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mx-auto">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('text-slate-400 hover:text-white p-1 rounded', collapsed && 'hidden')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-slate-800 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-8 h-8 bg-teal-700 rounded-full flex items-center justify-center text-teal-200 text-sm font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 text-sm transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
