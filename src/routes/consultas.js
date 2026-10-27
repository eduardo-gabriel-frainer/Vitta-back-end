import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { agendaContemConsulta } from '../validacao/agendas.js';
import { dataAtualUtc, idPositivoValido, intervaloValido } from '../validacao/validacoes.js';

const router = Router();

async function verificarConsultaDisponivel({
  profissionalId,
  inicioEm,
  fimEm,
  excluirConsultaId,
}) {
  const data = new Date(Date.UTC(
    inicioEm.getUTCFullYear(),
    inicioEm.getUTCMonth(),
    inicioEm.getUTCDate(),
  ));
  const diaSeguinte = new Date(data);
  diaSeguinte.setUTCDate(diaSeguinte.getUTCDate() + 1);

  if (fimEm >= diaSeguinte) return 'fora_da_agenda';

  const agendas = await prisma.agenda.findMany({
    where: { profissionalId, data },
  });
  if (!agendas.some((agenda) => agendaContemConsulta(agenda, inicioEm, fimEm))) {
    return 'fora_da_agenda';
  }

  const conflito = await prisma.consulta.findFirst({
    where: {
      profissionalId,
      status: { not: 'cancelada' },
      ...(excluirConsultaId == null ? {} : { id: { not: excluirConsultaId } }),
      inicioEm: { lt: fimEm },
      fimEm: { gt: inicioEm },
    },
    select: { id: true },
  });

  return conflito ? 'consulta_conflitante' : null;
}

function respostaConsulta(consulta) {
  return {
    id: consulta.id,
    paciente_id: consulta.pacienteId,
    profissional_id: consulta.profissionalId,
    especialidade_id: consulta.especialidadeId,
    inicio_em: consulta.inicioEm,
    fim_em: consulta.fimEm,
    status: consulta.status,
    cancelado_em: consulta.canceladoEm,
    criado_em: consulta.criadoEm,
  };
}

router.get('/', async (req, res) => {
  const consultas = await prisma.consulta.findMany({
    orderBy: { id: 'asc' },
  });
  res.json(consultas.map(respostaConsulta));
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const consulta = await prisma.consulta.findFirst({ where: { id } });
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

  res.json(respostaConsulta(consulta));
});

router.post('/', async (req, res) => {
  const { paciente_id, profissional_id, especialidade_id, inicio_em, fim_em } = req.body || {};

  const ids = [paciente_id, profissional_id, especialidade_id];
  if (ids.some((id) => !idPositivoValido(id))) {
    return res.status(400).json({ erro: 'Informe os IDs de paciente, profissional e especialidade' });
  }

  const intervalo = intervaloValido(inicio_em, fim_em);
  if (!intervalo) {
    return res.status(400).json({ erro: 'Informe datas válidas e um fim posterior ao início' });
  }

  const erroDisponibilidade = await verificarConsultaDisponivel({
    profissionalId: profissional_id,
    ...intervalo,
  });
  if (erroDisponibilidade === 'fora_da_agenda') {
    return res.status(409).json({ erro: 'O horário não está disponível na agenda do profissional' });
  }
  if (erroDisponibilidade === 'consulta_conflitante') {
    return res.status(409).json({ erro: 'Já existe uma consulta nesse horário para o profissional' });
  }

  const consulta = await prisma.consulta.create({
    data: {
      pacienteId: paciente_id,
      profissionalId: profissional_id,
      especialidadeId: especialidade_id,
      ...intervalo,
      status: 'agendada',
      criadoEm: dataAtualUtc(),
    },
  });

  res.location(`/consultas/${consulta.id}`).status(201).json(respostaConsulta(consulta));
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

  const consulta = await prisma.consulta.findFirst({ where: { id } });
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

  if ((status ?? consulta.status) !== 'cancelada') {
    const erroDisponibilidade = await verificarConsultaDisponivel({
      profissionalId: consulta.profissionalId,
      ...intervalo,
      excluirConsultaId: id,
    });
    if (erroDisponibilidade === 'fora_da_agenda') {
      return res.status(409).json({ erro: 'O horário não está disponível na agenda do profissional' });
    }
    if (erroDisponibilidade === 'consulta_conflitante') {
      return res.status(409).json({ erro: 'Já existe uma consulta nesse horário para o profissional' });
    }
  }

  const data = { ...intervalo };

  if (status === 'cancelada') {
    data.status = 'cancelada';
    data.canceladoEm = dataAtualUtc();
  } else if (status === 'agendada') {
    data.status = 'agendada';
    data.canceladoEm = null;
  }

  await prisma.consulta.updateMany({ where: { id }, data });

  const atualizada = await prisma.consulta.findFirst({ where: { id } });
  res.json(respostaConsulta(atualizada));
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const consulta = await prisma.consulta.findFirst({ where: { id } });
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

  await prisma.consulta.deleteMany({ where: { id } });

  res.status(204).send();
});

export default router;