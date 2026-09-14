'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// ── Validation ────────────────────────────────────────────────────────────────

const consultationValidation = [
  body('pet_id').isInt({ min: 1 }).withMessage('Valid pet ID required.'),
  body('appointment_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('chief_complaint').trim().notEmpty().withMessage('Chief complaint is required.'),
  body('diagnosis').trim().notEmpty().withMessage('Diagnosis is required.'),
  body('weight_kg').optional({ nullable: true }).isFloat({ min: 0 }),
  body('temperature_f').optional({ nullable: true }).isFloat({ min: 90, max: 115 }).withMessage('Temperature must be between 90°F and 115°F.'),
  body('heart_rate_bpm').optional({ nullable: true }).isInt({ min: 1, max: 300 }),
  body('respiratory_rate').optional({ nullable: true }).isInt({ min: 1, max: 100 }),
  body('follow_up_date').optional({ nullable: true }).isDate(),
];

// ── GET /consultations/:id ────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const consultation = await prisma.consultation.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      include: {
        pet: {
          include: {
            species: true,
            breed: true,
            owner: true,
          },
        },
        doctor: { select: { id: true, name: true, specialization: true } },
        prescriptions: {
          include: {
            items: {
              include: { medicine: { select: { id: true, name: true, unit: true, generic_name: true } } },
            },
          },
        },
        lab_tests: true,
      },
    });

    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' });
    res.json({ success: true, data: consultation });
  } catch (err) {
    next(err);
  }
});

// ── POST /consultations — Start Consultation ──────────────────────────────────

router.post(
  '/',
  authorize('DOCTOR', 'CLINIC_ADMIN'),
  consultationValidation,
  validate,
  async (req, res, next) => {
    try {
      const {
        pet_id, appointment_id, chief_complaint, symptoms, physical_exam,
        diagnosis, treatment_plan, clinical_notes, follow_up_date,
        weight_kg, temperature_f, heart_rate_bpm, respiratory_rate,
      } = req.body;

      // Verify pet is in this clinic
      const pet = await prisma.pet.findFirst({
        where: { id: parseInt(pet_id), clinic_id: req.clinicId },
      });
      if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

      // Use a transaction for atomicity
      const consultation = await prisma.$transaction(async (tx) => {
        const cons = await tx.consultation.create({
          data: {
            clinic_id: req.clinicId,
            pet_id: parseInt(pet_id),
            doctor_id: req.user.id,
            appointment_id: appointment_id ? parseInt(appointment_id) : null,
            consultation_date: new Date(),
            chief_complaint: chief_complaint.trim(),
            symptoms: symptoms?.trim() || null,
            physical_exam: physical_exam?.trim() || null,
            diagnosis: diagnosis.trim(),
            treatment_plan: treatment_plan?.trim() || null,
            clinical_notes: clinical_notes?.trim() || null,
            follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
            weight_kg: weight_kg ? parseFloat(weight_kg) : null,
            temperature_f: temperature_f ? parseFloat(temperature_f) : null,
            heart_rate_bpm: heart_rate_bpm ? parseInt(heart_rate_bpm) : null,
            respiratory_rate: respiratory_rate ? parseInt(respiratory_rate) : null,
          },
        });

        // Update appointment status to IN_CONSULTATION -> COMPLETED
        if (appointment_id) {
          await tx.appointment.updateMany({
            where: { id: parseInt(appointment_id), clinic_id: req.clinicId },
            data: { status: 'IN_CONSULTATION' },
          });
        }

        // Log weight
        if (weight_kg) {
          await tx.weightLog.create({
            data: { pet_id: parseInt(pet_id), weight_kg: parseFloat(weight_kg), notes: 'Recorded during consultation' },
          });
          // Update pet's current weight
          await tx.pet.update({
            where: { id: parseInt(pet_id) },
            data: { weight_kg: parseFloat(weight_kg) },
          });
        }

        // Schedule follow-up reminder
        if (follow_up_date) {
          const followUpDate = new Date(follow_up_date);
          const reminderDate = new Date(followUpDate);
          reminderDate.setDate(reminderDate.getDate() - 2); // 2 days before

          await tx.reminder.create({
            data: {
              clinic_id: req.clinicId,
              reminder_type: 'FOLLOW_UP',
              reference_id: cons.id,
              phone: pet.owner?.phone || '',
              message: `Reminder: ${pet.name}'s follow-up appointment is due on ${follow_up_date}. Please contact the clinic to book.`,
              scheduled_at: reminderDate,
            },
          });
        }

        return cons;
      });

      // Fetch full consultation with relations
      const full = await prisma.consultation.findUnique({
        where: { id: consultation.id },
        include: {
          pet: { include: { species: true, owner: { select: { id: true, name: true, phone: true, whatsapp_number: true } } } },
          doctor: { select: { id: true, name: true, specialization: true } },
        },
      });

      res.status(201).json({ success: true, message: 'Consultation recorded.', data: full });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /consultations/:id — Update notes ─────────────────────────────────────

router.put('/:id', authorize('DOCTOR', 'CLINIC_ADMIN'), async (req, res, next) => {
  try {
    const consultation = await prisma.consultation.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
    });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' });

    const { symptoms, physical_exam, diagnosis, treatment_plan, clinical_notes, follow_up_date } = req.body;

    const updated = await prisma.consultation.update({
      where: { id: consultation.id },
      data: { symptoms, physical_exam, diagnosis, treatment_plan, clinical_notes, follow_up_date: follow_up_date ? new Date(follow_up_date) : null },
    });

    res.json({ success: true, message: 'Consultation updated.', data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
