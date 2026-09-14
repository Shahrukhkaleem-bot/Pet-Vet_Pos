import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// PKR currency formatter
export function formatPKR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Date formatter (DD/MM/YYYY for Pakistan)
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  return format(new Date(date), 'dd/MM/yyyy');
}

// Date + Time formatter
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  return format(new Date(date), 'dd/MM/yyyy hh:mm a');
}

// Relative time (e.g., "3 days ago")
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// WhatsApp deep link generator
export function makeWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

// Status badge colors
export const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  CHECKED_IN: 'bg-yellow-100 text-yellow-800',
  IN_CONSULTATION: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-800',
  UNPAID: 'bg-red-100 text-red-700',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  DUE_SOON: 'bg-amber-100 text-amber-700',
  UPCOMING: 'bg-green-100 text-green-700',
};

export const speciesEmoji: Record<string, string> = {
  Dog: '🐕',
  Cat: '🐈',
  Bird: '🦜',
  Rabbit: '🐇',
  Horse: '🐎',
  Goat: '🐐',
  Other: '🐾',
};
