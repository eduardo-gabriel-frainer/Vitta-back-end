const express = require('express');
const { parametroId, textoValido, textoOpcional } = require('../lib/validation');

function serializarProfissional(profissional) {
  return {
    id: profissional.id,
    nome: profissional.nome,
    email: profissional.email,
    telefone: profissional.telefone,
  };
}

module.exports = function criarRotasProfissionais(prisma) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const profissionais = await prisma.profissional.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(profissionais.map(serializarProfissional));
  });

  router.get('/:id', async (req, res) => {
    const id = parametroId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });

    const profissional = await prisma.profissional.findUnique({ where: { id } });
    if (!profissional) return res.status(404).json({ erro: 'Profissional não encontrado' });

    res.json(serializarProfissional(profissional));
  });

  router.post('/', async (req, res) => {
    const { nome, email, telefone } = req.body || {};
    if (!textoValido(nome, 150) || !textoOpcional(email, 300) || !textoOpcional(telefone, 20)) {
      return res.status(400).json({ erro: 'Informe nome (até 150 caracteres), email opcional (até 300) e telefone opcional (até 20)' });
    }

    const profissional = await prisma.profissional.create({
      data: {
        nome: nome.trim(),
        email: email?.trim() || null,
        telefone: telefone?.trim() || null,
      },
    });

    res.location(`/profissionais/${profissional.id}`)
      .status(201)
      .json(serializarProfissional(profissional));
  });

  return router;
};
