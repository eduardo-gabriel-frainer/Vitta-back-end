import prisma from '../lib/prisma.js';

export async function enfileirarEmail(destinatario, dadosConsulta, client = prisma) {
  return client.email_jobs.create({
    data: {
      destinatario,
      dados: dadosConsulta,
    },
  });
}
