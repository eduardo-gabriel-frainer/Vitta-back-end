import express from 'express';
import profissionais from './routes/profissionais.js';
import consultas from './routes/consultas.js';
import especialidades from './routes/especialidades.js';
import agendas from './routes/agendas.js';

const app = express();

app.use(express.json());
app.use('/profissionais', profissionais);
app.use('/consultas', consultas);
app.use('/especialidades', especialidades);
app.use('/agendas', agendas);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((error, req, res, next) => {
  console.error(error);

  const erroUsuario = error.code === 'P2002'
    ? 'Já existe um cadastro com esse nome'
    : 'Não foi possível processar a requisição';

  res.status(500).json({ erro: erroUsuario });
});

export default app;
