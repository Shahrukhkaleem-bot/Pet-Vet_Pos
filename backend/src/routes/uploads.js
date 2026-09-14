'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
router.use(authenticate);
router.get('/', (req, res) => res.json({ success: true, message: 'Upload endpoints handled via individual resource routes.' }));
module.exports = router;
