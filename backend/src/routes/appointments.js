'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// ── Validation ────────────────────────────────────────────────────────────────

const appointmentValidation = [
  body('pet_id').isInt({ min: 1 }).withMessage('Valid pet ID required.'),
  body('doctor_id').isInt({ min: 1 }).withMessage('Valid doctor ID required.'),
  body('appointment_date').isDate().withMessage('Valid date required (YYYY-MM-DD).'),
  body('start_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:MM.'),
  body('end_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:MM.'),
  body('appointment_type')
    .optional()
    .isIn(['CONSULTATION', 'VACCINATION', 'SURGERY', 'GROOMING', 'FOLLOW_UP', 'EMERGENCY'])
    .withMessage('Invalid appointment type.'),
  body('reason').optional({ nullable: true }).trim(),
  body('notes').optional({ nullable: true }).trim(),
];

// ── GET /appointments ─────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { date, doctor_id, status, month, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let dateFilter = {};
    if (date) {
      dateFilter = { appointment_date: new Date(date) };
    } else if (month) {
      const [year, m] = month.split('-').map(Number);
      dateFilter = {
        appointment_date: {
          gte: new Date(year, m - 1, 1),
          lte: new Date(year, m, 0),
        },
      };
    }

    const where = {
      clinic_id: req.clinicId,
      ...dateFilter,
      ...(doctor_id && { doctor_id: parseInt(doctor_id) }),
      ...(status && { status }),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ appointment_date: 'asc' }, { start_time: 'asc' }],
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
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /appointments — Book Appointment (with double-booking check) ─────────

router.post('/', appointmentValidation, validate, async (req, res, next) => {
  try {
    const {
      pet_id, doctor_id, appointment_date, start_time, end_time,
      appointment_type, reason, notes,
    } = req.body;

    // Verify pet belongs to this clinic
    const pet = await prisma.pet.findFirst({
      where: { id: parseInt(pet_id), clinic_id: req.clinicId },
    });
    if (!pet) return res.status(404).json({ success: false, message: 'Pet not found in this clinic.' });

    // Double-booking check: same doctor, same date, overlapping time
    const conflict = await prisma.appointment.findFirst({
      where: {
        clinic_id: req.clinicId,
        doctor_id: parseInt(doctor_id),
        appointment_date: new Date(appointment_date),
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'] },
        OR: [
          {
            AND: [
              { start_time: { lte: start_time } },
              { end_time: { gt: start_time } },
            ],
          },
          {
            AND: [
              { start_time: { lt: end_time } },
              { end_time: { gte: end_time } },
            ],
          },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Dr. ${doctor_id} already has an appointment from ${conflict.start_time} to ${conflict.end_time}. Please choose a different time.`,
      });
    }

    // Assign daily token number
    const tokenCount = await prisma.appointment.count({
      where: {
        clinic_id: req.clinicId,
        appointment_date: new Date(appointment_date),
      },
    });
    const token_number = tokenCount + 1;

    const appointment = await prisma.appointment.create({
      data: {
        clinic_id: req.clinicId,
        pet_id: parseInt(pet_id),
        doctor_id: parseInt(doctor_id),
        appointment_date: new Date(appointment_date),
        start_time,
        end_time,
        appointment_type: appointment_type || 'CONSULTATION',
        reason: reason?.trim() || null,
        notes: notes?.trim() || null,
        token_number,
      },
      include: {
        pet: {
          select: {
            id: true, name: true, photo_path: true,
            species: { select: { name: true } },
            owner: { select: { id: true, name: true, phone: true, whatsapp_number: true } },
          },
        },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Appointment booked.', data: appointment });
  } catch (err) {
    next(err);
  }
});

// ── PUT /appointments/:id/status — Update Status ─────────────────────────────

router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const appt = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
    });
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: { status },
      include: {
        pet: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, message: 'Appointment status updated.', data: updated });
  } catch (err) {
    next(err);
  }
});

// ── PUT /appointments/:id/reschedule ─────────────────────────────────────────

router.put('/:id/reschedule', async (req, res, next) => {
  try {
    const { appointment_date, start_time, end_time } = req.body;

    const appt = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
    });
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    // Conflict check for new time
    const conflict = await prisma.appointment.findFirst({
      where: {
        clinic_id: req.clinicId,
        doctor_id: appt.doctor_id,
        appointment_date: new Date(appointment_date),
        id: { not: appt.id },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'] },
        OR: [
          { AND: [{ start_time: { lte: start_time } }, { end_time: { gt: start_time } }] },
          { AND: [{ start_time: { lt: end_time } }, { end_time: { gte: end_time } }] },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: 'New time conflicts with an existing appointment.' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        appointment_date: new Date(appointment_date),
        start_time,
        end_time,
        status: 'SCHEDULED',
      },
    });

    res.json({ success: true, message: 'Appointment rescheduled.', data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
