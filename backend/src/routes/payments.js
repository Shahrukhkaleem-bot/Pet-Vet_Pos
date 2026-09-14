'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /payments — List all payments for this clinic
const prisma = require('../config/database');
router.get('/', async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { invoice: { clinic_id: req.clinicId } },
      orderBy: { paid_at: 'desc' },
      take: 100,
      include: {
        invoice: {
          select: {
            id: true, invoice_number: true,
            pet: { select: { name: true } },
            owner: { select: { name: true } },
          },
        },
      },
    });
    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
});

module.exports = router;
