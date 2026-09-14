'use strict';

/**
 * VetPet PK — Database Seed File
 * Demo Clinic: "Happy Paws Veterinary Clinic" — Lahore, Pakistan
 * Realistic Pakistani clinic data for development & demo purposes
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🐾 VetPet PK — Seeding database...\n');

  // ── Plans ─────────────────────────────────────────────────────────────────
  console.log('Creating SaaS plans...');
  const [starter, professional, business] = await Promise.all([
    prisma.plan.upsert({ where: { id: 1 }, update: {}, create: { name: 'Starter', price_monthly: 2000, max_doctors: 2, max_staff: 5, max_pets: 200, storage_gb: 5 } }),
    prisma.plan.upsert({ where: { id: 2 }, update: {}, create: { name: 'Professional', price_monthly: 4000, max_doctors: 5, max_staff: 15, max_pets: 1000, storage_gb: 20, has_reports: true, has_whatsapp: true } }),
    prisma.plan.upsert({ where: { id: 3 }, update: {}, create: { name: 'Business', price_monthly: 7000, max_doctors: 15, max_staff: 50, max_pets: 10000, storage_gb: 100, has_reports: true, has_whatsapp: true, has_ai: true } }),
  ]);

  // ── Species & Breeds ──────────────────────────────────────────────────────
  console.log('Creating species & breeds...');
  const dog = await prisma.species.upsert({ where: { name: 'Dog' }, update: {}, create: { name: 'Dog', breeds: { create: [{ name: 'German Shepherd' }, { name: 'Labrador Retriever' }, { name: 'Golden Retriever' }, { name: 'Pomeranian' }, { name: 'Poodle' }, { name: 'Siberian Husky' }, { name: 'Dachshund' }, { name: 'Mixed Breed' }] } } });
  const cat = await prisma.species.upsert({ where: { name: 'Cat' }, update: {}, create: { name: 'Cat', breeds: { create: [{ name: 'Persian' }, { name: 'Siamese' }, { name: 'Maine Coon' }, { name: 'Domestic Shorthair' }, { name: 'Tabby' }] } } });
  const bird = await prisma.species.upsert({ where: { name: 'Bird' }, update: {}, create: { name: 'Bird', breeds: { create: [{ name: 'Budgerigar (Budgie)' }, { name: 'African Grey Parrot' }, { name: 'Cockatiel' }, { name: 'Lovebird' }] } } });
  const rabbit = await prisma.species.upsert({ where: { name: 'Rabbit' }, update: {}, create: { name: 'Rabbit', breeds: { create: [{ name: 'Holland Lop' }, { name: 'Dutch Rabbit' }, { name: 'Angora' }] } } });
  await prisma.species.upsert({ where: { name: 'Goat' }, update: {}, create: { name: 'Goat' } });
  await prisma.species.upsert({ where: { name: 'Horse' }, update: {}, create: { name: 'Horse' } });
  await prisma.species.upsert({ where: { name: 'Other' }, update: {}, create: { name: 'Other' } });

  // Fetch breed IDs
  const dogBreeds = await prisma.breed.findMany({ where: { species_id: dog.id } });
  const catBreeds = await prisma.breed.findMany({ where: { species_id: cat.id } });

  // ── Super Admin ───────────────────────────────────────────────────────────
  console.log('Creating super admin...');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@vetpet.pk' },
    update: {},
    create: {
      name: 'VetPet Admin',
      email: 'superadmin@vetpet.pk',
      phone: '+923001234567',
      password_hash: await bcrypt.hash('Admin@123', 12),
      role: 'SUPER_ADMIN',
    },
  });

  // ── Demo Clinic: Happy Paws ───────────────────────────────────────────────
  console.log('Creating Happy Paws Veterinary Clinic...');
  const clinic = await prisma.clinic.upsert({
    where: { slug: 'happy-paws-lahore' },
    update: {},
    create: {
      name: 'Happy Paws Veterinary Clinic',
      slug: 'happy-paws-lahore',
      phone: '+924235551234',
      whatsapp_number: '+923001112233',
      email: 'info@happypaws.pk',
      address: 'Plot 45, Gulberg III, Main Boulevard',
      city: 'Lahore',
      currency: 'PKR',
      status: 'ACTIVE',
      plan_id: professional.id,
    },
  });

  // ── Clinic Staff ──────────────────────────────────────────────────────────
  console.log('Creating clinic staff...');
  const [clinicAdmin, doctor1, doctor2, receptionist1, receptionist2] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@happypaws.pk' },
      update: {},
      create: {
        clinic_id: clinic.id,
        name: 'Muhammad Bilal Khan',
        email: 'admin@happypaws.pk',
        phone: '+923331234567',
        password_hash: await bcrypt.hash('Admin@123', 12),
        role: 'CLINIC_ADMIN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'dr.ahmed@happypaws.pk' },
      update: {},
      create: {
        clinic_id: clinic.id,
        name: 'Dr. Ahmad Raza',
        email: 'dr.ahmed@happypaws.pk',
        phone: '+923451234567',
        password_hash: await bcrypt.hash('Doctor@123', 12),
        role: 'DOCTOR',
        specialization: 'Small Animal Medicine',
        license_number: 'VET-PB-2019-4521',
      },
    }),
    prisma.user.upsert({
      where: { email: 'dr.sara@happypaws.pk' },
      update: {},
      create: {
        clinic_id: clinic.id,
        name: 'Dr. Sara Imran',
        email: 'dr.sara@happypaws.pk',
        phone: '+923011234567',
        password_hash: await bcrypt.hash('Doctor@123', 12),
        role: 'DOCTOR',
        specialization: 'Feline & Exotic Animals',
        license_number: 'VET-PB-2021-7843',
      },
    }),
    prisma.user.upsert({
      where: { email: 'reception1@happypaws.pk' },
      update: {},
      create: {
        clinic_id: clinic.id,
        name: 'Ayesha Siddiqui',
        email: 'reception1@happypaws.pk',
        phone: '+923211234567',
        password_hash: await bcrypt.hash('Staff@123', 12),
        role: 'RECEPTIONIST',
      },
    }),
    prisma.user.upsert({
      where: { email: 'reception2@happypaws.pk' },
      update: {},
      create: {
        clinic_id: clinic.id,
        name: 'Usman Ali',
        email: 'reception2@happypaws.pk',
        phone: '+923121234567',
        password_hash: await bcrypt.hash('Staff@123', 12),
        role: 'RECEPTIONIST',
      },
    }),
  ]);

  // ── Pet Owners (30 Pakistani owners) ─────────────────────────────────────
  console.log('Creating 30 pet owners...');
  const ownerData = [
    { name: 'Zubair Ahmed', phone: '+923001111001', whatsapp_number: '+923001111001', city: 'Lahore', address: 'House 12, DHA Phase 5' },
    { name: 'Fatima Noor', phone: '+923011111002', whatsapp_number: '+923011111002', city: 'Lahore', address: 'Flat 4B, Gulberg Greens' },
    { name: 'Hamid Raza', phone: '+923021111003', whatsapp_number: '+923021111003', city: 'Lahore', address: 'Plot 89, Model Town Extension' },
    { name: 'Sana Malik', phone: '+923031111004', whatsapp_number: '+923031111004', city: 'Lahore', address: 'House 7, Garden Town' },
    { name: 'Tariq Mehmood', phone: '+923041111005', city: 'Lahore', address: '45 Johar Town' },
    { name: 'Amna Sheikh', phone: '+923051111006', whatsapp_number: '+923051111006', city: 'Lahore', address: 'Street 3, Iqbal Town' },
    { name: 'Omer Farooq', phone: '+923061111007', city: 'Lahore', address: 'House 33, Wapda Town' },
    { name: 'Nadia Khan', phone: '+923071111008', whatsapp_number: '+923071111008', city: 'Lahore', address: 'Block B, Valencia Housing Society' },
    { name: 'Kamran Akhtar', phone: '+923081111009', city: 'Lahore', address: 'Phase 6, Bahria Town' },
    { name: 'Rida Hussain', phone: '+923091111010', whatsapp_number: '+923091111010', city: 'Lahore', address: 'House 22, Samanabad' },
    { name: 'Ali Hassan', phone: '+923001211001', whatsapp_number: '+923001211001', city: 'Lahore', address: '15-A, Canal Bank Road' },
    { name: 'Maria Qureshi', phone: '+923011211002', city: 'Lahore', address: 'House 9, Township' },
    { name: 'Babar Nawaz', phone: '+923021211003', whatsapp_number: '+923021211003', city: 'Lahore', address: 'Plot 77, Allama Iqbal Town' },
    { name: 'Hira Aslam', phone: '+923031211004', city: 'Lahore', address: 'Flat 2C, DHA Phase 3' },
    { name: 'Waseem Butt', phone: '+923041211005', whatsapp_number: '+923041211005', city: 'Lahore', address: 'Street 5, Cavalry Ground' },
    { name: 'Saira Shahid', phone: '+923051211006', city: 'Lahore', address: '67, Shadman Colony' },
    { name: 'Faisal Ijaz', phone: '+923061211007', whatsapp_number: '+923061211007', city: 'Lahore', address: 'Block C, Lake City' },
    { name: 'Asma Tahir', phone: '+923071211008', city: 'Lahore', address: 'House 88, Mozang' },
    { name: 'Imran Sohail', phone: '+923081211009', whatsapp_number: '+923081211009', city: 'Lahore', address: 'Road 12, Gulshan-e-Ravi' },
    { name: 'Zara Chaudhry', phone: '+923091211010', city: 'Lahore', address: 'Plot 54, Paragon City' },
    { name: 'Naeem Akhtar', phone: '+923001311001', whatsapp_number: '+923001311001', city: 'Lahore', address: 'House 3, Mughalpura' },
    { name: 'Lubna Mirza', phone: '+923011311002', city: 'Lahore', address: '12, Muslim Town' },
    { name: 'Asad Zaman', phone: '+923021311003', whatsapp_number: '+923021311003', city: 'Lahore', address: 'Street 9, Empress Road' },
    { name: 'Rukhsana Nisar', phone: '+923031311004', city: 'Lahore', address: 'House 18, Mustafa Town' },
    { name: 'Shahid Latif', phone: '+923041311005', whatsapp_number: '+923041311005', city: 'Lahore', address: 'Plot 61, Pak Block, Allama Iqbal Town' },
    { name: 'Bushra Anjum', phone: '+923051311006', city: 'Lahore', address: '77, Faisal Town' },
    { name: 'Rizwan Ali', phone: '+923061311007', whatsapp_number: '+923061311007', city: 'Lahore', address: 'House 5, Green Town' },
    { name: 'Nasreen Bano', phone: '+923071311008', city: 'Lahore', address: 'Plot 30, Defence Road' },
    { name: 'Fahad Iqbal', phone: '+923081311009', whatsapp_number: '+923081311009', city: 'Lahore', address: 'Block F, Johar Town' },
    { name: 'Shirin Zaidi', phone: '+923091311010', city: 'Lahore', address: 'House 44, Thokar Niaz Baig' },
  ];

  const owners = [];
  for (const o of ownerData) {
    const owner = await prisma.petOwner.upsert({
      where: { id: owners.length + 1 }, // Simple upsert by position
      update: {},
      create: { clinic_id: clinic.id, ...o },
    }).catch(async () => {
      return prisma.petOwner.create({ data: { clinic_id: clinic.id, ...o } });
    });
    owners.push(owner);
  }

  // ── Medicines (Inventory) ─────────────────────────────────────────────────
  console.log('Creating medicine inventory...');
  const medicineData = [
    { name: 'Amoxicillin 250mg', generic_name: 'Amoxicillin', category: 'Antibiotic', unit: 'Tablet', purchase_price: 8, selling_price: 15, stock_quantity: 500, batch_number: 'AMX-2024-001', expiry_date: '2027-06-30' },
    { name: 'Dexamethasone 5ml Injection', generic_name: 'Dexamethasone', category: 'Corticosteroid', unit: 'Vial', purchase_price: 120, selling_price: 200, stock_quantity: 50, batch_number: 'DEX-2024-003', expiry_date: '2026-12-31' },
    { name: 'Ivermectin Dewormer', generic_name: 'Ivermectin', category: 'Antiparasitic', unit: 'ml', purchase_price: 350, selling_price: 600, stock_quantity: 30, batch_number: 'IVM-2024-007', expiry_date: '2026-09-30' },
    { name: 'Metronidazole 400mg', generic_name: 'Metronidazole', category: 'Antibiotic', unit: 'Tablet', purchase_price: 5, selling_price: 10, stock_quantity: 800, batch_number: 'MTZ-2024-002', expiry_date: '2027-03-31' },
    { name: 'Frontline Plus (Large Dog)', generic_name: 'Fipronil', category: 'Antiparasitic', unit: 'Pipette', purchase_price: 850, selling_price: 1400, stock_quantity: 25, batch_number: 'FPL-2024-010', expiry_date: '2026-08-31' },
    { name: 'Rabies Vaccine', generic_name: 'Rabies Vaccine', category: 'Vaccine', unit: 'Vial', purchase_price: 400, selling_price: 700, stock_quantity: 40, batch_number: 'RBV-2024-005', expiry_date: '2025-12-31' },
    { name: '5-in-1 Vaccine (DHPP)', generic_name: 'DHPP Vaccine', category: 'Vaccine', unit: 'Vial', purchase_price: 600, selling_price: 1000, stock_quantity: 30, batch_number: 'DHPP-2024-004', expiry_date: '2025-10-31' },
    { name: 'Omeprazole 20mg', generic_name: 'Omeprazole', category: 'Antacid', unit: 'Capsule', purchase_price: 6, selling_price: 12, stock_quantity: 300, batch_number: 'OMP-2024-008', expiry_date: '2027-01-31' },
    { name: 'Meloxicam 1.5mg/ml', generic_name: 'Meloxicam', category: 'NSAID', unit: 'ml', purchase_price: 280, selling_price: 450, stock_quantity: 20, batch_number: 'MLX-2024-006', expiry_date: '2026-05-31' },
    { name: 'Normal Saline 500ml', generic_name: 'Sodium Chloride 0.9%', category: 'IV Fluid', unit: 'Bag', purchase_price: 80, selling_price: 150, stock_quantity: 60, batch_number: 'NS-2024-009', expiry_date: '2026-11-30' },
    { name: 'Enrofloxacin 50mg', generic_name: 'Enrofloxacin', category: 'Antibiotic', unit: 'Tablet', purchase_price: 15, selling_price: 28, stock_quantity: 3, min_stock_alert: 10, batch_number: 'ENR-2024-011', expiry_date: '2026-04-30' }, // Low stock demo
    { name: 'Vitamin B Complex Injection', generic_name: 'Vitamin B Complex', category: 'Supplement', unit: 'ml', purchase_price: 90, selling_price: 160, stock_quantity: 35, batch_number: 'VB-2024-012', expiry_date: '2026-07-31' },
  ];

  const medicines = [];
  for (const med of medicineData) {
    const { batch_number, expiry_date, initial_quantity, ...medData } = med;
    const medicine = await prisma.medicine.create({
      data: {
        clinic_id: clinic.id,
        ...medData,
        batches: {
          create: [{
            batch_number,
            expiry_date: new Date(expiry_date),
            quantity: medData.stock_quantity,
            purchase_price: medData.purchase_price,
          }],
        },
      },
    });
    medicines.push(medicine);
  }

  // ── Pets (40 pets) ────────────────────────────────────────────────────────
  console.log('Creating 40 pets...');
  const petData = [
    { name: 'Bruno', owner_idx: 0, species_id: dog.id, breed_name: 'German Shepherd', gender: 'MALE', dob: '2021-03-15', weight: 28.5, color: 'Black and Tan' },
    { name: 'Milo', owner_idx: 1, species_id: dog.id, breed_name: 'Labrador Retriever', gender: 'MALE', dob: '2020-07-22', weight: 32.0, color: 'Yellow' },
    { name: 'Bella', owner_idx: 2, species_id: cat.id, breed_name: 'Persian', gender: 'FEMALE', dob: '2022-01-10', weight: 4.2, color: 'White' },
    { name: 'Max', owner_idx: 3, species_id: dog.id, breed_name: 'Golden Retriever', gender: 'MALE', dob: '2019-11-30', weight: 35.0, color: 'Golden' },
    { name: 'Luna', owner_idx: 4, species_id: cat.id, breed_name: 'Siamese', gender: 'FEMALE', dob: '2023-02-14', weight: 3.8, color: 'Cream and Brown' },
    { name: 'Rocky', owner_idx: 5, species_id: dog.id, breed_name: 'Pomeranian', gender: 'MALE', dob: '2022-08-05', weight: 3.5, color: 'Orange' },
    { name: 'Whiskers', owner_idx: 6, species_id: cat.id, breed_name: 'Tabby', gender: 'MALE', dob: '2021-05-20', weight: 5.1, color: 'Grey Tabby' },
    { name: 'Buddy', owner_idx: 7, species_id: dog.id, breed_name: 'Siberian Husky', gender: 'MALE', dob: '2020-12-01', weight: 25.0, color: 'Black and White' },
    { name: 'Cleo', owner_idx: 8, species_id: cat.id, breed_name: 'Domestic Shorthair', gender: 'FEMALE', dob: '2023-06-15', weight: 3.2, color: 'Black' },
    { name: 'Charlie', owner_idx: 9, species_id: dog.id, breed_name: 'Dachshund', gender: 'MALE', dob: '2021-09-03', weight: 8.5, color: 'Brown' },
    { name: 'Snowball', owner_idx: 10, species_id: rabbit.id, breed_name: 'Holland Lop', gender: 'FEMALE', dob: '2023-03-10', weight: 1.8, color: 'White' },
    { name: 'Tiger', owner_idx: 11, species_id: cat.id, breed_name: 'Maine Coon', gender: 'MALE', dob: '2020-04-25', weight: 7.5, color: 'Brown Tabby' },
    { name: 'Daisy', owner_idx: 12, species_id: dog.id, breed_name: 'Poodle', gender: 'FEMALE', dob: '2022-11-18', weight: 5.8, color: 'White' },
    { name: 'Shadow', owner_idx: 13, species_id: dog.id, breed_name: 'Mixed Breed', gender: 'MALE', dob: '2019-06-30', weight: 18.0, color: 'Black' },
    { name: 'Nemo', owner_idx: 14, species_id: bird.id, breed_name: 'Budgerigar (Budgie)', gender: 'MALE', dob: '2023-01-20', weight: 0.04, color: 'Green and Yellow' },
    { name: 'Caramel', owner_idx: 15, species_id: cat.id, breed_name: 'Persian', gender: 'FEMALE', dob: '2021-08-12', weight: 4.8, color: 'Caramel' },
    { name: 'Fluffy', owner_idx: 16, species_id: rabbit.id, breed_name: 'Angora', gender: 'FEMALE', dob: '2023-04-05', weight: 2.1, color: 'White' },
    { name: 'Rex', owner_idx: 17, species_id: dog.id, breed_name: 'German Shepherd', gender: 'MALE', dob: '2020-02-28', weight: 30.5, color: 'Sable' },
    { name: 'Mittens', owner_idx: 18, species_id: cat.id, breed_name: 'Domestic Shorthair', gender: 'FEMALE', dob: '2022-07-14', weight: 3.9, color: 'Orange and White' },
    { name: 'Ginger', owner_idx: 19, species_id: dog.id, breed_name: 'Golden Retriever', gender: 'FEMALE', dob: '2021-10-08', weight: 27.0, color: 'Golden' },
    { name: 'Polly', owner_idx: 20, species_id: bird.id, breed_name: 'Cockatiel', gender: 'FEMALE', dob: '2022-05-30', weight: 0.09, color: 'Yellow and Grey' },
    { name: 'Leo', owner_idx: 21, species_id: cat.id, breed_name: 'Siamese', gender: 'MALE', dob: '2020-09-16', weight: 5.5, color: 'Dark Points' },
    { name: 'Zorro', owner_idx: 22, species_id: dog.id, breed_name: 'Labrador Retriever', gender: 'MALE', dob: '2019-03-22', weight: 34.5, color: 'Black' },
    { name: 'Kittu', owner_idx: 23, species_id: cat.id, breed_name: 'Tabby', gender: 'MALE', dob: '2023-08-01', weight: 2.8, color: 'Orange Tabby' },
    { name: 'Oreo', owner_idx: 24, species_id: dog.id, breed_name: 'Mixed Breed', gender: 'FEMALE', dob: '2022-03-17', weight: 12.0, color: 'Black and White' },
    { name: 'Cocoa', owner_idx: 25, species_id: rabbit.id, breed_name: 'Dutch Rabbit', gender: 'MALE', dob: '2023-02-28', weight: 1.5, color: 'Brown and White' },
    { name: 'Zeus', owner_idx: 26, species_id: dog.id, breed_name: 'Siberian Husky', gender: 'MALE', dob: '2021-01-15', weight: 27.5, color: 'Grey and White' },
    { name: 'Pearl', owner_idx: 27, species_id: cat.id, breed_name: 'Persian', gender: 'FEMALE', dob: '2020-11-20', weight: 4.0, color: 'White' },
    { name: 'Biscuit', owner_idx: 28, species_id: dog.id, breed_name: 'Pomeranian', gender: 'FEMALE', dob: '2023-05-10', weight: 3.2, color: 'Cream' },
    { name: 'Toffee', owner_idx: 29, species_id: cat.id, breed_name: 'Maine Coon', gender: 'MALE', dob: '2021-12-25', weight: 6.8, color: 'Brown' },
    // Extra pets — some owners have multiple pets
    { name: 'Lola', owner_idx: 0, species_id: cat.id, breed_name: 'Domestic Shorthair', gender: 'FEMALE', dob: '2023-07-04', weight: 3.6, color: 'Calico' },
    { name: 'Simba', owner_idx: 3, species_id: cat.id, breed_name: 'Tabby', gender: 'MALE', dob: '2022-04-20', weight: 4.5, color: 'Orange' },
    { name: 'Cookie', owner_idx: 7, species_id: dog.id, breed_name: 'Poodle', gender: 'FEMALE', dob: '2021-06-12', weight: 6.0, color: 'Apricot' },
    { name: 'Mango', owner_idx: 12, species_id: bird.id, breed_name: 'Lovebird', gender: 'MALE', dob: '2023-09-01', weight: 0.06, color: 'Green and Red' },
    { name: 'Panda', owner_idx: 15, species_id: dog.id, breed_name: 'Mixed Breed', gender: 'MALE', dob: '2020-08-15', weight: 15.0, color: 'Black and White' },
    { name: 'Ruby', owner_idx: 18, species_id: cat.id, breed_name: 'Persian', gender: 'FEMALE', dob: '2022-10-10', weight: 4.3, color: 'Red' },
    { name: 'Jasper', owner_idx: 22, species_id: dog.id, breed_name: 'Dachshund', gender: 'MALE', dob: '2021-04-18', weight: 9.0, color: 'Chocolate' },
    { name: 'Koko', owner_idx: 25, species_id: bird.id, breed_name: 'African Grey Parrot', gender: 'UNKNOWN', dob: '2018-01-01', weight: 0.45, color: 'Grey' },
    { name: 'Storm', owner_idx: 27, species_id: dog.id, breed_name: 'German Shepherd', gender: 'MALE', dob: '2020-05-22', weight: 32.0, color: 'Black and Tan' },
    { name: 'Dino', owner_idx: 29, species_id: dog.id, breed_name: 'Labrador Retriever', gender: 'MALE', dob: '2019-09-14', weight: 33.0, color: 'Chocolate' },
  ];

  const dogBreedsMap = Object.fromEntries(dogBreeds.map(b => [b.name, b.id]));
  const catBreedsMap = Object.fromEntries(catBreeds.map(b => [b.name, b.id]));
  const birdBreeds = await prisma.breed.findMany({ where: { species_id: bird.id } });
  const birdBreedsMap = Object.fromEntries(birdBreeds.map(b => [b.name, b.id]));
  const rabbitBreeds = await prisma.breed.findMany({ where: { species_id: rabbit.id } });
  const rabbitBreedsMap = Object.fromEntries(rabbitBreeds.map(b => [b.name, b.id]));

  const allBreedsMap = { ...dogBreedsMap, ...catBreedsMap, ...birdBreedsMap, ...rabbitBreedsMap };

  const pets = [];
  for (const p of petData) {
    const { owner_idx, breed_name, dob, weight, ...rest } = p;
    const pet = await prisma.pet.create({
      data: {
        clinic_id: clinic.id,
        owner_id: owners[owner_idx].id,
        breed_id: allBreedsMap[breed_name] || null,
        date_of_birth: new Date(dob),
        weight_kg: weight,
        age_years: new Date().getFullYear() - new Date(dob).getFullYear(),
        age_months: new Date().getMonth() - new Date(dob).getMonth() < 0 ? 11 : new Date().getMonth() - new Date(dob).getMonth(),
        ...rest,
      },
    });
    pets.push(pet);

    // Add initial weight log
    await prisma.weightLog.create({
      data: { pet_id: pet.id, weight_kg: weight, notes: 'Initial registration' },
    });
  }

  // ── Appointments (today + upcoming) ──────────────────────────────────────
  console.log('Creating appointments...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const apptSlots = [
    { pet_idx: 0, doctor_id: doctor1.id, start: '09:00', end: '09:30', status: 'COMPLETED', token: 1 },
    { pet_idx: 1, doctor_id: doctor2.id, start: '09:00', end: '09:30', status: 'COMPLETED', token: 1 },
    { pet_idx: 2, doctor_id: doctor1.id, start: '09:30', end: '10:00', status: 'IN_CONSULTATION', token: 2 },
    { pet_idx: 3, doctor_id: doctor2.id, start: '09:30', end: '10:00', status: 'CHECKED_IN', token: 2 },
    { pet_idx: 4, doctor_id: doctor1.id, start: '10:00', end: '10:30', status: 'CHECKED_IN', token: 3 },
    { pet_idx: 5, doctor_id: doctor1.id, start: '10:30', end: '11:00', status: 'SCHEDULED', token: 4 },
    { pet_idx: 6, doctor_id: doctor2.id, start: '11:00', end: '11:30', status: 'SCHEDULED', token: 3 },
    { pet_idx: 7, doctor_id: doctor1.id, start: '11:00', end: '11:30', status: 'SCHEDULED', token: 5 },
  ];

  for (const slot of apptSlots) {
    await prisma.appointment.create({
      data: {
        clinic_id: clinic.id,
        pet_id: pets[slot.pet_idx].id,
        doctor_id: slot.doctor_id,
        appointment_date: today,
        start_time: slot.start,
        end_time: slot.end,
        appointment_type: 'CONSULTATION',
        status: slot.status,
        token_number: slot.token,
        reason: 'Routine health checkup',
      },
    });
  }

  // ── Sample Consultations & Prescriptions ─────────────────────────────────
  console.log('Creating sample consultations...');
  const consultation1 = await prisma.consultation.create({
    data: {
      clinic_id: clinic.id,
      pet_id: pets[0].id, // Bruno
      doctor_id: doctor1.id,
      consultation_date: new Date(today.getTime() - 7 * 86400000), // 7 days ago
      chief_complaint: 'Loss of appetite and lethargy for 3 days',
      symptoms: 'Decreased food intake, reduced activity, mild fever',
      physical_exam: 'Temperature 103.8°F, HR 88 bpm, RR 24/min. Slight abdominal tenderness on palpation.',
      diagnosis: 'Gastroenteritis with mild dehydration',
      treatment_plan: 'IV fluids, supportive care, antibiotic therapy, bland diet for 5 days',
      clinical_notes: 'Owner advised to monitor stool consistency and water intake. Return if not improving in 48h.',
      follow_up_date: new Date(today.getTime() + 3 * 86400000),
      weight_kg: 28.2,
      temperature_f: 103.8,
      heart_rate_bpm: 88,
      respiratory_rate: 24,
    },
  });

  await prisma.prescription.create({
    data: {
      clinic_id: clinic.id,
      consultation_id: consultation1.id,
      instructions: 'Give all medicines after food. Provide plenty of fresh water.',
      items: {
        create: [
          {
            medicine_id: medicines[0].id, // Amoxicillin
            dosage: '2 tablets',
            frequency: 'Twice daily',
            duration_days: 5,
            instructions: 'After meals',
          },
          {
            medicine_id: medicines[7].id, // Omeprazole
            dosage: '1 capsule',
            frequency: 'Once daily in morning',
            duration_days: 5,
            instructions: 'Before breakfast',
          },
        ],
      },
    },
  });

  // ── Vaccinations ──────────────────────────────────────────────────────────
  console.log('Creating vaccination records...');
  await prisma.vaccination.create({
    data: {
      clinic_id: clinic.id,
      pet_id: pets[0].id, // Bruno
      doctor_id: doctor1.id,
      vaccine_name: 'Rabies Vaccine',
      batch_number: 'RBV-2024-005',
      manufacturer: 'MSD Animal Health',
      administered_date: new Date(today.getTime() - 30 * 86400000),
      next_due_date: new Date(today.getTime() + 335 * 86400000), // Next year
      notes: 'Annual booster administered. No adverse reaction observed.',
    },
  });

  await prisma.vaccination.create({
    data: {
      clinic_id: clinic.id,
      pet_id: pets[1].id, // Milo
      doctor_id: doctor1.id,
      vaccine_name: '5-in-1 Vaccine (DHPP)',
      batch_number: 'DHPP-2024-004',
      manufacturer: 'Nobivac',
      administered_date: new Date(today.getTime() - 60 * 86400000),
      next_due_date: new Date(today.getTime() + 5 * 86400000), // Due in 5 days (upcoming!)
      notes: 'Booster dose. Next due in 1 year.',
    },
  });

  await prisma.vaccination.create({
    data: {
      clinic_id: clinic.id,
      pet_id: pets[2].id, // Bella
      doctor_id: doctor2.id,
      vaccine_name: 'Feline 3-in-1',
      batch_number: 'F3-2024-002',
      manufacturer: 'Purevax',
      administered_date: new Date(today.getTime() - 10 * 86400000),
      next_due_date: new Date(today.getTime() - 2 * 86400000), // OVERDUE
      notes: 'First dose administered.',
    },
  });

  // ── Sample Invoice ─────────────────────────────────────────────────────────
  console.log('Creating sample invoices...');
  const invoice = await prisma.invoice.create({
    data: {
      clinic_id: clinic.id,
      invoice_number: 'INV-2026-00001',
      pet_id: pets[0].id,
      owner_id: owners[0].id,
      consultation_id: consultation1.id,
      subtotal: 2300,
      discount: 200,
      tax: 0,
      total_amount: 2100,
      paid_amount: 2100,
      due_amount: 0,
      status: 'PAID',
      notes: 'Payment received in full.',
      items: {
        create: [
          { item_type: 'CONSULTATION', description: 'Consultation — Dr. Ahmad Raza', quantity: 1, unit_price: 1500, total_price: 1500 },
          { item_type: 'MEDICINE', medicine_id: medicines[0].id, description: 'Amoxicillin 250mg (10 tablets)', quantity: 10, unit_price: 15, total_price: 150 },
          { item_type: 'MEDICINE', medicine_id: medicines[7].id, description: 'Omeprazole 20mg (5 capsules)', quantity: 5, unit_price: 12, total_price: 60 },
          { item_type: 'PROCEDURE', description: 'IV Fluid Therapy (Normal Saline 500ml)', quantity: 2, unit_price: 150, total_price: 300 },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      invoice_id: invoice.id,
      amount: 2100,
      payment_method: 'CASH',
      notes: 'Full payment received.',
    },
  });

  // Outstanding invoice for another pet
  await prisma.invoice.create({
    data: {
      clinic_id: clinic.id,
      invoice_number: 'INV-2026-00002',
      pet_id: pets[1].id,
      owner_id: owners[1].id,
      subtotal: 1700,
      discount: 0,
      tax: 0,
      total_amount: 1700,
      paid_amount: 1000,
      due_amount: 700,
      status: 'PARTIALLY_PAID',
      items: {
        create: [
          { item_type: 'CONSULTATION', description: 'Consultation — Dr. Ahmad Raza', quantity: 1, unit_price: 1500, total_price: 1500 },
          { item_type: 'VACCINE', description: 'DHPP Vaccine', quantity: 1, unit_price: 1000, total_price: 1000 },
        ],
      },
    },
  });

  console.log('\n✅ Seed complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DEMO CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Super Admin:   superadmin@vetpet.pk  / Admin@123');
  console.log('  Clinic Admin:  admin@happypaws.pk    / Admin@123');
  console.log('  Doctor 1:      dr.ahmed@happypaws.pk / Doctor@123');
  console.log('  Doctor 2:      dr.sara@happypaws.pk  / Doctor@123');
  console.log('  Receptionist:  reception1@happypaws.pk / Staff@123');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Clinic: Happy Paws Veterinary Clinic — Lahore`);
  console.log(`  Pets: ${pets.length} | Owners: ${owners.length} | Medicines: ${medicines.length}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
