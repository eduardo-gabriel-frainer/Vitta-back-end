import { Router } from 'express';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import prisma from '../../lib/prisma.js';
import { chaveJwt } from '../../lib/jwt.js';
import { emailValido } from '../../validacao/validacoes.js';

const router = Router();

router.post('/', async (req, res) => {
  const { email, senha } = req.body || {};
  const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!emailValido(emailNormalizado) || typeof senha !== 'string' || !senha) {
    return res.status(400).json({ erro: 'Informe um e-mail e uma senha válidos' });
  }

  const chave = chaveJwt();

  const usuario = await prisma.usuarios.findUnique({
    where: { email: emailNormalizado },
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      senha_hash: true,
    },
  });

  if (!usuario || !(await argon2.verify(usuario.senha_hash, senha))) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
  }

  const token = await new SignJWT({
    email: usuario.email,
    tipo: usuario.tipo,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(usuario.id))
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(chave);

  res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
    },
  });
});

export default router;
