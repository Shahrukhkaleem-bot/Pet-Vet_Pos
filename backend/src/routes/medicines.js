'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// ── GET /medicines ────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { search, category, low_stock, expiring_soon, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000);

    const where = {
      clinic_id: req.clinicId,
      is_active: true,
      ...(search && { name: { contains: search } }),
      ...(category && { category: { contains: category } }),
      ...(low_stock === 'true' && { stock_quantity: { lte: prisma.medicine.fields.min_stock_alert } }),
    };

    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: {
          batches: {
            orderBy: { expiry_date: 'asc' },
          },
        },
      }),
      prisma.medicine.count({ where }),
    ]);

    // Annotate with stock/expiry status
    const annotated = medicines.map(m => {
      const activeBatches = m.batches.filter(b => new Date(b.expiry_date) >= today && b.quantity > 0);
      const expiringSoon = m.batches.filter(b => new Date(b.expiry_date) >= today && new Date(b.expiry_date) <= in30Days);
      const expiredBatches = m.batches.filter(b => new Date(b.expiry_date) < today && b.quantity > 0);

      return {
        ...m,
        is_low_stock: m.stock_quantity <= m.min_stock_alert,
        has_expiring_batches: expiringSoon.length > 0,
        has_expired_stock: expiredBatches.length > 0,
        nearest_expiry: activeBatches[0]?.expiry_date || null,
      };
    });

    // Filter expiring_soon after annotation
    const result = expiring_soon === 'true' ? annotated.filter(m => m.has_expiring_batches) : annotated;

    res.json({
      success: true,
      data: result,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /medicines/alerts — Stock & Expiry Alerts ─────────────────────────────

router.get('/alerts', async (req, res, next) => {
  try {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000);

    const [lowStock, expiringBatches] = await Promise.all([
      prisma.medicine.findMany({
        where: { clinic_id: req.clinicId, is_active: true, stock_quantity: { lte: 5 } },
        select: { id: true, name: true, stock_quantity: true, min_stock_alert: true, unit: true },
      }),
      prisma.medicineBatch.findMany({
        where: {
          medicine: { clinic_id: req.clinicId },
          expiry_date: { gte: today, lte: in30Days },
          quantity: { gt: 0 },
        },
        include: { medicine: { select: { id: true, name: true } } },
        orderBy: { expiry_date: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        low_stock: lowStock,
        expiring_soon: expiringBatches,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /medicines — Add Medicine ────────────────────────────────────────────

router.post(
  '/',
  authorize('CLINIC_ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Medicine name required.'),
    body('category').trim().notEmpty(),
    body('unit').optional().trim(),
    body('purchase_price').isFloat({ min: 0 }),
    body('selling_price').isFloat({ min: 0 }),
    body('min_stock_alert').optional().isInt({ min: 0 }),
    // Batch fields
    body('batch_number').optional().trim(),
    body('expiry_date').optional().isDate(),
    body('initial_quantity').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        name, generic_name, category, unit = 'Tablet',
        purchase_price, selling_price, min_stock_alert = 5,
        batch_number, expiry_date, initial_quantity = 0,
      } = req.body;

      const medicine = await prisma.$transaction(async (tx) => {
        const med = await tx.medicine.create({
          data: {
            clinic_id: req.clinicId,
            name: name.trim(),
            generic_name: generic_name?.trim() || null,
            category: category.trim(),
            unit: unit.trim(),
            purchase_price: parseFloat(purchase_price),
            selling_price: parseFloat(selling_price),
            stock_quantity: parseInt(initial_quantity),
            min_stock_alert: parseInt(min_stock_alert),
          },
        });

        // Add opening batch if details provided
        if (batch_number && expiry_date && parseInt(initial_quantity) > 0) {
          await tx.medicineBatch.create({
            data: {
              medicine_id: med.id,
              batch_number: batch_number.trim(),
              expiry_date: new Date(expiry_date),
              quantity: parseInt(initial_quantity),
              purchase_price: parseFloat(purchase_price),
            },
          });
        }

        return med;
      });

      res.status(201).json({ success: true, message: 'Medicine added to inventory.', data: medicine });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /medicines/:id/batches — Add Stock Batch ─────────────────────────────

router.post(
  '/:id/batches',
  authorize('CLINIC_ADMIN'),
  [
    body('batch_number').trim().notEmpty(),
    body('expiry_date').isDate(),
    body('quantity').isInt({ min: 1 }),
    body('purchase_price').isFloat({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const medicine = await prisma.medicine.findFirst({
        where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      });
      if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

      const { batch_number, expiry_date, quantity, purchase_price } = req.body;

      // Prevent adding already-expired batch
      if (new Date(expiry_date) <= new Date()) {
        return res.status(400).json({ success: false, message: 'Cannot add an already-expired batch.' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.medicineBatch.create({
          data: {
            medicine_id: medicine.id,
            batch_number: batch_number.trim(),
            expiry_date: new Date(expiry_date),
            quantity: parseInt(quantity),
            purchase_price: parseFloat(purchase_price),
          },
        });

        // Increase total stock
        await tx.medicine.update({
          where: { id: medicine.id },
          data: { stock_quantity: { increment: parseInt(quantity) } },
        });
      });

      res.status(201).json({ success: true, message: 'Stock batch added.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
