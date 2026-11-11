import { jwtVerify } from 'jose';
import { chaveJwt } from '../lib/jwt.js';

export default async function autenticar(req, res, next) {
  const autorizacao = req.get('authorization') || '';
  const correspondencia = /^Bearer\s+(\S+)$/i.exec(autorizacao);
  if (!correspondencia) {
    return res.status(401).json({ erro: 'Token ausente ou inválido 1' });
  }

  const chave = chaveJwt();
  let payload;
  try {
    ({ payload } = await jwtVerify(correspondencia[1], chave, {
      algorithms: ['HS256'],
    }));
  } catch {
    return res.status(401).json({ erro: 'Token ausente ou inválido 2' });
  }

  const id = Number(payload.sub);
  if (!Number.isSafeInteger(id) || id <= 0
    || typeof payload.email !== 'string' || typeof payload.tipo !== 'string') {
    return res.status(401).json({ erro: 'Token ausente ou inválido 3' });
  }

  req.usuario = { id, email: payload.email, tipo: payload.tipo };
  return next();
}
