'use strict';

/**
 * WhatsApp Click-to-Chat Link Generator
 * Generates deep links for WhatsApp messaging (Pakistani +92 format)
 * Phase 2 will integrate WhatsApp Business API
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

/**
 * POST /whatsapp/send-link
 * Generates a WhatsApp click-to-chat deep link for a reminder message
 */
router.post('/send-link', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ success: false, message: 'Phone and message are required.' });
  }

  // Clean phone number: remove spaces, dashes, plus sign for wa.me
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  res.json({
    success: true,
    data: {
      whatsapp_link: whatsappLink,
      phone,
      message,
    },
  });
});

module.exports = router;
