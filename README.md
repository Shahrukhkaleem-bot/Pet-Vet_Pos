# 🐾 VetPet PK — Veterinary Clinic Management System & POS

A production-ready **Pet & Veterinary Clinic Management SaaS and Point-of-Sale (POS) System** designed specifically for veterinary clinics in Pakistan.

---

## 🌟 Key Features

- **Multi-Tenant SaaS Architecture**: Each clinic is isolated with role-based access control (Super Admin, Clinic Admin, Doctor, Receptionist).
- **Pakistani Market Localization**:
  - Currency in **Pakistani Rupee (PKR / Rs.)**
  - Phone validation (`+923XXXXXXXXX`)
  - Direct **WhatsApp click-to-chat** patient communication
  - Multi-method payments: **Cash, EasyPaisa, JazzCash, Bank Transfer**
  - Timezone: `Asia/Karachi` (PKT)
- **Clinical & Practice Management**:
  - Patient queue with auto-generated token numbers (`#01`, `#02`...)
  - Electronic Medical Records (EMR) with clinical vitals (Temp °F, HR, RR, Weight)
  - Medical timelines and physical examination records
  - Automated follow-up reminders
- **Inventory & Pharmacy (FEFO)**:
  - First-Expired, First-Out (**FEFO**) batch inventory deduction
  - Low stock and expiry warnings
  - Expired medicine prescription guards
- **Prescription & Invoice PDF Generation**:
  - Asynchronous branded PDF generation via PDFKit with doctor signature lines
- **Multi-Platform Access**:
  - **Web Application**: Next.js 14 App Router, TypeScript, Tailwind CSS, Recharts (24 pages)
  - **Desktop POS Executable**: Native Windows `.exe` application (`pos-desktop/VetPet-POS.exe`) with POS keyboard shortcuts (F1-F11) and thermal receipt printing
  - **Mobile Application**: Flutter, Riverpod, Dio, Hive offline cache, Material 3
- **Database**:
  - Cloud **PostgreSQL on Supabase** with Prisma ORM (22 relational models)

---

## 🏗️ Architecture

```
├── backend/          # Node.js + Express + Prisma ORM + PostgreSQL (Supabase)
├── web/              # Next.js 14 App Router + Tailwind CSS + TanStack Query
├── mobile/           # Flutter Mobile Application (Android / iOS)
├── pos-desktop/      # Native Windows POS Desktop Application (VetPet-POS.exe)
├── .github/          # GitHub Actions (Automated Android APK build workflow)
└── Run-POS.bat       # 1-Click Windows System Launcher
```

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
# Set your DATABASE_URL in .env
npx prisma generate
npx prisma db push
node src/utils/seed.js
npm run dev
# Server running at http://localhost:5000
```

### 2. Web Portal Setup
```bash
cd web
npm install
npm run dev
# Web app running at http://localhost:3000
```

### 3. Windows POS Desktop App
Simply double-click `Run-POS.bat` in the root folder, or launch:
```bash
pos-desktop/VetPet-POS.exe
```

### 4. Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

---

## 🔑 Demo Credentials (Happy Paws Clinic — Lahore)

| Role | Email | Password |
|---|---|---|
| **Clinic Admin** | `admin@happypaws.pk` | `Admin@123` |
| **Doctor (Dr. Ahmed)** | `dr.ahmed@happypaws.pk` | `Doctor@123` |
| **Doctor (Dr. Sara)** | `dr.sara@happypaws.pk` | `Doctor@123` |
| **Receptionist** | `reception1@happypaws.pk` | `Staff@123` |
| **Super Admin** | `superadmin@vetpet.pk` | `Admin@123` |

---

## 📄 License
Commercial SaaS Proprietary — VetPet PK
