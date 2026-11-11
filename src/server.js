import 'dotenv/config';
import app from './app.js';
import prisma from './lib/prisma.js';
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker.js';

await prisma.$connect();
startEmailWorker();

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

async function shutdown(signal) {
  console.log(`Recebido ${signal}; encerrando o servidor.`);
  server.close(async () => {
    await stopEmailWorker();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
