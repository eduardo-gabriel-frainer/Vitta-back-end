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

export default router;
