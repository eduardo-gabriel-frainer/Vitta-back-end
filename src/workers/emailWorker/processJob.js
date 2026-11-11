import { enviarEmailConsulta } from '../../services/emailService.js';
import { LOCK_HEARTBEAT_MS, MAX_ATTEMPTS, lockReleased } from './constants.js';
import { updateClaimedJob } from './updateClaimedJob.js';

export async function processJob(job) {
  const heartbeat = setInterval(async () => {
    try {
      await updateClaimedJob(job, { bloqueado_em: new Date() });
    } catch (error) {
      console.error(`Erro ao renovar o bloqueio do e-mail ${job.id}:`, error);
    }
  }, LOCK_HEARTBEAT_MS);

  try {
    console.log(`Processando e-mail ${job.id} para ${job.destinatario}`);
    await enviarEmailConsulta(job.destinatario, job.dados);
    const result = await updateClaimedJob(job, {
      status: 'enviado',
      enviado_em: new Date(),
      ...lockReleased,
      ultimo_erro: null,
    });

    if (result.count === 0) {
      console.error(`O bloqueio do e-mail ${job.id} expirou antes de registrar o envio.`);
    } else {
      console.log(`E-mail ${job.id} enviado com sucesso.`);
    }
  } catch (error) {
    const excedeuTentativas = job.tentativas >= MAX_ATTEMPTS;
    const espera = Math.min(1000 * (2 ** (job.tentativas - 1)), 60 * 60 * 1000);

    await updateClaimedJob(job, {
      status: excedeuTentativas ? 'falhou' : 'pendente',
      disponivel_em: excedeuTentativas ? new Date() : new Date(Date.now() + espera),
      ...lockReleased,
      ultimo_erro: String(error?.message || error).slice(0, 2000),
    });
    console.error(`Falha ao enviar o e-mail ${job.id} (tentativa ${job.tentativas}/${MAX_ATTEMPTS}):`, error);
  } finally {
    clearInterval(heartbeat);
  }
}
