'use strict';

const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const ownerRoutes = require('./owners');
const petRoutes = require('./pets');
const appointmentRoutes = require('./appointments');
const consultationRoutes = require('./consultations');
const prescriptionRoutes = require('./prescriptions');
const vaccinationRoutes = require('./vaccinations');
const labTestRoutes = require('./labTests');
const medicineRoutes = require('./medicines');
const invoiceRoutes = require('./invoices');
const paymentRoutes = require('./payments');
const queueRoutes = require('./queue');
const expenseRoutes = require('./expenses');
const reportRoutes = require('./reports');
const whatsappRoutes = require('./whatsapp');
const adminRoutes = require('./admin');
const uploadRoutes = require('./uploads');

// Public routes
router.use('/auth', authRoutes);

// Protected routes (auth middleware applied within each router)
router.use('/dashboard', dashboardRoutes);
router.use('/owners', ownerRoutes);
router.use('/pets', petRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/queue', queueRoutes);
router.use('/consultations', consultationRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/vaccinations', vaccinationRoutes);
router.use('/lab-tests', labTestRoutes);
router.use('/medicines', medicineRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
