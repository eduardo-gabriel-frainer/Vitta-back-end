const express = require('express');
const { idValido, parametroId, dataHoraValida, textoOpcional } = require('../lib/validation');

function serializarConsulta(consulta) {
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

module.exports = function criarRotasConsultas(prisma) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const consultas = await prisma.consulta.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(consultas.map(serializarConsulta));
  });

  router.get('/:id', async (req, res) => {
    const id = parametroId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });

    const consulta = await prisma.consulta.findFirst({ where: { id } });
    if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

    res.json(serializarConsulta(consulta));
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

    if (![paciente_id, profissional_id, especialidade_id, criado_por].every(idValido)) {
      return res.status(400).json({ erro: 'paciente_id, profissional_id, especialidade_id e criado_por devem ser inteiros positivos' });
    }
    if (!dataHoraValida(inicio_em) || !dataHoraValida(fim_em) || fim_em <= inicio_em) {
      return res.status(400).json({ erro: 'Informe inicio_em e fim_em válidos em UTC (AAAA-MM-DD HH:mm:ss), com fim posterior ao início' });
    }
    if (!textoOpcional(observacoes, 16000)) {
      return res.status(400).json({ erro: 'observacoes deve ser texto com até 16000 caracteres' });
    }

    const [paciente, profissional, especialidade, criador] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: paciente_id }, select: { id: true } }),
      prisma.profissional.findUnique({ where: { id: profissional_id }, select: { id: true } }),
      prisma.especialidade.findUnique({ where: { id: especialidade_id }, select: { id: true } }),
      prisma.usuario.findUnique({ where: { id: criado_por }, select: { id: true } }),
    ]);

    if (!paciente || !profissional || !especialidade || !criador) {
      return res.status(400).json({ erro: 'Paciente, profissional, especialidade e criador devem existir no banco' });
    }

    const now = new Date();
    const todayUtc = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ));

    const consulta = await prisma.consulta.create({
      data: {
        pacienteId: paciente_id,
        profissionalId: profissional_id,
        especialidadeId: especialidade_id,
        inicioEm: new Date(`${inicio_em.replace(' ', 'T')}Z`),
        fimEm: new Date(`${fim_em.replace(' ', 'T')}Z`),
        status: 'agendada',
        observacoes: observacoes?.trim() || null,
        criadoPor: criado_por,
        criadoEm: todayUtc,
        atualizadoEm: todayUtc,
      },
    });

    res.location(`/consultas/${consulta.id}`)
      .status(201)
      .json(serializarConsulta(consulta));
  });

  return router;
};
