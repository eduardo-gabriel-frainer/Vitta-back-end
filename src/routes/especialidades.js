import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { idPositivoValido, nomeValido } from '../validacao/validacoes.js';
import autenticar from '../middlewares/autenticar.js';

const router = Router();

router.use(autenticar);

router.get('/', async (req, res) => {
  const especialidades = await prisma.especialidades.findMany({
    orderBy: { id: 'asc' },
  });
  res.json(especialidades);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const especialidade = await prisma.especialidades.findUnique({ where: { id } });
  if (!especialidade) return res.status(404).json({ erro: 'Especialidade não encontrada' });

  res.json(especialidade);
});

router.post('/', async (req, res) => {
  const { nome } = req.body || {};
  const nomeNormalizado = nomeValido(nome);
  if (!nomeNormalizado) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  const especialidade = await prisma.especialidades.create({
    data: { nome: nomeNormalizado },
  });

  res.location(`/especialidades/${especialidade.id}`).status(201).json(especialidade);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const { nome } = req.body || {};
  const nomeNormalizado = nomeValido(nome);
  if (!nomeNormalizado) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  const existente = await prisma.especialidades.findUnique({ where: { id } });
  if (!existente) return res.status(404).json({ erro: 'Especialidade não encontrada' });

  const especialidade = await prisma.especialidades.update({
    where: { id },
    data: { nome: nomeNormalizado },
  });

  res.json(especialidade);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!idPositivoValido(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  const especialidade = await prisma.especialidades.findUnique({ where: { id } });
  if (!especialidade) return res.status(404).json({ erro: 'Especialidade não encontrada' });

  const consultas = await prisma.consultas.count({ where: { especialidade_id: id } });
  if (consultas > 0) {
    return res.status(409).json({ erro: 'Especialidade possui consultas vinculadas' });
  }

  await prisma.$transaction([
    prisma.profissional_especialidade.deleteMany({ where: { especialidade_id: id } }),
    prisma.especialidades.delete({ where: { id } }),
  ]);

  res.status(204).send();
});

export default router;