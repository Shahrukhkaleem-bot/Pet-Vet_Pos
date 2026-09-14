'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, param } = require('express-validator');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// ── Multer config for pet photos ──────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../storage/uploads/pets'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `pet-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }
  },
});

// ── Validation ────────────────────────────────────────────────────────────────

const petValidation = [
  body('name').trim().notEmpty().withMessage('Pet name is required.'),
  body('owner_id').isInt({ min: 1 }).withMessage('Valid owner ID is required.'),
  body('species_id').isInt({ min: 1 }).withMessage('Valid species ID is required.'),
  body('breed_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'UNKNOWN']),
  body('date_of_birth').optional({ nullable: true }).isDate(),
  body('weight_kg').optional({ nullable: true }).isFloat({ min: 0, max: 9999 }),
  body('microchip_id').optional({ nullable: true }).trim(),
  body('color').optional().trim(),
  body('allergies').optional({ nullable: true }).trim(),
  body('existing_conditions').optional({ nullable: true }).trim(),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const calculateAge = (dob) => {
  if (!dob) return { years: 0, months: 0 };
  const now = new Date();
  const birth = new Date(dob);
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years, months };
};

// ── GET /pets ─────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { search, species_id, owner_id, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      clinic_id: req.clinicId,
      is_active: true,
      deleted_at: null,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { microchip_id: { contains: search } },
          { registration_no: { contains: search } },
          { owner: { name: { contains: search } } },
          { owner: { phone: { contains: search } } },
        ],
      }),
      ...(species_id && { species_id: parseInt(species_id) }),
      ...(owner_id && { owner_id: parseInt(owner_id) }),
    };

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: {
          species: true,
          breed: true,
          owner: { select: { id: true, name: true, phone: true, whatsapp_number: true } },
        },
      }),
      prisma.pet.count({ where }),
    ]);

    res.json({
      success: true,
      data: pets,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /pets/:id — Full Pet Profile ──────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const pet = await prisma.pet.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId, deleted_at: null },
      include: {
        species: true,
        breed: true,
        owner: true,
        consultations: {
          orderBy: { consultation_date: 'desc' },
          take: 20,
          include: {
            doctor: { select: { id: true, name: true } },
            prescriptions: {
              include: { items: { include: { medicine: { select: { id: true, name: true, unit: true } } } } },
            },
          },
        },
        vaccinations: {
          orderBy: { administered_date: 'desc' },
          include: { doctor: { select: { id: true, name: true } } },
        },
        lab_tests: {
          orderBy: { requested_at: 'desc' },
          take: 10,
          include: { doctor: { select: { id: true, name: true } } },
        },
        appointments: {
          orderBy: { appointment_date: 'desc' },
          take: 10,
          include: { doctor: { select: { id: true, name: true } } },
        },
        weight_logs: {
          orderBy: { recorded_at: 'desc' },
          take: 20,
        },
        invoices: {
          where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
          select: { id: true, invoice_number: true, due_amount: true, status: true },
        },
      },
    });

    if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

    // Upcoming vaccinations
    const upcomingVaccinations = pet.vaccinations.filter(
      v => new Date(v.next_due_date) >= new Date()
    );

    res.json({
      success: true,
      data: {
        ...pet,
        upcoming_vaccinations: upcomingVaccinations,
        outstanding_invoices: pet.invoices,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /pets — Register Pet ─────────────────────────────────────────────────

router.post('/', upload.single('photo'), petValidation, validate, async (req, res, next) => {
  try {
    const {
      name, owner_id, species_id, breed_id, gender, date_of_birth,
      age_years, age_months, color, weight_kg, microchip_id,
      registration_no, allergies, existing_conditions, notes,
    } = req.body;

    // Verify owner belongs to this clinic
    const owner = await prisma.petOwner.findFirst({
      where: { id: parseInt(owner_id), clinic_id: req.clinicId },
    });
    if (!owner) return res.status(404).json({ success: false, message: 'Pet owner not found in this clinic.' });

    const age = date_of_birth ? calculateAge(date_of_birth) : { years: parseInt(age_years || 0), months: parseInt(age_months || 0) };

    const photo_path = req.file ? `/uploads/pets/${req.file.filename}` : null;

    const pet = await prisma.pet.create({
      data: {
        clinic_id: req.clinicId,
        owner_id: parseInt(owner_id),
        species_id: parseInt(species_id),
        breed_id: breed_id ? parseInt(breed_id) : null,
        name: name.trim(),
        gender: gender || 'UNKNOWN',
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        age_years: age.years,
        age_months: age.months,
        color: color?.trim() || null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        microchip_id: microchip_id?.trim() || null,
        registration_no: registration_no?.trim() || null,
        photo_path,
        allergies: allergies?.trim() || null,
        existing_conditions: existing_conditions?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: { species: true, breed: true, owner: { select: { id: true, name: true, phone: true } } },
    });

    // Log initial weight
    if (weight_kg) {
      await prisma.weightLog.create({
        data: { pet_id: pet.id, weight_kg: parseFloat(weight_kg), notes: 'Initial registration weight' },
      });
    }

    res.status(201).json({ success: true, message: 'Pet registered successfully.', data: pet });
  } catch (err) {
    next(err);
  }
});

// ── PUT /pets/:id — Update Pet ────────────────────────────────────────────────

router.put('/:id', upload.single('photo'), petValidation, validate, async (req, res, next) => {
  try {
    const pet = await prisma.pet.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

    const {
      name, owner_id, species_id, breed_id, gender, date_of_birth,
      age_years, age_months, color, weight_kg, microchip_id,
      registration_no, allergies, existing_conditions, notes,
    } = req.body;

    const age = date_of_birth ? calculateAge(date_of_birth) : { years: parseInt(age_years || pet.age_years), months: parseInt(age_months || pet.age_months) };
    const photo_path = req.file ? `/uploads/pets/${req.file.filename}` : pet.photo_path;

    const updated = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        owner_id: owner_id ? parseInt(owner_id) : pet.owner_id,
        species_id: species_id ? parseInt(species_id) : pet.species_id,
        breed_id: breed_id ? parseInt(breed_id) : pet.breed_id,
        name, gender, date_of_birth: date_of_birth ? new Date(date_of_birth) : pet.date_of_birth,
        age_years: age.years, age_months: age.months,
        color, weight_kg: weight_kg ? parseFloat(weight_kg) : pet.weight_kg,
        microchip_id, registration_no, photo_path, allergies, existing_conditions, notes,
      },
      include: { species: true, breed: true, owner: { select: { id: true, name: true, phone: true } } },
    });

    // Log new weight if changed
    if (weight_kg && parseFloat(weight_kg) !== parseFloat(pet.weight_kg)) {
      await prisma.weightLog.create({
        data: { pet_id: pet.id, weight_kg: parseFloat(weight_kg) },
      });
    }

    res.json({ success: true, message: 'Pet updated.', data: updated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /pets/:id — Soft Delete ────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const pet = await prisma.pet.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

    await prisma.pet.update({
      where: { id: pet.id },
      data: { deleted_at: new Date(), is_active: false },
    });

    res.json({ success: true, message: 'Pet record archived.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /pets/:id/medical-history ─────────────────────────────────────────────

router.get('/:id/medical-history', async (req, res, next) => {
  try {
    const pet = await prisma.pet.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      select: { id: true, name: true },
    });
    if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

    const consultations = await prisma.consultation.findMany({
      where: { pet_id: pet.id, clinic_id: req.clinicId },
      orderBy: { consultation_date: 'desc' },
      include: {
        doctor: { select: { id: true, name: true, specialization: true } },
        prescriptions: {
          include: {
            items: {
              include: { medicine: { select: { id: true, name: true, unit: true } } },
            },
          },
        },
        lab_tests: true,
      },
    });

    res.json({ success: true, data: { pet, consultations } });
  } catch (err) {
    next(err);
  }
});

// ── GET /pets/species — Species list ──────────────────────────────────────────

router.get('/meta/species', async (req, res, next) => {
  try {
    const species = await prisma.species.findMany({
      include: { breeds: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: species });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
