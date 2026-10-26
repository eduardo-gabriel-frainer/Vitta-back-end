const express = require('express');

const app = express();

app.use(express.json());

app.use('/profissionais', require('./routes/profissionais'));
app.use('/consultas', require('./routes/consultas'));
app.use('/especialidades', require('./routes/especialidades'));

module.exports = app;