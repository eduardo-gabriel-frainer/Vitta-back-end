import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { dataAtualUtc, dataEHorario, idPositivoValido } from '../validacao/validacoes.js';
import { agendaContemConsulta, dadosAgendaValidos, filtrosAgendaValidos } from '../validacao/agendas.js';

const router = Router();

async function buscarAgendaSobreposta({ profissionalId, data, horarioInicial, horarioFinal }, id) {
  return prisma.agenda.findFirst({
    where: {
      profissionalId,
      data,
      horarioInicial: { lt: horarioFinal },
      horarioFinal: { gt: horarioInicial },
      ...(id == null ? {} : { id: { not: id } }),
    },
    select: { id: true },
  });
}

async function consultasContinuamDisponiveis({
  profissionalId,
  data,
  inicioAgenda,
  fimAgenda,
  agendaId,
  novaAgenda,
}) {
  const inicioEm = dataEHorario(data, inicioAgenda);
  const fimEm = dataEHorario(data, fimAgenda);

  const consultas = await prisma.consulta.findMany({
    where: {
      profissionalId,
      status: { not: 'cancelada' },
      inicioEm: { lt: fimEm },
      fimEm: { gt: inicioEm },
    },
  });

  const outrasAgendas = await prisma.agenda.findMany({
    where: {
      profissionalId,
      data,
      ...(agendaId == null ? {} : { id: { not: agendaId } }),
    },
  });
  const agendasDisponiveis = [
    ...outrasAgendas,
    ...(novaAgenda ? [novaAgenda] : []),
  ];

  return consultas.every((consulta) =>
    agendasDisponiveis.some((agenda) =>
      agendaContemConsulta(agenda, consulta.inicioEm, consulta.fimEm)));
}

router.get('/', async (req, res) => {
  const filtros = filtrosAgendaValidos(req.query);
  if (filtros.erro) return res.status(400).json({ erro: filtros.erro });

  const agendas = await prisma.agenda.findMany({
    where: filtros.where,
    orderBy: [{ data: 'asc' }, { horarioInicial: 'asc' }],
  });
  res.json(agendas);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) return res.status(400).json({ erro: 'ID inválido' });

  const agenda = await prisma.agenda.findFirst({ where: { id } });
  if (!agenda) return res.status(404).json({ erro: 'Agenda não encontrada' });

  res.json(agenda);
});

router.post('/', async (req, res) => {
  const dados = dadosAgendaValidos(req.body);
  const criadoPor = req.body?.criado_por;
  if (!dados || !idPositivoValido(criadoPor)) {
    return res.status(400).json({
      erro: 'Informe profissional_id, data, horários válidos e criado_por',
    });
  }

  const [profissional, criador] = await Promise.all([
    prisma.profissional.findUnique({
      where: { id: dados.profissionalId },
      select: { id: true },
    }),
    prisma.usuario.findUnique({
      where: { id: criadoPor },
      select: { id: true },
    }),
  ]);
  if (!profissional) return res.status(400).json({ erro: 'O profissional informado não existe' });
  if (!criador) return res.status(400).json({ erro: 'O criador informado não existe' });

  if (await buscarAgendaSobreposta(dados)) {
    return res.status(409).json({ erro: 'Já existe uma agenda sobreposta para esse profissional' });
  }

  const disponivel = await consultasContinuamDisponiveis({
    ...dados,
    inicioAgenda: dados.horarioInicial,
    fimAgenda: dados.horarioFinal,
    novaAgenda: { ...dados },
  });
  if (!disponivel) {
    return res.status(409).json({ erro: 'A agenda deixaria uma consulta fora da disponibilidade' });
  }

  const agenda = await prisma.agenda.create({
    data: {
      ...dados,
      criadoPor,
      criadoEm: dataAtualUtc(),
    },
  });

  res.location(`/agendas/${agenda.id}`).status(201).json(agenda);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) return res.status(400).json({ erro: 'ID inválido' });

  const dados = dadosAgendaValidos(req.body);
  if (!dados) {
    return res.status(400).json({
      erro: 'Informe profissional_id, data e horários válidos',
    });
  }

  const existente = await prisma.agenda.findFirst({ where: { id } });
  if (!existente) return res.status(404).json({ erro: 'Agenda não encontrada' });

  const profissional = await prisma.profissional.findUnique({
    where: { id: dados.profissionalId },
    select: { id: true },
  });
  if (!profissional) return res.status(400).json({ erro: 'O profissional informado não existe' });

  if (await buscarAgendaSobreposta(dados, id)) {
    return res.status(409).json({ erro: 'Já existe uma agenda sobreposta para esse profissional' });
  }

  const novaAgenda = { id, ...dados };
  const mesmaDisponibilidade = existente.profissionalId === dados.profissionalId
    && existente.data.getTime() === dados.data.getTime();
  const disponibilidadeAntigaMantida = await consultasContinuamDisponiveis({
    profissionalId: existente.profissionalId,
    data: existente.data,
    inicioAgenda: existente.horarioInicial,
    fimAgenda: existente.horarioFinal,
    agendaId: id,
    novaAgenda: mesmaDisponibilidade ? novaAgenda : undefined,
  });
  if (!disponibilidadeAntigaMantida) {
    return res.status(409).json({ erro: 'A alteração deixaria uma consulta fora da disponibilidade' });
  }

  const disponibilidadeNovaMantida = await consultasContinuamDisponiveis({
    profissionalId: dados.profissionalId,
    data: dados.data,
    inicioAgenda: dados.horarioInicial,
    fimAgenda: dados.horarioFinal,
    agendaId: id,
    novaAgenda,
  });
  if (!disponibilidadeNovaMantida) {
    return res.status(409).json({ erro: 'A alteração deixaria uma consulta fora da disponibilidade' });
  }

  await prisma.agenda.updateMany({ where: { id }, data: dados });
  const atualizada = await prisma.agenda.findFirst({ where: { id } });
  res.json(atualizada);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) return res.status(400).json({ erro: 'ID inválido' });

  const agenda = await prisma.agenda.findFirst({ where: { id } });
  if (!agenda) return res.status(404).json({ erro: 'Agenda não encontrada' });

  const consultasSeguemDisponiveis = await consultasContinuamDisponiveis({
    profissionalId: agenda.profissionalId,
    data: agenda.data,
    inicioAgenda: agenda.horarioInicial,
    fimAgenda: agenda.horarioFinal,
    agendaId: id,
  });
  if (!consultasSeguemDisponiveis) {
    return res.status(409).json({ erro: 'Não é possível excluir: há consultas sem outra disponibilidade' });
  }

  await prisma.agenda.deleteMany({ where: { id } });
  res.status(204).send();
});

export default router;
