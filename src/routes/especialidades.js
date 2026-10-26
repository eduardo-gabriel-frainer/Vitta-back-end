const express = require('express');
const { parametroId, textoValido } = require('../lib/validation');

module.exports = function criarRotasEspecialidades(prisma) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const especialidades = await prisma.especialidade.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(especialidades);
  });

  router.get('/:id', async (req, res) => {
    const id = parametroId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });

    const especialidade = await prisma.especialidade.findUnique({ where: { id } });
    if (!especialidade) return res.status(404).json({ erro: 'Especialidade não encontrada' });

    res.json(especialidade);
  });

  router.post('/', async (req, res) => {
    const { nome } = req.body || {};
    if (!textoValido(nome, 150)) {
      return res.status(400).json({ erro: 'Nome é obrigatório e deve ter até 150 caracteres' });
    }

    const especialidade = await prisma.especialidade.create({
      data: { nome: nome.trim() },
    });

    res.location(`/especialidades/${especialidade.id}`)
      .status(201)
      .json(especialidade);
  });

  return router;
};
