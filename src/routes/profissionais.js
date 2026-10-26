const express = require('express');
const { parametroId, textoValido, textoOpcional } = require('../lib/validation');

module.exports = function criarRotasProfissionais(db) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    const [rows] = await db.execute('SELECT id, nome, email, telefone FROM profissionais ORDER BY id');
    res.json(rows);
  });
  router.get('/:id', async (req, res) => {
    const id = parametroId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });
    const [rows] = await db.execute('SELECT id, nome, email, telefone FROM profissionais WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ erro: 'Profissional não encontrado' });
    res.json(rows[0]);
  });
  router.post('/', async (req, res) => {
    const { nome, email, telefone } = req.body || {};
    if (!textoValido(nome, 150) || !textoOpcional(email, 300) || !textoOpcional(telefone, 20)) {
      return res.status(400).json({ erro: 'Informe nome (até 150 caracteres), email opcional (até 300) e telefone opcional (até 20)' });
    }
    const values = [nome.trim(), email?.trim() || null, telefone?.trim() || null];
    const [result] = await db.execute('INSERT INTO profissionais (nome, email, telefone) VALUES (?, ?, ?)', values);
    res.location(`/profissionais/${result.insertId}`).status(201).json({ id: result.insertId, nome: values[0], email: values[1], telefone: values[2] });
  });
  return router;
};
