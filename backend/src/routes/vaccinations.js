'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// ── Validation ────────────────────────────────────────────────────────────────

const vaccinationValidation = [
  body('pet_id').isInt({ min: 1 }),
  body('vaccine_name').trim().notEmpty().withMessage('Vaccine name is required.'),
  body('administered_date').isDate().withMessage('Administered date required (YYYY-MM-DD).'),
  body('next_due_date').isDate().withMessage('Next due date required (YYYY-MM-DD).'),
  body('batch_number').optional({ nullable: true }).trim(),
  body('manufacturer').optional({ nullable: true }).trim(),
  body('notes').optional({ nullable: true }).trim(),
];

// ── GET /vaccinations — With upcoming/overdue filter ─────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { pet_id, status, days_ahead = 30 } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateFilter = {};
    if (status === 'upcoming') {
      const future = new Date(today);
      future.setDate(future.getDate() + parseInt(days_ahead));
      dateFilter = { next_due_date: { gte: today, lte: future } };
    } else if (status === 'overdue') {
      dateFilter = { next_due_date: { lt: today } };
    }

    const where = {
      clinic_id: req.clinicId,
      ...(pet_id && { pet_id: parseInt(pet_id) }),
      ...dateFilter,
    };

    const vaccinations = await prisma.vaccination.findMany({
      where,
      orderBy: { next_due_date: 'asc' },
      include: {
        pet: {
          select: {
            id: true, name: true, photo_path: true,
            owner: { select: { id: true, name: true, phone: true, whatsapp_number: true } },
            species: { select: { name: true } },
          },
        },
        doctor: { select: { id: true, name: true } },
      },
    });

    // Annotate each with due status
    const annotated = vaccinations.map(v => ({
      ...v,
      due_status: new Date(v.next_due_date) < today
        ? 'OVERDUE'
        : new Date(v.next_due_date) <= new Date(today.getTime() + 7 * 86400000)
          ? 'DUE_SOON'
          : 'UPCOMING',
    }));

    res.json({ success: true, data: annotated });
  } catch (err) {
    next(err);
  }
});

// ── POST /vaccinations — Record Vaccination ───────────────────────────────────

router.post(
  '/',
  authorize('DOCTOR', 'CLINIC_ADMIN'),
  vaccinationValidation,
  validate,
  async (req, res, next) => {
    try {
      const { pet_id, vaccine_name, administered_date, next_due_date, batch_number, manufacturer, notes } = req.body;

      const pet = await prisma.pet.findFirst({
        where: { id: parseInt(pet_id), clinic_id: req.clinicId },
        include: { owner: { select: { phone: true, whatsapp_number: true, name: true } } },
      });
      if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

      const vaccination = await prisma.$transaction(async (tx) => {
        const vac = await tx.vaccination.create({
          data: {
            clinic_id: req.clinicId,
            pet_id: parseInt(pet_id),
            doctor_id: req.user.id,
            vaccine_name: vaccine_name.trim(),
            batch_number: batch_number?.trim() || null,
            manufacturer: manufacturer?.trim() || null,
            administered_date: new Date(administered_date),
            next_due_date: new Date(next_due_date),
            notes: notes?.trim() || null,
          },
        });

        // Auto-create reminder for 7 days before next due date
        const reminderDate = new Date(next_due_date);
        reminderDate.setDate(reminderDate.getDate() - 7);

        if (reminderDate > new Date()) {
          await tx.reminder.create({
            data: {
              clinic_id: req.clinicId,
              reminder_type: 'VACCINATION_DUE',
              reference_id: vac.id,
              phone: pet.owner?.whatsapp_number || pet.owner?.phone || '',
              message: `Vaccination Reminder: ${pet.name}'s ${vaccine_name} is due on ${next_due_date}. Please visit Happy Paws Vet Clinic or call to reschedule.`,
              scheduled_at: reminderDate,
            },
          });
        }

        return vac;
      });

      res.status(201).json({ success: true, message: 'Vaccination recorded and reminder scheduled.', data: vaccination });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
