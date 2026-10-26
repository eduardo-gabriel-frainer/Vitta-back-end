import { Router } from 'express';
import prisma from '../lib/prisma.js';

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
    observacoes: consulta.observacoes,
    motivo_cancelamento: consulta.motivoCancelamento,
    cancelado_em: consulta.canceladoEm,
    cancelador_por: consulta.canceladorPor,
    criado_por: consulta.criadoPor,
    criado_em: consulta.criadoEm,
    atualizado_em: consulta.atualizadoEm,
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
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const consulta = await prisma.consulta.findFirst({ where: { id } });
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

  res.json(respostaConsulta(consulta));
});

router.post('/', async (req, res) => {
  const {
    paciente_id,
    profissional_id,
    especialidade_id,
    inicio_em,
    fim_em,
    criado_por,
    observacoes,
  } = req.body || {};

  const ids = [paciente_id, profissional_id, especialidade_id, criado_por];
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ erro: 'Informe os IDs de paciente, profissional, especialidade e criador' });
  }

  const inicioEm = new Date(`${inicio_em}`.replace(' ', 'T') + 'Z');
  const fimEm = new Date(`${fim_em}`.replace(' ', 'T') + 'Z');
  if (Number.isNaN(inicioEm.getTime()) || Number.isNaN(fimEm.getTime()) || fimEm <= inicioEm) {
    return res.status(400).json({ erro: 'Informe datas válidas e um fim posterior ao início' });
  }
  if (observacoes != null && typeof observacoes !== 'string') {
    return res.status(400).json({ erro: 'Observações devem ser texto' });
  }

  const criador = await prisma.usuario.findUnique({
    where: { id: criado_por },
    select: { id: true },
  });
  if (!criador) return res.status(400).json({ erro: 'O criador informado não existe' });

  const hoje = new Date();
  const criadoEm = new Date(Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  ));

  const consulta = await prisma.consulta.create({
    data: {
      pacienteId: paciente_id,
      profissionalId: profissional_id,
      especialidadeId: especialidade_id,
      inicioEm,
      fimEm,
      status: 'agendada',
      observacoes: observacoes || null,
      criadoPor: criado_por,
      criadoEm,
      atualizadoEm: criadoEm,
    },
  });

  res.location(`/consultas/${consulta.id}`).status(201).json(respostaConsulta(consulta));
});

export default router;
