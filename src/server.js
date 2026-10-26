require('dotenv').config();

const app = require('./app');
const prisma = require('./lib/prisma');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await prisma.$connect();

    const server = app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        server.close(async (error) => {
          if (error) {
            console.error('Erro ao encerrar o servidor:', error);
            process.exitCode = 1;
          }

          try {
            await prisma.$disconnect();
          } catch (disconnectError) {
            console.error('Erro ao encerrar a conexão com o banco:', disconnectError);
            process.exitCode = 1;
          }
        });
      });
    }
  } catch (error) {
    console.error('Não foi possível iniciar a API e conectar ao banco:', error);

    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Erro ao encerrar a conexão com o banco:', disconnectError);
    }

    process.exitCode = 1;
  }
}

iniciarServidor();
