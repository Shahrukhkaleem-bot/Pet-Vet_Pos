'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, param } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// Multer config for lab report uploads (PDF + images)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './storage/uploads/labs'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `lab-${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF and image files allowed.'));
  },
});

// ── GET /lab-tests ────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { pet_id, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      clinic_id: req.clinicId,
      ...(pet_id && { pet_id: parseInt(pet_id) }),
      ...(status && { status }),
    };

    const [labTests, total] = await Promise.all([
      prisma.labTest.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { requested_at: 'desc' },
        include: {
          pet: { select: { id: true, name: true, species: { select: { name: true } } } },
          doctor: { select: { id: true, name: true } },
          consultation: { select: { id: true, chief_complaint: true } },
        },
      }),
      prisma.labTest.count({ where }),
    ]);

    res.json({
      success: true,
      data: labTests,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /lab-tests/:id ────────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const labTest = await prisma.labTest.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      include: {
        pet: { include: { species: true, owner: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        consultation: true,
      },
    });
    if (!labTest) return res.status(404).json({ success: false, message: 'Lab test not found.' });
    res.json({ success: true, data: labTest });
  } catch (err) {
    next(err);
  }
});

// ── POST /lab-tests — Request a lab test ─────────────────────────────────────

router.post(
  '/',
  authorize('DOCTOR', 'CLINIC_ADMIN'),
  [
    body('pet_id').isInt({ min: 1 }),
    body('test_name').trim().notEmpty().withMessage('Test name required.'),
    body('test_type').isIn(['BLOOD_CBC', 'BLOOD_CHEMISTRY', 'URINALYSIS', 'FECAL', 'CULTURE', 'XRAY', 'ULTRASOUND', 'BIOPSY', 'OTHER']),
    body('notes').optional({ nullable: true }).trim(),
    body('consultation_id').optional({ nullable: true }).isInt({ min: 1 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { pet_id, test_name, test_type, notes, consultation_id } = req.body;

      const pet = await prisma.pet.findFirst({ where: { id: parseInt(pet_id), clinic_id: req.clinicId } });
      if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

      const labTest = await prisma.labTest.create({
        data: {
          clinic_id: req.clinicId,
          pet_id: parseInt(pet_id),
          doctor_id: req.user.id,
          consultation_id: consultation_id ? parseInt(consultation_id) : null,
          test_name: test_name.trim(),
          test_type,
          status: 'PENDING',
          notes: notes?.trim() || null,
          requested_at: new Date(),
        },
        include: {
          pet: { select: { id: true, name: true } },
          doctor: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ success: true, message: 'Lab test requested.', data: labTest });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /lab-tests/:id/result — Upload result + mark completed ────────────────

router.put(
  '/:id/result',
  authorize('DOCTOR', 'CLINIC_ADMIN'),
  upload.single('report_file'),
  async (req, res, next) => {
    try {
      const { result_summary, completed_at } = req.body;

      const labTest = await prisma.labTest.findFirst({
        where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
      });
      if (!labTest) return res.status(404).json({ success: false, message: 'Lab test not found.' });
      if (labTest.status === 'COMPLETED') {
        return res.status(400).json({ success: false, message: 'Lab test is already completed.' });
      }

      const updated = await prisma.labTest.update({
        where: { id: labTest.id },
        data: {
          status: 'COMPLETED',
          result_summary: result_summary?.trim() || null,
          report_file_path: req.file ? `/uploads/labs/${req.file.filename}` : null,
          completed_at: completed_at ? new Date(completed_at) : new Date(),
        },
      });

      res.json({ success: true, message: 'Lab test result saved.', data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /lab-tests/:id ─────────────────────────────────────────────────────

router.delete('/:id', authorize('CLINIC_ADMIN'), async (req, res, next) => {
  try {
    const labTest = await prisma.labTest.findFirst({
      where: { id: parseInt(req.params.id), clinic_id: req.clinicId },
    });
    if (!labTest) return res.status(404).json({ success: false, message: 'Lab test not found.' });

    await prisma.labTest.delete({ where: { id: labTest.id } });
    res.json({ success: true, message: 'Lab test deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
