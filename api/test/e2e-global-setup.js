/**
 * Os testes e2e usam uma base de dados própria (faturas_test) para nunca
 * sujarem os dados reais de desenvolvimento.
 */
const { execSync } = require('node:child_process');

const TEST_DATABASE_URL =
  'postgresql://faturas:faturas@localhost:5432/faturas_test';

module.exports = function globalSetup() {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: `${__dirname}/..`,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
};
