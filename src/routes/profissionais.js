// aqui vai ter as rotas para get, post, put, delete de profissionais e de especialidades

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    mensagem: 'Rota de profissionais funcionando'
  });
});

module.exports = router;