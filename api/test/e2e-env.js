// Corre em cada worker antes dos testes: aponta o Prisma para a BD de teste.
// (O dotenv do ConfigModule não substitui variáveis já definidas.)
process.env.DATABASE_URL =
  'postgresql://faturas:faturas@localhost:5432/faturas_test';
process.env.JWT_SECRET = 'test-secret-change-me';
