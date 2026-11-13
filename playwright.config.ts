import { defineConfig, devices } from '@playwright/test'
import { env } from './src/env'

const chrome = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}

export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: env.ci,
  retries: env.ci ? 1 : 0,
  workers: env.ci ? 2 : undefined,
  reporter: env.ci
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseUrl,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: chrome,
  },
  projects: [
    { name: 'ui-desktop', testDir: 'tests/ui', use: { ...devices['Desktop Chrome'] } },
    {
      // no celular roda só o que faz sentido: fumaça e layout
      name: 'ui-mobile',
      testDir: 'tests/ui',
      grep: /@mobile|@smoke/,
      use: { ...devices['Pixel 7'] },
    },
    { name: 'api', testDir: 'tests/api' },
    { name: 'contrato', testDir: 'tests/contrato' },
    { name: 'oraculo', testDir: 'tests/oraculo' },
  ],
})
