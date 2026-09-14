'use strict';

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── GET /queue/today — Live clinic token queue ────────────────────────────────

router.get('/today', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { doctor_id } = req.query;

    const queue = await prisma.appointment.findMany({
      where: {
        clinic_id: req.clinicId,
        appointment_date: today,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'] },
        ...(doctor_id && { doctor_id: parseInt(doctor_id) }),
      },
      orderBy: [{ token_number: 'asc' }, { start_time: 'asc' }],
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            photo_path: true,
            species: { select: { name: true } },
            owner: { select: { id: true, name: true, phone: true, whatsapp_number: true } },
          },
        },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    });

    const completed = await prisma.appointment.count({
      where: { clinic_id: req.clinicId, appointment_date: today, status: 'COMPLETED' },
    });

    res.json({
      success: true,
      data: {
        queue,
        summary: {
          waiting: queue.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
          checked_in: queue.filter(a => a.status === 'CHECKED_IN').length,
          in_consultation: queue.filter(a => a.status === 'IN_CONSULTATION').length,
          completed_today: completed,
          total: queue.length + completed,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /queue/call-next — Call next patient ─────────────────────────────────

router.post('/call-next', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { doctor_id } = req.body;

    const next = await prisma.appointment.findFirst({
      where: {
        clinic_id: req.clinicId,
        appointment_date: today,
        status: 'CHECKED_IN',
        ...(doctor_id && { doctor_id: parseInt(doctor_id) }),
      },
      orderBy: { token_number: 'asc' },
      include: {
        pet: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    if (!next) {
      return res.json({ success: true, message: 'No checked-in patients waiting.', data: null });
    }

    const updated = await prisma.appointment.update({
      where: { id: next.id },
      data: { status: 'IN_CONSULTATION' },
    });

    res.json({
      success: true,
      message: `Now calling Token #${String(next.token_number).padStart(2, '0')} — ${next.pet.name}`,
      data: { ...updated, pet: next.pet, doctor: next.doctor },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
