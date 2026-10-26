const express = require('express');
const prisma = require('./lib/prisma');

const app = express();

app.use(express.json());

app.use('/profissionais', require('./routes/profissionais')(prisma));
app.use('/consultas', require('./routes/consultas')(prisma));
app.use('/especialidades', require('./routes/especialidades')(prisma));

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  console.error('Erro ao processar requisição:', error);

  if (error.code === 'P2002') {
    return res.status(409).json({ erro: 'Já existe um registro com esses dados únicos' });
  }

  if (error.code === 'P2003') {
    return res.status(400).json({ erro: 'O registro referencia dados que não existem' });
  }

  res.status(500).json({ erro: 'Erro interno do servidor' });
});

module.exports = app;
