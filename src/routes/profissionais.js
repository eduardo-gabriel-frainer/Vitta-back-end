import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  const profissionais = await prisma.profissional.findMany({
    orderBy: { id: 'asc' },
  });
  res.json(profissionais);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const profissional = await prisma.profissional.findUnique({ where: { id } });
  if (!profissional) return res.status(404).json({ erro: 'Profissional não encontrado' });

  res.json(profissional);
});

router.post('/', async (req, res) => {
  const { nome, email, telefone } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }
  if ([email, telefone].some((value) => value != null && typeof value !== 'string')) {
    return res.status(400).json({ erro: 'Email e telefone devem ser texto' });
  }

  const profissional = await prisma.profissional.create({
    data: {
      nome: nome.trim(),
      email: email?.trim() || null,
      telefone: telefone?.trim() || null,
    },
  });

  res.location(`/profissionais/${profissional.id}`).status(201).json(profissional);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const { nome, email, telefone } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }
  if ([email, telefone].some((value) => value != null && typeof value !== 'string')) {
    return res.status(400).json({ erro: 'Email e telefone devem ser texto' });
  }

  const existente = await prisma.profissional.findUnique({ where: { id } });
  if (!existente) return res.status(404).json({ erro: 'Profissional não encontrado' });

  const profissional = await prisma.profissional.update({
    where: { id },
    data: {
      nome: nome.trim(),
      email: email?.trim() || null,
      telefone: telefone?.trim() || null,
    },
  });

  res.json(profissional);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
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