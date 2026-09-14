'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const prisma = require('../config/database');
const { validate } = require('../middleware/validate');

// ── Validation Rules ──────────────────────────────────────────────────────────

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email address is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

// ── Helper: Generate JWT ──────────────────────────────────────────────────────

const generateToken = (userId, role, clinicId) => {
  return jwt.sign(
    { userId, role, clinicId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token + profile
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            currency: true,
            logo_path: true,
            city: true,
          },
        },
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.role !== 'SUPER_ADMIN' && user.clinic?.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your clinic has been suspended. Please contact VetPet support.',
      });
    }

    const token = generateToken(user.id, user.role, user.clinic_id);

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          specialization: user.specialization,
          clinic: user.clinic,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile with clinic context
 */
const me = async (req, res) => {
  const { user } = req;
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      specialization: user.specialization,
      license_number: user.license_number,
      clinic: user.clinic,
    },
  });
};

/**
 * POST /api/v1/auth/logout
 * Token is stateless JWT — inform client to discard the token.
 * (For future: maintain a token blacklist in Redis for immediate revocation)
 */
const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully. Please discard your token.' });
};

/**
 * POST /api/v1/auth/change-password
 * Allows authenticated user to change their own password
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashed },
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── Route Setup ───────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.post('/login', loginValidation, validate, login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
