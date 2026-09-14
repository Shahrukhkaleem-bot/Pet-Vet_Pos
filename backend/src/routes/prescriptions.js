'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const PdfService = require('../services/PdfService');

router.use(authenticate);

// ── Validation ────────────────────────────────────────────────────────────────

const prescriptionValidation = [
  body('consultation_id').isInt({ min: 1 }).withMessage('Valid consultation ID required.'),
  body('items').isArray({ min: 1 }).withMessage('At least one medicine is required.'),
  body('items.*.medicine_id').isInt({ min: 1 }).withMessage('Valid medicine ID required for each item.'),
  body('items.*.dosage').trim().notEmpty().withMessage('Dosage is required for each medicine.'),
  body('items.*.frequency').trim().notEmpty().withMessage('Frequency is required (e.g., Twice daily).'),
  body('items.*.duration_days').isInt({ min: 1, max: 365 }).withMessage('Duration (days) must be 1–365.'),
  body('instructions').optional({ nullable: true }).trim(),
];

// ── GET /prescriptions/:id ────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const prescription = await prisma.prescription.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      include: {
        items: {
          include: { medicine: { select: { id: true, name: true, generic_name: true, unit: true } } },
        },
        consultation: {
          include: {
            pet: { include: { species: true, owner: true } },
            doctor: { select: { id: true, name: true, specialization: true, license_number: true } },
          },
        },
      },
    });

    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found.' });
    res.json({ success: true, data: prescription });
  } catch (err) {
    next(err);
  }
});

// ── POST /prescriptions — Create Prescription ─────────────────────────────────

router.post(
  '/',
  authorize('DOCTOR', 'CLINIC_ADMIN'),
  prescriptionValidation,
  validate,
  async (req, res, next) => {
    try {
      const { consultation_id, items, instructions } = req.body;

      // Verify consultation belongs to this clinic
      const consultation = await prisma.consultation.findFirst({
        where: { id: parseInt(consultation_id), clinic_id: req.clinicId },
        include: {
          pet: { include: { species: true, owner: true } },
          doctor: { select: { id: true, name: true, specialization: true, license_number: true } },
        },
      });
      if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' });

      // Validate all medicines exist in this clinic + check no expired batches
      const medicineIds = items.map(i => parseInt(i.medicine_id));
      const medicines = await prisma.medicine.findMany({
        where: { id: { in: medicineIds }, clinic_id: req.clinicId, is_active: true },
        include: {
          batches: {
            where: { expiry_date: { gte: new Date() }, quantity: { gt: 0 } },
            orderBy: { expiry_date: 'asc' },
            take: 1,
          },
        },
      });

      if (medicines.length !== medicineIds.length) {
        return res.status(400).json({ success: false, message: 'One or more medicines not found or inactive in this clinic.' });
      }

      // Expiry check — block prescription if no valid non-expired batch exists
      const expiredMeds = medicines.filter(m => m.batches.length === 0);
      if (expiredMeds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `The following medicines have no valid stock or are expired: ${expiredMeds.map(m => m.name).join(', ')}`,
        });
      }

      const prescription = await prisma.$transaction(async (tx) => {
        const rx = await tx.prescription.create({
          data: {
            clinic_id: req.clinicId,
            consultation_id: parseInt(consultation_id),
            instructions: instructions?.trim() || null,
            items: {
              create: items.map(item => ({
                medicine_id: parseInt(item.medicine_id),
                dosage: item.dosage.trim(),
                frequency: item.frequency.trim(),
                duration_days: parseInt(item.duration_days),
                instructions: item.instructions?.trim() || null,
              })),
            },
          },
          include: {
            items: {
              include: { medicine: { select: { id: true, name: true, generic_name: true, unit: true } } },
            },
          },
        });

        return rx;
      });

      // Generate PDF asynchronously (don't block the response)
      const clinic = await prisma.clinic.findUnique({ where: { id: req.clinicId } });
      PdfService.generatePrescriptionPdf(prescription, consultation, clinic)
        .then(async (pdfPath) => {
          await prisma.prescription.update({
            where: { id: prescription.id },
            data: { pdf_path: pdfPath },
          });
        })
        .catch(err => console.error('[PDF Generation Error]', err));

      res.status(201).json({
        success: true,
        message: 'Prescription created. PDF is being generated.',
        data: prescription,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
