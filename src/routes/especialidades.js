const express = require('express');
const { parametroId, textoValido } = require('../lib/validation');

module.exports = function criarRotasEspecialidades(db) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    const [rows] = await db.execute('SELECT id, nome FROM especialidades ORDER BY id');
    res.json(rows);
  });
  router.get('/:id', async (req, res) => {
    const id = parametroId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });
    const [rows] = await db.execute('SELECT id, nome FROM especialidades WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ erro: 'Especialidade não encontrada' });
    res.json(rows[0]);
  });
  router.post('/', async (req, res) => {
    const { nome } = req.body || {};
    if (!textoValido(nome, 150)) return res.status(400).json({ erro: 'Nome é obrigatório e deve ter até 150 caracteres' });
    const [result] = await db.execute('INSERT INTO especialidades (nome) VALUES (?)', [nome.trim()]);
    res.location(`/especialidades/${result.insertId}`).status(201).json({ id: result.insertId, nome: nome.trim() });
  });
  return router;
};
