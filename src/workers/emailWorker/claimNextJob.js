import { randomUUID } from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { MAX_ATTEMPTS, RECLAIM_INTERVAL_MS } from './constants.js';
import { reclaimExpiredJobs } from './reclaimExpiredJobs.js';

let lastReclaimAt = 0;

export async function claimNextJob() {
  if (Date.now() - lastReclaimAt >= RECLAIM_INTERVAL_MS) {
    await reclaimExpiredJobs();
    lastReclaimAt = Date.now();
  }

  const now = new Date();
  const candidate = await prisma.email_jobs.findFirst({
    where: {
      status: 'pendente',
      disponivel_em: { lte: now },
      tentativas: { lt: MAX_ATTEMPTS },
    },
    orderBy: [{ disponivel_em: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });

  if (!candidate) return null;

  const claimed = await prisma.email_jobs.updateMany({
    where: {
      id: candidate.id,
      status: 'pendente',
      disponivel_em: { lte: now },
      tentativas: { lt: MAX_ATTEMPTS },
    },
    data: {
      status: 'processando',
      bloqueado_em: now,
      token_bloqueio: randomUUID(),
      tentativas: { increment: 1 },
    },
  });

  if (claimed.count === 0) return null;

  return prisma.email_jobs.findUnique({
    where: { id: candidate.id },
  });
}
