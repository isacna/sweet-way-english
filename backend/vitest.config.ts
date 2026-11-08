import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Testes com Postgres real ficam em vitest.db.config.ts (npm run test:db)
    exclude: [...configDefaults.exclude, 'src/__tests__/db/**'],
    env: { JWT_SECRET: 'test-secret-com-16-chars-ou-mais' },
    coverage: {
      provider: 'v8',
      include: ['src/http/**/*.ts', 'src/config/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/database/generated/**'],
      reporter: ['text', 'html'],
    },
  },
});
