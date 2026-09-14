import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { QueryClientProvider } from "./query-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "VetPet PK — Veterinary Clinic Management",
  description: "Modern veterinary clinic management SaaS for Pakistan. Manage pets, appointments, medical records, prescriptions, vaccinations, inventory and billing.",
  keywords: "veterinary clinic management, Pakistan, pet management, vet software",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50`}>
        <QueryClientProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
