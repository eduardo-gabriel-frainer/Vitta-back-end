import { Router } from 'express';
import prisma from '../lib/prisma.js';
import {
  dataAtualUtc,
  idPositivoValido,
  nomeValido,
  normalizarTextoOpcional,
  textosOpcionaisValidos,
} from '../validacao/validacoes.js';

const router = Router();

const incluirEspecialidades = {
  profissionalEspecialidades: {
    include: { especialidade: true },
    orderBy: { especialidadeId: 'asc' },
  },
};

router.get('/', async (req, res) => {
  const profissionais = await prisma.profissional.findMany({
    orderBy: { id: 'asc' },
    include: incluirEspecialidades,
  });
  res.json(profissionais);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const profissional = await prisma.profissional.findUnique({
    where: { id },
    include: incluirEspecialidades,
  });
  if (!profissional) return res.status(404).json({ erro: 'Profissional não encontrado' });

  res.json(profissional);
});

router.post('/', async (req, res) => {
  const { nome, email, telefone } = req.body || {};
  const especialidadeIds = Array.isArray(req.body?.especialidade_ids)
    ? [...new Set(req.body.especialidade_ids)]
    : req.body?.especialidade_id === undefined
      ? undefined
      : [req.body.especialidade_id];
  const nomeNormalizado = nomeValido(nome);
  if (!nomeNormalizado) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }
  if (!textosOpcionaisValidos(email, telefone)) {
    return res.status(400).json({ erro: 'Email e telefone devem ser texto' });
  }
  if (
    !Array.isArray(especialidadeIds)
    || especialidadeIds.length === 0
    || !especialidadeIds.every(idPositivoValido)
  ) {
    return res.status(400).json({ erro: 'Selecione ao menos uma especialidade válida' });
  }

  const especialidadesEncontradas = await prisma.especialidade.findMany({
    where: { id: { in: especialidadeIds } },
    select: { id: true },
  });
  if (especialidadesEncontradas.length !== especialidadeIds.length) {
    return res.status(400).json({ erro: 'Uma ou mais especialidades não foram encontradas' });
  }

  const profissional = await prisma.$transaction(async (tx) => {
    const criado = await tx.profissional.create({
      data: {
        nome: nomeNormalizado,
        email: normalizarTextoOpcional(email),
        telefone: normalizarTextoOpcional(telefone),
      },
    });

    for (const especialidadeId of especialidadeIds) {
      await tx.profissionalEspecialidade.create({
        data: {
          profissionalId: criado.id,
          especialidadeId,
          criadoEm: dataAtualUtc(),
        },
      });
    }

    return tx.profissional.findUnique({
      where: { id: criado.id },
      include: incluirEspecialidades,
    });
  });

  res.location(`/profissionais/${profissional.id}`).status(201).json(profissional);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const { nome, email, telefone } = req.body || {};
  const especialidadeIds = Array.isArray(req.body?.especialidade_ids)
    ? [...new Set(req.body.especialidade_ids)]
    : req.body?.especialidade_id === undefined
      ? undefined
      : [req.body.especialidade_id];
  const nomeNormalizado = nomeValido(nome);
  if (!nomeNormalizado) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }
  if (!textosOpcionaisValidos(email, telefone)) {
    return res.status(400).json({ erro: 'Email e telefone devem ser texto' });
  }
  if (
    especialidadeIds !== undefined
    && (
      especialidadeIds.length === 0
      || !especialidadeIds.every(idPositivoValido)
    )
  ) {
    return res.status(400).json({ erro: 'Selecione ao menos uma especialidade válida' });
  }
  if (especialidadeIds !== undefined) {
    const especialidadesEncontradas = await prisma.especialidade.findMany({
      where: { id: { in: especialidadeIds } },
      select: { id: true },
    });
    if (especialidadesEncontradas.length !== especialidadeIds.length) {
      return res.status(400).json({ erro: 'Uma ou mais especialidades não foram encontradas' });
    }
  }

  const existente = await prisma.profissional.findUnique({ where: { id } });
  if (!existente) return res.status(404).json({ erro: 'Profissional não encontrado' });

  const profissional = await prisma.$transaction(async (tx) => {
    await tx.profissional.update({
      where: { id },
      data: {
        nome: nomeNormalizado,
        email: normalizarTextoOpcional(email),
        telefone: normalizarTextoOpcional(telefone),
      },
    });

    if (especialidadeIds !== undefined) {
      await tx.profissionalEspecialidade.deleteMany({
        where: { profissionalId: id },
      });
      for (const especialidadeId of especialidadeIds) {
        await tx.profissionalEspecialidade.create({
          data: {
            profissionalId: id,
            especialidadeId,
            criadoEm: dataAtualUtc(),
          },
        });
      }
    }

    return tx.profissional.findUnique({
      where: { id },
      include: incluirEspecialidades,
    });
  });

  res.json(profissional);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const profissional = await prisma.profissional.findUnique({ where: { id } });
  if (!profissional) return res.status(404).json({ erro: 'Profissional não encontrado' });

  const [consultas, agendas] = await Promise.all([
    prisma.consulta.count({ where: { profissionalId: id } }),
    prisma.agenda.count({ where: { profissionalId: id } }),
  ]);
  if (consultas > 0 || agendas > 0) {
    return res.status(409).json({ erro: 'Profissional possui consultas ou agendas vinculadas' });
  }

  await prisma.$transaction([
    prisma.profissionalEspecialidade.deleteMany({ where: { profissionalId: id } }),
    prisma.profissional.delete({ where: { id } }),
  ]);

  res.status(204).send();
});

export default router;