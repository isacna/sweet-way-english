import { defineConfig } from 'vitest/config';

// Testes contra um Postgres de verdade: npm run test:db (precisa de TEST_DATABASE_URL; sem ela, tudo é pulado).
// O banco de TEST_DATABASE_URL é APAGADO e recriado a cada execução — o nome do banco precisa conter "test".
const url = process.env.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/db/**/*.test.ts'],
    globalSetup: ['src/__tests__/db/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
    env: {
      JWT_SECRET: 'test-secret-com-16-chars-ou-mais',
      NODE_ENV: 'test',
      ...(url ? { DATABASE_URL: url } : {}),
    },
  },
});
