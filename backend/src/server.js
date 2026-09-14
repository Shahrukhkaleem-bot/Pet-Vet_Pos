'use strict';

require('dotenv').config();
const app = require('./app');
const { startScheduledJobs } = require('./jobs/scheduler');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🐾 VetPet PK API Server`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Time (PKT):  ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`);

  // Start background scheduled jobs (vaccination reminders, follow-up alerts)
  if (process.env.NODE_ENV !== 'test') {
    startScheduledJobs();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = server;
