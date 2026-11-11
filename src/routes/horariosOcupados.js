import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { dataIsoValida, idPositivoValido } from '../validacao/validacoes.js';

const router = Router();

router.get('/', async (req, res) => {
  const profissionalIdValido = typeof req.query.profissional_id === 'string'
    ? Number(req.query.profissional_id)
    : NaN;
  const dataValida = typeof req.query.data === 'string'
    ? dataIsoValida(req.query.data)
    : null;

  if (!idPositivoValido(profissionalIdValido) || !dataValida) {
    return res.status(400).json({
      erro: 'Informe um ID de profissional e uma data válidos',
    });
  }

  const diaSeguinte = new Date(dataValida);
  diaSeguinte.setUTCDate(diaSeguinte.getUTCDate() + 1);

  const consultas = await prisma.consultas.findMany({
    where: {
      profissional_id: profissionalIdValido,
      status: { not: 'cancelada' },
      inicio_em: { lt: diaSeguinte },
      fim_em: { gt: dataValida },
    },
    select: {
      inicio_em: true,
      fim_em: true,
    },
  });

  res.json(consultas);
});

export default router;
