'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate, authorize('SUPER_ADMIN'));

// GET /admin/stats — Super Admin SaaS overview
router.get('/stats', async (req, res, next) => {
  try {
    const [totalClinics, activeClinics, trialClinics, totalUsers] = await Promise.all([
      prisma.clinic.count(),
      prisma.clinic.count({ where: { status: 'ACTIVE' } }),
      prisma.clinic.count({ where: { status: 'TRIAL' } }),
      prisma.user.count(),
    ]);
    res.json({ success: true, data: { totalClinics, activeClinics, trialClinics, totalUsers } });
  } catch (err) { next(err); }
});

// GET /admin/clinics — List all clinics
router.get('/clinics', async (req, res, next) => {
  try {
    const clinics = await prisma.clinic.findMany({
      include: {
        _count: { select: { users: true, pets: true, appointments: true } },
        plan: { select: { name: true, price_monthly: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: clinics });
  } catch (err) { next(err); }
});

// PUT /admin/clinics/:id/status — Suspend/activate clinic
router.put('/clinics/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'TRIAL'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const clinic = await prisma.clinic.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
    });
    res.json({ success: true, message: `Clinic ${status.toLowerCase()}.`, data: clinic });
  } catch (err) { next(err); }
});

module.exports = router;
