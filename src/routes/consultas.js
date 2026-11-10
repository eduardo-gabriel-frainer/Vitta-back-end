import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { agendaContemConsulta } from '../validacao/agendas.js';
import { dataAtualUtc, idPositivoValido, intervaloValido } from '../validacao/validacoes.js';
import autenticar from '../middlewares/autenticar.js';
import { emailQueue } from '../queues/emailQueue.js'; // 1. Importe a fila aqui

const router = Router();

async function verificarConsultaDisponivel({
  profissional_id,
  inicio_em,
  fim_em,
  excluir_consulta_id,
}) {
  const data = new Date(Date.UTC(
    inicio_em.getUTCFullYear(),
    inicio_em.getUTCMonth(),
    inicio_em.getUTCDate(),
  ));
  const diaSeguinte = new Date(data);
  diaSeguinte.setUTCDate(diaSeguinte.getUTCDate() + 1);

  if (fim_em >= diaSeguinte) return 'fora_da_agenda';

  const agendas = await prisma.agendas.findMany({
    where: { profissional_id, data },
  });
  if (!agendas.some((agenda) => agendaContemConsulta(agenda, inicio_em, fim_em))) {
    return 'fora_da_agenda';
  }

  const conflito = await prisma.consultas.findFirst({
    where: {
      profissional_id,
      status: { not: 'cancelada' },
      ...(excluir_consulta_id == null ? {} : { id: { not: excluir_consulta_id } }),
      inicio_em: { lt: fim_em },
      fim_em: { gt: inicio_em },
    },
    select: { id: true },
  });

  return conflito ? 'consulta_conflitante' : null;
}

function respostaConsulta(consulta) {
  return {
    id: consulta.id,
    paciente_id: consulta.paciente_id,
    profissional_id: consulta.profissional_id,
    especialidade_id: consulta.especialidade_id,
    inicio_em: consulta.inicio_em,
    fim_em: consulta.fim_em,
    status: consulta.status,
    cancelado_em: consulta.cancelado_em,
    criado_em: consulta.criado_em,
  };
}

router.get('/', async (req, res) => {
  const consultas = await prisma.consultas.findMany({
    orderBy: { id: 'asc' },
  });
  res.json(consultas.map(respostaConsulta));
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const consulta = await prisma.consultas.findFirst({ where: { id } });
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

  res.json(respostaConsulta(consulta));
});

router.use(autenticar);

router.post('/', async (req, res) => {
  try {
    const { paciente_id, profissional_id, especialidade_id, inicio_em, fim_em, pacienteEmail } = req.body || {};

    const ids = [paciente_id, profissional_id, especialidade_id];
    if (ids.some((id) => !idPositivoValido(id))) {
      return res.status(400).json({ erro: 'Informe os IDs de paciente, profissional e especialidade' });
    }

    const intervalo = intervaloValido(inicio_em, fim_em);
    if (!intervalo) {
      return res.status(400).json({ erro: 'Informe datas válidas e um fim posterior ao início' });
    }

    const erroDisponibilidade = await verificarConsultaDisponivel({
      profissional_id,
      ...intervalo,
    });
    if (erroDisponibilidade === 'fora_da_agenda') {
      return res.status(409).json({ erro: 'O horário não está disponível na agenda do profissional' });
    }
    if (erroDisponibilidade === 'consulta_conflitante') {
      return res.status(409).json({ erro: 'Já existe uma consulta nesse horário para o profissional' });
    }

    // Cria a consulta no banco usando o seu schema original
    const consulta = await prisma.consultas.create({
      data: {
        paciente_id,
        profissional_id,
        especialidade_id,
        inicio_em: intervalo.inicioEm,
        fim_em: intervalo.fimEm,
        status: 'agendada',
        criado_em: dataAtualUtc(),
      },
      include: {
        profissional: true,    // Traz os dados do profissional para o e-mail
        especialidade: true,   // Traz os dados da especialidade para o e-mail
      }
    });

    // 2. Adiciona o envio do e-mail na fila (se o e-mail do paciente foi informado)
    if (pacienteEmail) {
      await emailQueue.add('enviar-confirmacao', {
        destinatario: pacienteEmail,
        dadosConsulta: {
          medico: consulta.profissional?.nome || 'Profissional',
          especialidade: consulta.especialidade?.nome || 'Geral',
          data: new Date(consulta.inicio_em).toLocaleDateString('pt-BR'),
          horario: new Date(consulta.inicio_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      });
    }

    return res.location(`/consultas/${consulta.id}`).status(201).json(respostaConsulta(consulta));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: 'Erro interno ao registrar a consulta.' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const { inicio_em, fim_em, status } = req.body || {};

  const intervalo = intervaloValido(inicio_em, fim_em);
  if (!intervalo) {
    return res.status(400).json({ erro: 'Informe datas válidas e um fim posterior ao início' });
  }
  if (status != null && !['agendada', 'cancelada'].includes(status)) {
    return res.status(400).json({ erro: 'Status deve ser agendada ou cancelada' });
  }

  const consulta = await prisma.consultas.findFirst({ where: { id } });
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

  if ((status ?? consulta.status) !== 'cancelada') {
    const erroDisponibilidade = await verificarConsultaDisponivel({
      profissional_id: consulta.profissional_id,
      ...intervalo,
      excluir_consulta_id: id,
    });
    if (erroDisponibilidade === 'fora_da_agenda') {
      return res.status(409).json({ erro: 'O horário não está disponível na agenda do profissional' });
    }
    if (erroDisponibilidade === 'consulta_conflitante') {
      return res.status(409).json({ erro: 'Já existe uma consulta nesse horário para o profissional' });
    }
  }

  const data = {
    inicio_em: intervalo.inicioEm,
    fim_em: intervalo.fimEm,
  };

  if (status === 'cancelada') {
    data.status = 'cancelada';
    data.cancelado_em = dataAtualUtc();
  } else if (status === 'agendada') {
    data.status = 'agendada';
    data.cancelado_em = null;
  }

  await prisma.consultas.updateMany({ where: { id }, data });

  const atualizada = await prisma.consultas.findFirst({ where: { id } });
  res.json(respostaConsulta(atualizada));
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const consulta = await prisma.consultas.findFirst({ where: { id } });
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

  await prisma.consultas.deleteMany({ where: { id } });

  res.status(204).send();
});

export default router;