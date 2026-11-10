import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { dataAtualUtc, dataEHorario, idPositivoValido } from '../validacao/validacoes.js';
import { agendaContemConsulta, dadosAgendaValidos, filtrosAgendaValidos } from '../validacao/agendas.js';
import autenticar from '../middlewares/autenticar.js';

const router = Router();

async function buscarAgendaSobreposta({ profissional_id, data, horario_inicial, horario_final }, id) {
  return prisma.agendas.findFirst({
    where: {
      profissional_id,
      data,
      horario_inicial: { lt: horario_final },
      horario_final: { gt: horario_inicial },
      ...(id == null ? {} : { id: { not: id } }),
    },
    select: { id: true },
  });
}

async function consultasContinuamDisponiveis({
  profissional_id,
  data,
  inicio_agenda,
  fim_agenda,
  agenda_id,
  nova_agenda,
}) {
  const inicioEm = dataEHorario(data, inicio_agenda);
  const fimEm = dataEHorario(data, fim_agenda);

  const consultas = await prisma.consultas.findMany({
    where: {
      profissional_id,
      status: { not: 'cancelada' },
      inicio_em: { lt: fimEm },
      fim_em: { gt: inicioEm },
    },
  });

  const outrasAgendas = await prisma.agendas.findMany({
    where: {
      profissional_id,
      data,
      ...(agenda_id == null ? {} : { id: { not: agenda_id } }),
    },
  });
  const agendasDisponiveis = [
    ...outrasAgendas,
    ...(nova_agenda ? [nova_agenda] : []),
  ];

  return consultas.every((consulta) =>
    agendasDisponiveis.some((agenda) =>
      agendaContemConsulta(agenda, consulta.inicio_em, consulta.fim_em)));
}

router.use(autenticar);

router.get('/', async (req, res) => {
  const filtros = filtrosAgendaValidos(req.query);
  if (filtros.erro) return res.status(400).json({ erro: filtros.erro });

  const agendas = await prisma.agendas.findMany({
    where: filtros.where,
    orderBy: [{ data: 'asc' }, { horario_inicial: 'asc' }],
  });
  res.json(agendas);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) return res.status(400).json({ erro: 'ID inválido' });

  const agenda = await prisma.agendas.findFirst({ where: { id } });
  if (!agenda) return res.status(404).json({ erro: 'Agenda não encontrada' });

  res.json(agenda);
});

router.post('/', async (req, res) => {
  const dados = dadosAgendaValidos(req.body);
  const criadoPor = req.usuario.id;
  if (!dados) {
    return res.status(400).json({
      erro: 'Informe profissional_id, data e horários válidos',
    });
  }

  const profissional = await prisma.profissionais.findUnique({
    where: { id: dados.profissional_id },
    select: { id: true },
  });
  if (!profissional) return res.status(400).json({ erro: 'O profissional informado não existe' });

  if (await buscarAgendaSobreposta(dados)) {
    return res.status(409).json({ erro: 'Já existe uma agenda sobreposta para esse profissional' });
  }

  const disponivel = await consultasContinuamDisponiveis({
    ...dados,
    inicio_agenda: dados.horario_inicial,
    fim_agenda: dados.horario_final,
    nova_agenda: { ...dados },
  });
  if (!disponivel) {
    return res.status(409).json({ erro: 'A agenda deixaria uma consulta fora da disponibilidade' });
  }

  const agenda = await prisma.agendas.create({
    data: {
      ...dados,
      criado_por: criadoPor,
      criado_em: dataAtualUtc(),
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

  const existente = await prisma.agendas.findFirst({ where: { id } });
  if (!existente) return res.status(404).json({ erro: 'Agenda não encontrada' });

  const profissional = await prisma.profissionais.findUnique({
    where: { id: dados.profissional_id },
    select: { id: true },
  });
  if (!profissional) return res.status(400).json({ erro: 'O profissional informado não existe' });

  if (await buscarAgendaSobreposta(dados, id)) {
    return res.status(409).json({ erro: 'Já existe uma agenda sobreposta para esse profissional' });
  }

  const novaAgenda = { id, ...dados };
  const mesmaDisponibilidade = existente.profissional_id === dados.profissional_id
    && existente.data.getTime() === dados.data.getTime();
  const disponibilidadeAntigaMantida = await consultasContinuamDisponiveis({
    profissional_id: existente.profissional_id,
    data: existente.data,
    inicio_agenda: existente.horario_inicial,
    fim_agenda: existente.horario_final,
    agenda_id: id,
    nova_agenda: mesmaDisponibilidade ? novaAgenda : undefined,
  });
  if (!disponibilidadeAntigaMantida) {
    return res.status(409).json({ erro: 'A alteração deixaria uma consulta fora da disponibilidade' });
  }

  const disponibilidadeNovaMantida = await consultasContinuamDisponiveis({
    profissional_id: dados.profissional_id,
    data: dados.data,
    inicio_agenda: dados.horario_inicial,
    fim_agenda: dados.horario_final,
    agenda_id: id,
    nova_agenda: novaAgenda,
  });
  if (!disponibilidadeNovaMantida) {
    return res.status(409).json({ erro: 'A alteração deixaria uma consulta fora da disponibilidade' });
  }

  await prisma.agendas.updateMany({ where: { id }, data: dados });
  const atualizada = await prisma.agendas.findFirst({ where: { id } });
  res.json(atualizada);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) return res.status(400).json({ erro: 'ID inválido' });

  const agenda = await prisma.agendas.findFirst({ where: { id } });
  if (!agenda) return res.status(404).json({ erro: 'Agenda não encontrada' });

  const consultasSeguemDisponiveis = await consultasContinuamDisponiveis({
    profissional_id: agenda.profissional_id,
    data: agenda.data,
    inicio_agenda: agenda.horario_inicial,
    fim_agenda: agenda.horario_final,
    agenda_id: id,
  });
  if (!consultasSeguemDisponiveis) {
    return res.status(409).json({ erro: 'Não é possível excluir: há consultas sem outra disponibilidade' });
  }

  await prisma.agendas.deleteMany({ where: { id } });
  res.status(204).send();
});

export default router;
