'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate, authorize('CLINIC_ADMIN'));

const CATEGORIES = ['SALARY', 'RENT', 'UTILITIES', 'MEDICINE_PURCHASE', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'OTHER'];

// ── GET /expenses ─────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { category, from_date, to_date, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      clinic_id: req.clinicId,
      ...(category && { category }),
      ...(from_date && to_date && {
        expense_date: { gte: new Date(from_date), lte: new Date(to_date + 'T23:59:59') },
      }),
    };

    const [expenses, total, totals] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { expense_date: 'desc' },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    res.json({
      success: true,
      data: expenses,
      meta: { total_amount: parseFloat(totals._sum.amount || 0) },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /expenses/summary — Monthly summary by category ──────────────────────

router.get('/summary', async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const summary = await prisma.expense.groupBy({
      by: ['category'],
      where: { clinic_id: req.clinicId, expense_date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const total = summary.reduce((s, r) => s + parseFloat(r._sum.amount || 0), 0);

    res.json({
      success: true,
      data: { summary, total, period: `${year}-${String(month).padStart(2, '0')}` },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /expenses ────────────────────────────────────────────────────────────

router.post(
  '/',
  [
    body('category').isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.'),
    body('description').trim().notEmpty().withMessage('Description is required.'),
    body('expense_date').isISO8601().withMessage('Valid date required.'),
    body('vendor').optional({ nullable: true }).trim(),
    body('notes').optional({ nullable: true }).trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { category, amount, description, expense_date, vendor, notes } = req.body;

      const expense = await prisma.expense.create({
        data: {
          clinic_id: req.clinicId,
          recorded_by: req.user.id,
          category,
          amount: parseFloat(amount),
          description: description.trim(),
          expense_date: new Date(expense_date),
          vendor: vendor?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      res.status(201).json({ success: true, message: 'Expense recorded.', data: expense });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /expenses/:id ─────────────────────────────────────────────────────────

router.put(
  '/:id',
  [
    body('category').optional().isIn(CATEGORIES),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('description').optional().trim().notEmpty(),
    body('expense_date').optional().isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const expense = await prisma.expense.findFirst({
        where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      });
      if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

      const updated = await prisma.expense.update({
        where: { id: expense.id },
        data: {
          ...(req.body.category && { category: req.body.category }),
          ...(req.body.amount && { amount: parseFloat(req.body.amount) }),
          ...(req.body.description && { description: req.body.description.trim() }),
          ...(req.body.expense_date && { expense_date: new Date(req.body.expense_date) }),
          ...(req.body.vendor !== undefined && { vendor: req.body.vendor?.trim() || null }),
          ...(req.body.notes !== undefined && { notes: req.body.notes?.trim() || null }),
        },
      });

      res.json({ success: true, message: 'Expense updated.', data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /expenses/:id ──────────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
    });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    await prisma.expense.delete({ where: { id: expense.id } });
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
