const express = require('express');

const app = express();

app.use(express.json());

app.use('/profissionais', require('./routes/profissionais'));

module.exports = app;