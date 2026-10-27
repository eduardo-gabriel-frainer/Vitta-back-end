import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { dataAtualUtc, idPositivoValido, intervaloValido } from '../validacao/validacoes.js';

const router = Router();

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