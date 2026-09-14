'use strict';

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Authentication middleware — validates JWT Bearer token
 * Sets req.user (full user object) and req.clinicId for all downstream handlers
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please provide a valid Bearer token.' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    // Load user from database to ensure they are still active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            currency: true,
            logo_path: true,
          },
        },
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }

    // Enforce clinic active status (except super_admin)
    if (user.role !== 'SUPER_ADMIN' && user.clinic?.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, message: 'Your clinic account has been suspended. Please contact support.' });
    }

    req.user = user;
    req.clinicId = user.clinic_id; // KEY: tenant isolation starts here
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based authorization middleware factory
 * Usage: authorize('DOCTOR', 'CLINIC_ADMIN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};

/**
 * Tenant scope enforcement middleware
 * Ensures any resource accessed belongs to req.clinicId
 * This is auto-applied in all service queries via req.clinicId
 */
const tenantScope = (req, res, next) => {
  if (!req.clinicId && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Tenant context not established.' });
  }
  next();
};

module.exports = { authenticate, authorize, tenantScope };
