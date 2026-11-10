import { Router } from 'express';
import argon2 from 'argon2';
import prisma from '../../lib/prisma.js';
import {
  dataAtualUtc,
  dataIsoValida,
  emailValido,
  nomeValido,
} from '../../validacao/validacoes.js';

const router = Router();

router.post('/', async (req, res) => {
  const { nome, email, senha, data_nascimento } = req.body || {};

  const nomeNormalizado = nomeValido(nome);
  const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const dataNascimento = dataIsoValida(data_nascimento);
  if (!nomeNormalizado || !emailValido(emailNormalizado)
    || typeof senha !== 'string' || senha.length < 8 || !dataNascimento) {
    return res.status(400).json({
      erro: 'Informe nome, email, senha com pelo menos 8 caracteres e data de nascimento válida',
    });
  }

  const senha_hash = await argon2.hash(senha);

  let usuario;
  try {
    usuario = await prisma.usuarios.create({
      data: {
        nome: nomeNormalizado,
        email: emailNormalizado,
        senha_hash,
        tipo: 'cliente',
        data_nascimento: dataNascimento,
        criado_em: dataAtualUtc(),
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        data_nascimento: true,
        criado_em: true,
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }

    throw error;
  }

  res.status(201).json(usuario);
});

export default router;