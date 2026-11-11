import prisma from '../../lib/prisma.js';
import { LOCK_TIMEOUT_MS, MAX_ATTEMPTS, lockReleased } from './constants.js';

export async function reclaimExpiredJobs() {
  const expiredBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);
  const expiredJob = {
    status: 'processando',
    bloqueado_em: { lt: expiredBefore },
  };

  await prisma.email_jobs.updateMany({
    where: { ...expiredJob, tentativas: { gte: MAX_ATTEMPTS } },
    data: {
      status: 'falhou',
      ...lockReleased,
      ultimo_erro: 'Tempo limite do processamento excedido',
    },
  });
  await prisma.email_jobs.updateMany({
    where: { ...expiredJob, tentativas: { lt: MAX_ATTEMPTS } },
    data: {
      status: 'pendente',
      disponivel_em: new Date(),
      ...lockReleased,
      ultimo_erro: 'Processamento interrompido; o job será tentado novamente',
    },
  });
}
