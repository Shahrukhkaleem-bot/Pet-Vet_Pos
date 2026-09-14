'use strict';

const cron = require('node-cron');
const prisma = require('../config/database');

/**
 * Background Scheduler — runs reminder jobs via node-cron
 * Uses Asia/Karachi timezone for all scheduling
 */
const startScheduledJobs = () => {
  console.log('[Scheduler] Starting background jobs (PKT timezone)...');

  // ── Vaccination Reminders ─────────────────────────────────────────────────
  // Runs every day at 9:00 AM PKT
  cron.schedule('0 9 * * *', async () => {
    console.log('[Scheduler] Running vaccination reminder job...');
    try {
      const pending = await prisma.reminder.findMany({
        where: {
          status: 'PENDING',
          reminder_type: 'VACCINATION_DUE',
          scheduled_at: { lte: new Date() },
        },
        take: 100,
      });

      for (const reminder of pending) {
        // In production: send via WhatsApp Business API or SMS
        // Currently: log and mark as sent (click-to-chat link generated in frontend)
        console.log(`[Reminder] WhatsApp to ${reminder.phone}: ${reminder.message}`);

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'SENT', sent_at: new Date() },
        });
      }

      console.log(`[Scheduler] Processed ${pending.length} vaccination reminders.`);
    } catch (err) {
      console.error('[Scheduler] Vaccination reminder error:', err.message);
    }
  }, { timezone: 'Asia/Karachi' });

  // ── Follow-up Reminders ───────────────────────────────────────────────────
  // Runs every day at 10:00 AM PKT
  cron.schedule('0 10 * * *', async () => {
    console.log('[Scheduler] Running follow-up reminder job...');
    try {
      const pending = await prisma.reminder.findMany({
        where: {
          status: 'PENDING',
          reminder_type: 'FOLLOW_UP',
          scheduled_at: { lte: new Date() },
        },
        take: 100,
      });

      for (const reminder of pending) {
        console.log(`[Reminder] Follow-up to ${reminder.phone}: ${reminder.message}`);
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'SENT', sent_at: new Date() },
        });
      }

      console.log(`[Scheduler] Processed ${pending.length} follow-up reminders.`);
    } catch (err) {
      console.error('[Scheduler] Follow-up reminder error:', err.message);
    }
  }, { timezone: 'Asia/Karachi' });

  // ── Payment Due Reminders ─────────────────────────────────────────────────
  // Runs every Monday at 11:00 AM PKT
  cron.schedule('0 11 * * 1', async () => {
    console.log('[Scheduler] Running payment due reminder job...');
    try {
      // Find owners with outstanding balance
      const outstanding = await prisma.invoice.findMany({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        include: { owner: { select: { name: true, phone: true, whatsapp_number: true } } },
        take: 200,
      });

      for (const inv of outstanding) {
        const phone = inv.owner?.whatsapp_number || inv.owner?.phone;
        if (!phone) continue;

        // Check if reminder was already sent this week
        const existingReminder = await prisma.reminder.findFirst({
          where: {
            reference_id: inv.id,
            reminder_type: 'PAYMENT_DUE',
            status: 'SENT',
            sent_at: { gte: new Date(Date.now() - 7 * 86400000) },
          },
        });
        if (existingReminder) continue;

        await prisma.reminder.create({
          data: {
            clinic_id: inv.clinic_id,
            reminder_type: 'PAYMENT_DUE',
            reference_id: inv.id,
            phone,
            message: `Dear ${inv.owner.name}, your outstanding balance at our clinic is Rs. ${parseFloat(inv.due_amount).toLocaleString('en-PK')}. Please contact us at your earliest convenience.`,
            scheduled_at: new Date(),
            status: 'SENT',
            sent_at: new Date(),
          },
        });

        console.log(`[Reminder] Payment due for ${inv.owner.name}: Rs. ${inv.due_amount}`);
      }
    } catch (err) {
      console.error('[Scheduler] Payment reminder error:', err.message);
    }
  }, { timezone: 'Asia/Karachi' });

  // ── Expired Medicine Alert ────────────────────────────────────────────────
  // Runs every day at 8:00 AM PKT - flags clinic admins
  cron.schedule('0 8 * * *', async () => {
    try {
      const expiredBatches = await prisma.medicineBatch.findMany({
        where: {
          expiry_date: { lt: new Date() },
          quantity: { gt: 0 },
        },
        include: { medicine: { select: { name: true, clinic_id: true } } },
      });

      if (expiredBatches.length > 0) {
        console.warn(`[Scheduler] ⚠ ${expiredBatches.length} expired medicine batches still have stock. Clinic admins should be notified.`);
      }
    } catch (err) {
      console.error('[Scheduler] Expired medicine check error:', err.message);
    }
  }, { timezone: 'Asia/Karachi' });

  console.log('[Scheduler] All jobs registered successfully. ✓');
};

module.exports = { startScheduledJobs };
