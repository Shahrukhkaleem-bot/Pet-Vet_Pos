'use strict';

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// All owner routes require authentication
router.use(authenticate);

// ── Validation Rules ──────────────────────────────────────────────────────────

const ownerValidation = [
  body('name').trim().notEmpty().withMessage('Owner name is required.').isLength({ max: 255 }),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^\+92[0-9]{10}$/).withMessage('Phone must be in format +923XXXXXXXXX'),
  body('whatsapp_number')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+92[0-9]{10}$/).withMessage('WhatsApp must be in format +923XXXXXXXXX'),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('city').optional().trim().isLength({ max: 100 }),
  body('address').optional({ nullable: true }).trim(),
  body('notes').optional({ nullable: true }).trim(),
];

// ── Helper: Format owner response ────────────────────────────────────────────

const formatOwner = (owner) => ({
  id: owner.id,
  name: owner.name,
  phone: owner.phone,
  whatsapp_number: owner.whatsapp_number,
  email: owner.email,
  address: owner.address,
  city: owner.city,
  notes: owner.notes,
  pet_count: owner._count?.pets ?? 0,
  created_at: owner.created_at,
});

// ── GET /owners — List & Search ───────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { search, city, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const clinicId = req.clinicId;

    const where = {
      clinic_id: clinicId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { whatsapp_number: { contains: search } },
          { email: { contains: search } },
          { pets: { some: { name: { contains: search } } } },
        ],
      }),
      ...(city && { city: { contains: city } }),
    };

    const [owners, total] = await Promise.all([
      prisma.petOwner.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: { _count: { select: { pets: true } } },
      }),
      prisma.petOwner.count({ where }),
    ]);

    res.json({
      success: true,
      data: owners.map(formatOwner),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /owners/:id — Owner Profile ──────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const owner = await prisma.petOwner.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      include: {
        pets: {
          where: { is_active: true },
          include: { species: true, breed: true },
          orderBy: { name: 'asc' },
        },
        invoices: {
          orderBy: { created_at: 'desc' },
          take: 10,
          select: {
            id: true,
            invoice_number: true,
            total_amount: true,
            paid_amount: true,
            due_amount: true,
            status: true,
            created_at: true,
          },
        },
        _count: { select: { pets: true, invoices: true } },
      },
    });

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found.' });
    }

    // Calculate outstanding balance
    const outstanding = await prisma.invoice.aggregate({
      where: { owner_id: owner.id, clinic_id: req.clinicId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
      _sum: { due_amount: true },
    });

    res.json({
      success: true,
      data: {
        ...formatOwner(owner),
        pets: owner.pets,
        recent_invoices: owner.invoices,
        outstanding_balance: outstanding._sum.due_amount || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /owners — Create Owner ───────────────────────────────────────────────

router.post('/', ownerValidation, validate, async (req, res, next) => {
  try {
    const { name, phone, whatsapp_number, email, address, city, notes } = req.body;

    const owner = await prisma.petOwner.create({
      data: {
        clinic_id: req.clinicId,
        name: name.trim(),
        phone: phone.trim(),
        whatsapp_number: whatsapp_number?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || 'Lahore',
        notes: notes?.trim() || null,
      },
      include: { _count: { select: { pets: true } } },
    });

    res.status(201).json({
      success: true,
      message: 'Pet owner registered successfully.',
      data: formatOwner(owner),
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /owners/:id — Update Owner ───────────────────────────────────────────

router.put('/:id', ownerValidation, validate, async (req, res, next) => {
  try {
    const owner = await prisma.petOwner.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
    });
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found.' });

    const { name, phone, whatsapp_number, email, address, city, notes } = req.body;

    const updated = await prisma.petOwner.update({
      where: { id: owner.id },
      data: { name, phone, whatsapp_number, email, address, city, notes },
      include: { _count: { select: { pets: true } } },
    });

    res.json({ success: true, message: 'Owner updated.', data: formatOwner(updated) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
