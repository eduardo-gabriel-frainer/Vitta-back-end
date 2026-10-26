const express = require('express');
const { idValido, parametroId, dataHoraValida, textoOpcional } = require('../lib/validation');
const columns = 'id, paciente_id, profissional_id, especialidade_id, inicio_em, fim_em, status, observacoes, motivo_cancelamento, cancelado_em, cancelador_por, criado_por, criado_em, atualizado_em';

module.exports = function criarRotasConsultas(db) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    const [rows] = await db.execute(`SELECT ${columns} FROM consultas ORDER BY id`);
    res.json(rows);
  });
  router.get('/:id', async (req, res) => {
    const id = parametroId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });
    const [rows] = await db.execute(`SELECT ${columns} FROM consultas WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ erro: 'Consulta não encontrada' });
    res.json(rows[0]);
  });
  router.post('/', async (req, res) => {
    const { paciente_id, profissional_id, especialidade_id, inicio_em, fim_em, criado_por, observacoes } = req.body || {};
    if (![paciente_id, profissional_id, especialidade_id, criado_por].every(idValido)) {
      return res.status(400).json({ erro: 'paciente_id, profissional_id, especialidade_id e criado_por devem ser inteiros positivos' });
    }
    if (!dataHoraValida(inicio_em) || !dataHoraValida(fim_em) || fim_em <= inicio_em) {
      return res.status(400).json({ erro: 'Informe inicio_em e fim_em válidos em UTC (AAAA-MM-DD HH:mm:ss), com fim posterior ao início, dentro do intervalo TIMESTAMP do MySQL' });
    }
    if (!textoOpcional(observacoes, 16000)) return res.status(400).json({ erro: 'observacoes deve ser texto com até 16000 caracteres' });
    // criado_por não possui FK no script original: verificar explicitamente.
    const [related] = await db.execute(`SELECT
      EXISTS(SELECT 1 FROM usuarios WHERE id = ?) AS paciente,
      EXISTS(SELECT 1 FROM profissionais WHERE id = ?) AS profissional,
      EXISTS(SELECT 1 FROM especialidades WHERE id = ?) AS especialidade,
      EXISTS(SELECT 1 FROM usuarios WHERE id = ?) AS criador`,
      [paciente_id, profissional_id, especialidade_id, criado_por]);
    const row = related[0];
    if (!row || !row.paciente || !row.profissional || !row.especialidade || !row.criador) {
      return res.status(400).json({ erro: 'Paciente, profissional, especialidade e criador devem existir no banco' });
    }
    const [result] = await db.execute(`INSERT INTO consultas
      (paciente_id, profissional_id, especialidade_id, inicio_em, fim_em, status, observacoes, criado_por, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_DATE(), UTC_DATE())`,
      [paciente_id, profissional_id, especialidade_id, inicio_em, fim_em, 'agendada', observacoes?.trim() || null, criado_por]);
    const [rows] = await db.execute(`SELECT ${columns} FROM consultas WHERE id = ?`, [result.insertId]);
    res.location(`/consultas/${result.insertId}`).status(201).json(rows[0]);
  });
  return router;
};
