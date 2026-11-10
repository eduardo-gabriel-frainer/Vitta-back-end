const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

// Cria a fila de e-mails
const emailQueue = new Queue('email-queue', { connection });

module.exports = { emailQueue, connection };