import express from 'express';
import profissionais from './routes/profissionais.js';
import consultas from './routes/consultas.js';
import especialidades from './routes/especialidades.js';

const app = express();

app.use(express.json());
app.use('/profissionais', profissionais);
app.use('/consultas', consultas);
app.use('/especialidades', especialidades);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status
    || (error.code === 'P2002' ? 409 : ['P2000', 'P2003'].includes(error.code) ? 400 : 500);
  res.status(status)
    .json({ erro: 'Não foi possível processar a requisição' });
});

export default app;
