import prisma from '../../lib/prisma.js';

export function updateClaimedJob(job, data) {
  return prisma.email_jobs.updateMany({
    where: {
      id: job.id,
      status: 'processando',
      token_bloqueio: job.token_bloqueio,
    },
    data,
  });
}
