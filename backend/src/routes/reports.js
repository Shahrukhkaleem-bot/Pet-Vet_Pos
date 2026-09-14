'use strict';

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('CLINIC_ADMIN', 'SUPER_ADMIN'));

// ── Helper: date range parser ─────────────────────────────────────────────────

const parseDateRange = (from_date, to_date) => {
  const from = from_date ? new Date(from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = to_date ? new Date(to_date + 'T23:59:59') : new Date();
  return { from, to };
};

// ── GET /reports/revenue — Revenue vs Expenses P&L report ────────────────────

router.get('/revenue', async (req, res, next) => {
  try {
    const { from_date, to_date, group_by = 'day' } = req.query;
    const { from, to } = parseDateRange(from_date, to_date);
    const clinicId = req.clinicId;

    const [payments, expenses, invoiceStats] = await Promise.all([
      // Total revenue collected
      prisma.payment.aggregate({
        where: { invoice: { clinic_id: clinicId }, paid_at: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Total expenses
      prisma.expense.aggregate({
        where: { clinic_id: clinicId, expense_date: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Invoice breakdown by status
      prisma.invoice.groupBy({
        by: ['status'],
        where: { clinic_id: clinicId, created_at: { gte: from, lte: to } },
        _sum: { total_amount: true, due_amount: true },
        _count: { _all: true },
      }),
    ]);

    // Daily/monthly breakdown
    const dailyRevenue = await prisma.$queryRaw`
      SELECT
        p.paid_at::date as date,
        SUM(p.amount) as revenue,
        COUNT(*)::int as payment_count
      FROM "Payment" p
      JOIN "Invoice" i ON p.invoice_id = i.id
      WHERE i.clinic_id = ${clinicId}
        AND p.paid_at BETWEEN ${from} AND ${to}
      GROUP BY p.paid_at::date
      ORDER BY date ASC
    `;

    const totalRevenue = parseFloat(payments._sum.amount || 0);
    const totalExpenses = parseFloat(expenses._sum.amount || 0);

    res.json({
      success: true,
      data: {
        period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
        summary: {
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_profit: parseFloat((totalRevenue - totalExpenses).toFixed(2)),
          profit_margin: totalRevenue > 0 ? parseFloat(((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1)) : 0,
          payment_count: payments._count._all,
          outstanding_invoices: invoiceStats.filter(s => s.status !== 'PAID').reduce((t, s) => t + parseFloat(s._sum.due_amount || 0), 0),
        },
        invoice_breakdown: invoiceStats,
        daily_trend: dailyRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /reports/appointments — Appointment analytics ────────────────────────

router.get('/appointments', async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    const { from, to } = parseDateRange(from_date, to_date);
    const clinicId = req.clinicId;

    const [byStatus, byType, byDoctor, total] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['status'],
        where: { clinic_id: clinicId, appointment_date: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ['appointment_type'],
        where: { clinic_id: clinicId, appointment_date: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ['doctor_id'],
        where: { clinic_id: clinicId, appointment_date: { gte: from, lte: to } },
        _count: { _all: true },
        orderBy: { _count: { doctor_id: 'desc' } },
      }),
      prisma.appointment.count({
        where: { clinic_id: clinicId, appointment_date: { gte: from, lte: to } },
      }),
    ]);

    // Get doctor names for the byDoctor breakdown
    const doctorIds = byDoctor.map(b => b.doctor_id);
    const doctors = await prisma.user.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true },
    });
    const doctorMap = Object.fromEntries(doctors.map(d => [d.id, d.name]));

    const completedCount = byStatus.find(s => s.status === 'COMPLETED')?._count._all || 0;
    const noShowCount = byStatus.find(s => s.status === 'NO_SHOW')?._count._all || 0;

    res.json({
      success: true,
      data: {
        period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
        summary: {
          total,
          completed: completedCount,
          no_show: noShowCount,
          completion_rate: total > 0 ? parseFloat((completedCount / total * 100).toFixed(1)) : 0,
          no_show_rate: total > 0 ? parseFloat((noShowCount / total * 100).toFixed(1)) : 0,
        },
        by_status: byStatus,
        by_type: byType,
        by_doctor: byDoctor.map(d => ({
          doctor_id: d.doctor_id,
          doctor_name: doctorMap[d.doctor_id] || 'Unknown',
          count: d._count._all,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /reports/vaccinations — Vaccination compliance report ─────────────────

router.get('/vaccinations', async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    const { from, to } = parseDateRange(from_date, to_date);
    const clinicId = req.clinicId;
    const now = new Date();

    const [administered, overdue, dueSoon, byVaccine] = await Promise.all([
      // Administered this period
      prisma.vaccination.count({
        where: { clinic_id: clinicId, administered_date: { gte: from, lte: to } },
      }),
      // Currently overdue (next_due < today)
      prisma.vaccination.count({
        where: { clinic_id: clinicId, next_due_date: { lt: now } },
      }),
      // Due in next 7 days
      prisma.vaccination.count({
        where: { clinic_id: clinicId, next_due_date: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } },
      }),
      // Breakdown by vaccine name
      prisma.vaccination.groupBy({
        by: ['vaccine_name'],
        where: { clinic_id: clinicId, administered_date: { gte: from, lte: to } },
        _count: { _all: true },
        orderBy: { _count: { vaccine_name: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
        summary: { administered_this_period: administered, currently_overdue: overdue, due_next_7_days: dueSoon },
        by_vaccine: byVaccine.map(v => ({ name: v.vaccine_name, count: v._count._all })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /reports/medicines — Medicine sales and inventory report ───────────────

router.get('/medicines', async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    const { from, to } = parseDateRange(from_date, to_date);
    const clinicId = req.clinicId;

    // Top selling medicines (from invoice items)
    const topSelling = await prisma.invoiceItem.groupBy({
      by: ['medicine_id'],
      where: {
        invoice: { clinic_id: clinicId, created_at: { gte: from, lte: to } },
        item_type: 'MEDICINE',
        medicine_id: { not: null },
      },
      _sum: { quantity: true, total_price: true },
      _count: { _all: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const medicineIds = topSelling.map(t => t.medicine_id).filter(Boolean);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds } },
      select: { id: true, name: true, unit: true, selling_price: true, stock_quantity: true },
    });
    const medMap = Object.fromEntries(medicines.map(m => [m.id, m]));

    // Low stock alerts
    const lowStock = await prisma.medicine.findMany({
      where: { clinic_id: clinicId, is_active: true, stock_quantity: { lte: 10 } },
      select: { id: true, name: true, stock_quantity: true, min_stock_alert: true, unit: true },
      orderBy: { stock_quantity: 'asc' },
    });

    // Expired batches with remaining stock
    const expiredWithStock = await prisma.medicineBatch.findMany({
      where: { medicine: { clinic_id: clinicId }, expiry_date: { lt: new Date() }, quantity: { gt: 0 } },
      include: { medicine: { select: { id: true, name: true } } },
    });

    res.json({
      success: true,
      data: {
        period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
        top_selling: topSelling.map(t => ({
          medicine: medMap[t.medicine_id],
          units_sold: t._sum.quantity,
          revenue: parseFloat(t._sum.total_price?.toString() || '0'),
        })),
        low_stock_medicines: lowStock,
        expired_batches_with_stock: expiredWithStock,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /reports/doctors — Doctor performance report ─────────────────────────

router.get('/doctors', async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    const { from, to } = parseDateRange(from_date, to_date);
    const clinicId = req.clinicId;

    const doctors = await prisma.user.findMany({
      where: { clinic_id: clinicId, role: 'DOCTOR', is_active: true },
      select: { id: true, name: true, specialization: true },
    });

    const doctorStats = await Promise.all(doctors.map(async (doc) => {
      const [appointments, consultations, vaccinations] = await Promise.all([
        prisma.appointment.count({
          where: { clinic_id: clinicId, doctor_id: doc.id, appointment_date: { gte: from, lte: to }, status: 'COMPLETED' },
        }),
        prisma.consultation.count({
          where: { clinic_id: clinicId, doctor_id: doc.id, consultation_date: { gte: from, lte: to } },
        }),
        prisma.vaccination.count({
          where: { clinic_id: clinicId, doctor_id: doc.id, administered_date: { gte: from, lte: to } },
        }),
      ]);
      return { ...doc, completed_appointments: appointments, consultations, vaccinations };
    }));

    res.json({
      success: true,
      data: {
        period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
        doctors: doctorStats.sort((a, b) => b.completed_appointments - a.completed_appointments),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
