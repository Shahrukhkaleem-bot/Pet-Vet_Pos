export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PET_OWNER';
  specialization?: string;
  license_number?: string;
  clinic?: Clinic;
}

export interface Clinic {
  id: number;
  name: string;
  slug: string;
  logo_path?: string;
  phone: string;
  whatsapp_number?: string;
  email?: string;
  address: string;
  city: string;
  currency: string;
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED';
}

export interface PetOwner {
  id: number;
  name: string;
  phone: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  city: string;
  notes?: string;
  pet_count?: number;
  created_at: string;
}

export interface Pet {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  date_of_birth?: string;
  age_years: number;
  age_months: number;
  color?: string;
  weight_kg?: number;
  microchip_id?: string;
  registration_no?: string;
  photo_path?: string;
  allergies?: string;
  existing_conditions?: string;
  notes?: string;
  is_active: boolean;
  species: { id: number; name: string };
  breed?: { id: number; name: string };
  owner: PetOwner;
  created_at: string;
}

export interface Appointment {
  id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: 'CONSULTATION' | 'VACCINATION' | 'SURGERY' | 'GROOMING' | 'FOLLOW_UP' | 'EMERGENCY';
  status: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  token_number?: number;
  reason?: string;
  pet: Pick<Pet, 'id' | 'name' | 'photo_path'> & { species: { name: string }; owner: Pick<PetOwner, 'id' | 'name' | 'phone' | 'whatsapp_number'> };
  doctor: Pick<User, 'id' | 'name' | 'specialization'>;
}

export interface Consultation {
  id: number;
  consultation_date: string;
  chief_complaint: string;
  symptoms?: string;
  diagnosis: string;
  treatment_plan?: string;
  clinical_notes?: string;
  follow_up_date?: string;
  weight_kg?: number;
  temperature_f?: number;
  heart_rate_bpm?: number;
  respiratory_rate?: number;
  pet: Pet;
  doctor: Pick<User, 'id' | 'name' | 'specialization'>;
  prescriptions?: Prescription[];
}

export interface PrescriptionItem {
  id: number;
  medicine: { id: number; name: string; generic_name?: string; unit: string };
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
}

export interface Prescription {
  id: number;
  instructions?: string;
  pdf_path?: string;
  items: PrescriptionItem[];
  consultation?: Consultation;
}

export interface Vaccination {
  id: number;
  vaccine_name: string;
  batch_number?: string;
  manufacturer?: string;
  administered_date: string;
  next_due_date: string;
  notes?: string;
  due_status: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';
  pet: Pick<Pet, 'id' | 'name' | 'photo_path'> & { species: { name: string }; owner: Pick<PetOwner, 'id' | 'name' | 'phone' | 'whatsapp_number'> };
  doctor: Pick<User, 'id' | 'name'>;
}

export interface Medicine {
  id: number;
  name: string;
  generic_name?: string;
  category: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  is_low_stock: boolean;
  has_expiring_batches: boolean;
  nearest_expiry?: string;
}

export interface InvoiceItem {
  id: number;
  item_type: 'CONSULTATION' | 'MEDICINE' | 'VACCINE' | 'LAB_TEST' | 'PROCEDURE' | 'OTHER';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  medicine?: Pick<Medicine, 'id' | 'name'>;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  notes?: string;
  created_at: string;
  pet: Pick<Pet, 'id' | 'name'>;
  owner: Pick<PetOwner, 'id' | 'name' | 'phone'>;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface Payment {
  id: number;
  amount: number;
  payment_method: 'CASH' | 'EASYPAISA' | 'JAZZCASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  reference_no?: string;
  paid_at: string;
}

export interface DashboardStats {
  today_appointments: number;
  waiting_patients: number;
  completed_today: number;
  vaccinations_due_soon: number;
  follow_ups_due: number;
  revenue_today: number;
  revenue_this_month: number;
  outstanding_balance: number;
  low_stock_alerts: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
