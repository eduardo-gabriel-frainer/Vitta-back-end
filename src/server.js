import 'dotenv/config';
import app from './app.js';
import prisma from './lib/prisma.js';

await prisma.$connect();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
