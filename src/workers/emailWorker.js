const { Worker } = require('bullmq');
const { connection } = require('../queues/emailQueue');
const { enviarEmailConsulta } = require('../services/emailService');

const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { destinatario, dadosConsulta } = job.data;
    console.log(`🔄 Processando envio de e-mail para: ${destinatario} (Job ID: ${job.id})`);
    
    // Chama o serviço do Nodemailer
    await enviarEmailConsulta(destinatario, dadosConsulta);
  },
  { connection }
);

emailWorker.on('completed', (job) => {
  console.log(`✅ E-mail do Job ${job.id} processado com sucesso!`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Falha no envio do e-mail do Job ${job.id}:`, err);
});