'use strict';

/**
 * PDF Generation Service
 * Generates printable PDF prescriptions and invoices using PDFKit
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './storage/uploads';

class PdfService {
  /**
   * Generate a professional prescription PDF
   * Returns the saved file path
   */
  static async generatePrescriptionPdf(prescription, consultation, clinic) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `rx-${uuidv4()}.pdf`;
        const outputPath = path.join(UPLOAD_DIR, 'prescriptions', filename);
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        const { pet, doctor } = consultation;
        const owner = pet?.owner;

        // ── Header ─────────────────────────────────────────────────────────
        doc.fontSize(22).fillColor('#0D9488').text(clinic?.name || 'Veterinary Clinic', { align: 'center' });
        doc.fontSize(10).fillColor('#64748B')
          .text(`${clinic?.address || ''} | ${clinic?.city || ''} | Tel: ${clinic?.phone || ''}`, { align: 'center' });

        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke();
        doc.moveDown(0.5);

        // ── Prescription Title ─────────────────────────────────────────────
        doc.fontSize(16).fillColor('#0F172A').text('PRESCRIPTION', { align: 'center' });
        doc.fontSize(9).fillColor('#64748B')
          .text(`Date: ${new Date(consultation.consultation_date).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}`, { align: 'right' });

        doc.moveDown(0.5);

        // ── Patient & Doctor Info ─────────────────────────────────────────
        const infoY = doc.y;
        doc.fontSize(10).fillColor('#0F172A');

        doc.text('PATIENT INFORMATION', 50, infoY, { underline: true });
        doc.fontSize(9).fillColor('#334155')
          .text(`Pet Name: ${pet?.name || 'N/A'}`, 50, doc.y + 3)
          .text(`Species: ${pet?.species?.name || 'N/A'}`)
          .text(`Owner: ${owner?.name || 'N/A'}`)
          .text(`Contact: ${owner?.phone || 'N/A'}`);

        doc.fontSize(10).fillColor('#0F172A').text('PRESCRIBING VETERINARIAN', 300, infoY, { underline: true });
        doc.fontSize(9).fillColor('#334155')
          .text(`Dr. ${doctor?.name || 'N/A'}`, 300, infoY + 13)
          .text(`Specialization: ${doctor?.specialization || 'Veterinarian'}`, 300)
          .text(`License: ${doctor?.license_number || 'N/A'}`, 300);

        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke();
        doc.moveDown(0.5);

        // ── Diagnosis ─────────────────────────────────────────────────────
        doc.fontSize(10).fillColor('#0D9488').text('DIAGNOSIS');
        doc.fontSize(9).fillColor('#334155').text(consultation.diagnosis || 'N/A');
        doc.moveDown(0.5);

        // ── Medicines Table ───────────────────────────────────────────────
        doc.fontSize(10).fillColor('#0D9488').text('PRESCRIBED MEDICINES');
        doc.moveDown(0.3);

        const tableTop = doc.y;
        const colWidths = [180, 70, 100, 60, 90];
        const headers = ['Medicine', 'Dosage', 'Frequency', 'Days', 'Instructions'];
        const startX = 50;
        let currentX = startX;

        // Table header
        doc.rect(startX, tableTop, 495, 18).fillColor('#F1F5F9').fill();
        doc.fontSize(8).fillColor('#0F172A');
        headers.forEach((h, i) => {
          doc.text(h, currentX + 4, tableTop + 4, { width: colWidths[i] - 4, ellipsis: true });
          currentX += colWidths[i];
        });

        // Table rows
        let rowY = tableTop + 18;
        prescription.items.forEach((item, idx) => {
          if (idx % 2 === 0) {
            doc.rect(startX, rowY, 495, 20).fillColor('#FAFAFA').fill();
          }
          currentX = startX;
          doc.fontSize(8).fillColor('#334155');
          const rowData = [
            item.medicine?.name || 'N/A',
            item.dosage,
            item.frequency,
            `${item.duration_days} days`,
            item.instructions || '-',
          ];
          rowData.forEach((val, i) => {
            doc.text(val, currentX + 4, rowY + 4, { width: colWidths[i] - 4, ellipsis: true });
            currentX += colWidths[i];
          });
          rowY += 20;
        });

        doc.y = rowY + 8;

        // ── Additional Instructions ───────────────────────────────────────
        if (prescription.instructions) {
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#0D9488').text('ADDITIONAL INSTRUCTIONS');
          doc.fontSize(9).fillColor('#334155').text(prescription.instructions);
        }

        // ── Follow-up ────────────────────────────────────────────────────
        if (consultation.follow_up_date) {
          doc.moveDown(0.5);
          doc.fontSize(9).fillColor('#D97706')
            .text(`⚠ Follow-up scheduled: ${new Date(consultation.follow_up_date).toLocaleDateString('en-PK')}`);
        }

        // ── Footer ────────────────────────────────────────────────────────
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke();
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor('#94A3B8')
          .text('This prescription is valid for 30 days from the date of issue.', { align: 'center' })
          .text(`Generated by VetPet PK — ${clinic?.name || ''}`, { align: 'center' });

        // Doctor signature line
        doc.moveDown(2);
        doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#334155').stroke();
        doc.fontSize(8).fillColor('#334155').text(`Dr. ${doctor?.name || ''} — Signature`, 350, doc.y + 2);

        doc.end();

        writeStream.on('finish', () => resolve(`/uploads/prescriptions/${filename}`));
        writeStream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate a professional PKR invoice PDF
   */
  static async generateInvoicePdf(invoice, clinic) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `inv-${uuidv4()}.pdf`;
        const outputPath = path.join(UPLOAD_DIR, 'prescriptions', filename); // reuse folder
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        const { pet, owner, items, payments } = invoice;

        // Header
        doc.fontSize(22).fillColor('#0D9488').text(clinic?.name || 'Veterinary Clinic', { align: 'center' });
        doc.fontSize(10).fillColor('#64748B')
          .text(`${clinic?.address || ''} | ${clinic?.city || ''} | Tel: ${clinic?.phone || ''}`, { align: 'center' });

        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

        // Invoice header
        doc.moveDown(0.5);
        doc.fontSize(16).fillColor('#0F172A').text('INVOICE', { align: 'center' });
        doc.fontSize(10).fillColor('#64748B').text(`Invoice #: ${invoice.invoice_number}`, 350, doc.y + 2);
        doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}`, 350);

        // Patient info
        doc.fontSize(9).fillColor('#334155');
        doc.text(`Patient: ${pet?.name || 'N/A'} (${pet?.species?.name || ''})`, 50, doc.y - 30);
        doc.text(`Owner: ${owner?.name || 'N/A'}`, 50);
        doc.text(`Phone: ${owner?.phone || 'N/A'}`, 50);

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

        // Items table
        doc.moveDown(0.3);
        const colW = [260, 60, 90, 90];
        const headers = ['Description', 'Qty', 'Unit Price (Rs.)', 'Total (Rs.)'];
        const sx = 50;
        let cx = sx;
        const tY = doc.y;

        doc.rect(sx, tY, 495, 18).fillColor('#F1F5F9').fill();
        doc.fontSize(8).fillColor('#0F172A');
        headers.forEach((h, i) => {
          doc.text(h, cx + 4, tY + 4, { width: colW[i] - 4 });
          cx += colW[i];
        });

        let rY = tY + 18;
        items.forEach((item, idx) => {
          if (idx % 2 === 0) doc.rect(sx, rY, 495, 20).fillColor('#FAFAFA').fill();
          cx = sx;
          doc.fontSize(8).fillColor('#334155');
          [
            item.description,
            item.quantity.toString(),
            `Rs. ${parseFloat(item.unit_price).toLocaleString('en-PK')}`,
            `Rs. ${parseFloat(item.total_price).toLocaleString('en-PK')}`,
          ].forEach((v, i) => {
            doc.text(v, cx + 4, rY + 4, { width: colW[i] - 4, ellipsis: true });
            cx += colW[i];
          });
          rY += 20;
        });

        doc.y = rY + 10;

        // Totals
        doc.moveTo(350, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor('#334155');
        doc.text(`Subtotal:`, 350).text(`Rs. ${parseFloat(invoice.subtotal).toLocaleString('en-PK')}`, 450);
        if (parseFloat(invoice.discount) > 0) {
          doc.text(`Discount:`, 350).text(`- Rs. ${parseFloat(invoice.discount).toLocaleString('en-PK')}`, 450);
        }
        doc.fontSize(11).fillColor('#0F172A').text(`TOTAL:`, 350).text(`Rs. ${parseFloat(invoice.total_amount).toLocaleString('en-PK')}`, 450);
        doc.fontSize(9).fillColor('#16A34A').text(`Paid:`, 350).text(`Rs. ${parseFloat(invoice.paid_amount).toLocaleString('en-PK')}`, 450);

        if (parseFloat(invoice.due_amount) > 0) {
          doc.fillColor('#E11D48').text(`Balance Due:`, 350).text(`Rs. ${parseFloat(invoice.due_amount).toLocaleString('en-PK')}`, 450);
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).fillColor('#94A3B8')
          .text('Thank you for visiting! We care for your pets.', { align: 'center' })
          .text(`Generated by VetPet PK — ${clinic?.name || ''}`, { align: 'center' });

        doc.end();
        writeStream.on('finish', () => resolve(`/uploads/prescriptions/${filename}`));
        writeStream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PdfService;
