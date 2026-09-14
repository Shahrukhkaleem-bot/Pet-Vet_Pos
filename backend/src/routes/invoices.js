'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const PdfService = require('../services/PdfService');

router.use(authenticate);

// ── Helper: Generate invoice number ──────────────────────────────────────────

const generateInvoiceNumber = async (clinicId) => {
  const count = await prisma.invoice.count({ where: { clinic_id: clinicId } });
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
};

// ── Validation ────────────────────────────────────────────────────────────────

const invoiceValidation = [
  body('pet_id').isInt({ min: 1 }),
  body('owner_id').isInt({ min: 1 }),
  body('items').isArray({ min: 1 }).withMessage('At least one item required.'),
  body('items.*.item_type').isIn(['CONSULTATION', 'MEDICINE', 'VACCINE', 'LAB_TEST', 'PROCEDURE', 'OTHER']),
  body('items.*.description').trim().notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unit_price').isFloat({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('notes').optional({ nullable: true }).trim(),
];

// ── GET /invoices ─────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { status, owner_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      clinic_id: req.clinicId,
      ...(status && { status }),
      ...(owner_id && { owner_id: parseInt(owner_id) }),
      ...(from_date && to_date && {
        created_at: { gte: new Date(from_date), lte: new Date(to_date + 'T23:59:59') },
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' },
        include: {
          pet: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, phone: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /invoices/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      include: {
        pet: { include: { species: true } },
        owner: true,
        items: { include: { medicine: { select: { id: true, name: true, unit: true } } } },
        payments: { orderBy: { paid_at: 'desc' } },
      },
    });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// ── POST /invoices — Create Invoice ──────────────────────────────────────────

router.post(
  '/',
  authorize('RECEPTIONIST', 'CLINIC_ADMIN'),
  invoiceValidation,
  validate,
  async (req, res, next) => {
    try {
      const { pet_id, owner_id, consultation_id, items, discount = 0, tax = 0, notes } = req.body;

      // Verify pet and owner in this clinic
      const [pet, owner] = await Promise.all([
        prisma.pet.findFirst({ where: { id: parseInt(pet_id), clinic_id: req.clinicId } }),
        prisma.petOwner.findFirst({ where: { id: parseInt(owner_id), clinic_id: req.clinicId } }),
      ]);
      if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });
      if (!owner) return res.status(404).json({ success: false, message: 'Owner not found.' });

      const invoice_number = await generateInvoiceNumber(req.clinicId);

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.unit_price) * parseInt(item.quantity)), 0);
      const total_amount = subtotal - parseFloat(discount) + parseFloat(tax);
      const due_amount = total_amount; // No payment recorded yet

      const invoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            clinic_id: req.clinicId,
            invoice_number,
            pet_id: parseInt(pet_id),
            owner_id: parseInt(owner_id),
            consultation_id: consultation_id ? parseInt(consultation_id) : null,
            subtotal: parseFloat(subtotal.toFixed(2)),
            discount: parseFloat(parseFloat(discount).toFixed(2)),
            tax: parseFloat(parseFloat(tax).toFixed(2)),
            total_amount: parseFloat(total_amount.toFixed(2)),
            paid_amount: 0,
            due_amount: parseFloat(total_amount.toFixed(2)),
            status: 'UNPAID',
            notes: notes?.trim() || null,
            items: {
              create: items.map(item => ({
                item_type: item.item_type,
                medicine_id: item.medicine_id ? parseInt(item.medicine_id) : null,
                consultation_id: item.consultation_id ? parseInt(item.consultation_id) : null,
                description: item.description.trim(),
                quantity: parseInt(item.quantity),
                unit_price: parseFloat(item.unit_price),
                total_price: parseFloat((parseFloat(item.unit_price) * parseInt(item.quantity)).toFixed(2)),
              })),
            },
          },
          include: {
            items: { include: { medicine: { select: { id: true, name: true } } } },
            pet: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true, phone: true } },
          },
        });

        // Deduct medicine stock from inventory
        for (const item of items) {
          if (item.item_type === 'MEDICINE' && item.medicine_id) {
            const med = await tx.medicine.findFirst({
              where: { id: parseInt(item.medicine_id), clinic_id: req.clinicId },
            });
            if (med && med.stock_quantity >= parseInt(item.quantity)) {
              await tx.medicine.update({
                where: { id: med.id },
                data: { stock_quantity: { decrement: parseInt(item.quantity) } },
              });
              // Deduct from earliest non-expired batch (FEFO)
              const batches = await tx.medicineBatch.findMany({
                where: { medicine_id: med.id, expiry_date: { gte: new Date() }, quantity: { gt: 0 } },
                orderBy: { expiry_date: 'asc' },
              });
              let remaining = parseInt(item.quantity);
              for (const batch of batches) {
                if (remaining <= 0) break;
                const deduct = Math.min(batch.quantity, remaining);
                await tx.medicineBatch.update({
                  where: { id: batch.id },
                  data: { quantity: { decrement: deduct } },
                });
                remaining -= deduct;
              }
            }
          }
        }

        return inv;
      });

      res.status(201).json({ success: true, message: 'Invoice created.', data: invoice });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /invoices/:id/payments — Record Payment ─────────────────────────────

router.post(
  '/:id/payments',
  authorize('RECEPTIONIST', 'CLINIC_ADMIN'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0.'),
    body('payment_method').isIn(['CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER']),
    body('reference_no').optional({ nullable: true }).trim(),
    body('notes').optional({ nullable: true }).trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      });
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
        return res.status(400).json({ success: false, message: `Invoice is already ${invoice.status.toLowerCase()}.` });
      }

      const { amount, payment_method, reference_no, notes } = req.body;
      const payAmount = parseFloat(amount);

      if (payAmount > parseFloat(invoice.due_amount)) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (PKR ${payAmount}) exceeds outstanding due (PKR ${invoice.due_amount}).`,
        });
      }

      const updatedInvoice = await prisma.$transaction(async (tx) => {
        // Record payment
        await tx.payment.create({
          data: {
            invoice_id: invoice.id,
            amount: payAmount,
            payment_method,
            reference_no: reference_no?.trim() || null,
            notes: notes?.trim() || null,
          },
        });

        // Update invoice balances
        const newPaid = parseFloat(invoice.paid_amount) + payAmount;
        const newDue = parseFloat(invoice.total_amount) - newPaid;
        const newStatus = newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

        return tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paid_amount: parseFloat(newPaid.toFixed(2)),
            due_amount: parseFloat(newDue.toFixed(2)),
            status: newStatus,
          },
        });
      });

      res.json({
        success: true,
        message: `Payment of PKR ${payAmount.toLocaleString()} recorded via ${payment_method}.`,
        data: updatedInvoice,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
