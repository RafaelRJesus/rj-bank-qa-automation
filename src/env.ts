import { existsSync, readFileSync } from 'node:fs'

// Leitura simples do .env, sem dependência extra
if (existsSync('.env')) {
  for (const linha of readFileSync('.env', 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

export const env = {
  baseUrl: process.env.BASE_URL || 'https://cliente-app-1a979.web.app',
  firebaseApiKey: process.env.FIREBASE_API_KEY || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'cliente-app-1a979',
  apisExternas: (process.env.EXTERNAL_APIS || 'mock') as 'mock' | 'live',
  ci: Boolean(process.env.CI),
}
