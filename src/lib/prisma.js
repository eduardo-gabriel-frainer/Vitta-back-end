const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('A variável de ambiente DATABASE_URL não foi definida');
}

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
