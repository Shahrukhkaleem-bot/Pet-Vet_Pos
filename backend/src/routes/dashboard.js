'use strict';

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── GET /dashboard ─────────────────────────────────────────────────────────────
// Returns all key metrics for the clinic dashboard in one optimized call

router.get('/', async (req, res, next) => {
  try {
    const clinicId = req.clinicId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    // Start of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel data fetching
    const [
      todayAppointments,
      waitingCount,
      completedToday,
      upcomingVaccinations,
      followUpsDue,
      todayRevenue,
      monthRevenue,
      outstandingBalance,
      lowStockCount,
      recentPets,
      queueData,
    ] = await Promise.all([
      // Today's total appointments
      prisma.appointment.count({
        where: { clinic_id: clinicId, appointment_date: today },
      }),

      // Waiting patients (checked_in)
      prisma.appointment.count({
        where: { clinic_id: clinicId, appointment_date: today, status: { in: ['CHECKED_IN', 'SCHEDULED', 'CONFIRMED'] } },
      }),

      // Completed today
      prisma.appointment.count({
        where: { clinic_id: clinicId, appointment_date: today, status: 'COMPLETED' },
      }),

      // Upcoming vaccinations (next 7 days)
      prisma.vaccination.count({
        where: {
          clinic_id: clinicId,
          next_due_date: { gte: today, lte: new Date(today.getTime() + 7 * 86400000) },
        },
      }),

      // Follow-ups due (next 7 days)
      prisma.consultation.count({
        where: {
          clinic_id: clinicId,
          follow_up_date: { gte: today, lte: new Date(today.getTime() + 7 * 86400000) },
        },
      }),

      // Revenue today (paid + partial)
      prisma.payment.aggregate({
        where: {
          invoice: { clinic_id: clinicId },
          paid_at: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),

      // Revenue this month
      prisma.payment.aggregate({
        where: {
          invoice: { clinic_id: clinicId },
          paid_at: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),

      // Outstanding balance
      prisma.invoice.aggregate({
        where: {
          clinic_id: clinicId,
          status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        },
        _sum: { due_amount: true },
      }),

      // Low stock medicines count
      prisma.medicine.count({
        where: { clinic_id: clinicId, is_active: true, stock_quantity: { lte: 5 } },
      }),

      // Recent 5 pets registered
      prisma.pet.findMany({
        where: { clinic_id: clinicId, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true, name: true, photo_path: true, created_at: true,
          species: { select: { name: true } },
          owner: { select: { id: true, name: true, phone: true } },
        },
      }),

      // Today's queue
      prisma.appointment.findMany({
        where: {
          clinic_id: clinicId,
          appointment_date: today,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'] },
        },
        orderBy: [{ token_number: 'asc' }],
        include: {
          pet: { select: { id: true, name: true, photo_path: true } },
          doctor: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Revenue trend (last 7 days)
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const nextDay = new Date(day.getTime() + 86400000);
      const dayRevenue = await prisma.payment.aggregate({
        where: {
          invoice: { clinic_id: clinicId },
          paid_at: { gte: day, lt: nextDay },
        },
        _sum: { amount: true },
      });
      revenueTrend.push({
        date: day.toISOString().split('T')[0],
        amount: parseFloat(dayRevenue._sum.amount || 0),
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          today_appointments: todayAppointments,
          waiting_patients: waitingCount,
          completed_today: completedToday,
          vaccinations_due_soon: upcomingVaccinations,
          follow_ups_due: followUpsDue,
          revenue_today: parseFloat(todayRevenue._sum.amount || 0),
          revenue_this_month: parseFloat(monthRevenue._sum.amount || 0),
          outstanding_balance: parseFloat(outstandingBalance._sum.due_amount || 0),
          low_stock_alerts: lowStockCount,
        },
        queue: queueData,
        recent_pets: recentPets,
        revenue_trend: revenueTrend,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
