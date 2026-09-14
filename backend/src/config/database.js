'use strict';

const { PrismaClient } = require('@prisma/client');

// Single Prisma client instance (singleton pattern)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
