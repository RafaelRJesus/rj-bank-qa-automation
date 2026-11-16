import { test as base, expect } from '@playwright/test'
import { env } from '../env'
import { simularApisExternas } from '../mocks/apisExternas'
import { AcessoPage } from '../paginas/AcessoPage'
import { ClientesPage } from '../paginas/ClientesPage'
import { GestoresPage } from '../paginas/GestoresPage'
import { ContratoDetalhePage, ContratosPage } from '../paginas/ContratosPage'
import { Navegacao } from '../paginas/Navegacao'
import { SimuladorPage } from '../paginas/SimuladorPage'
import { VisaoGeralPage } from '../paginas/VisaoGeralPage'
import { limparDadosDoTeste } from './firestore'

interface Paginas {
  acesso: AcessoPage
  gestores: GestoresPage
  nav: Navegacao
  clientes: ClientesPage
  simulador: SimuladorPage
  contratos: ContratosPage
  contrato: ContratoDetalhePage
  visaoGeral: VisaoGeralPage
}

interface Opcoes {
  bcbFora: boolean
  /** Entra antes do teste como equipe: admin de exemplo (local) ou gestor de teste (produção). */
  logado: boolean
}

export const test = base.extend<Paginas & Opcoes>({
  bcbFora: [false, { option: true }],
  logado: [true, { option: true }],

  page: async ({ page, bcbFora, logado }, run, testInfo) => {
    if (env.apisExternas === 'mock') await simularApisExternas(page, { bcbFora })

    if (logado && env.appLocal) {
      // O admin de exemplo do modo local tem uid fixo; basta abrir a sessão.
      await page.addInitScript(() => {
        if (!sessionStorage.getItem('qa-sessao')) {
          localStorage.setItem('respawn:sessao', 'admin-local')
          sessionStorage.setItem('qa-sessao', '1')
        }
      })
    } else if (logado) {
      testInfo.skip(!env.gestor.email, 'QA_GESTOR_EMAIL/QA_GESTOR_SENHA não configurados')
      await new AcessoPage(page).entrarComSucesso(env.gestor.email, env.gestor.senha)
    }

    await run(page)
    if (!env.appLocal) await limparDadosDoTeste(page)
  },

  acesso: async ({ page }, run) => run(new AcessoPage(page)),
  gestores: async ({ page }, run) => run(new GestoresPage(page)),

  nav: async ({ page }, run) => run(new Navegacao(page)),
  clientes: async ({ page }, run) => run(new ClientesPage(page)),
  simulador: async ({ page }, run) => run(new SimuladorPage(page)),
  contratos: async ({ page }, run) => run(new ContratosPage(page)),
  contrato: async ({ page }, run) => run(new ContratoDetalhePage(page)),
  visaoGeral: async ({ page }, run) => run(new VisaoGeralPage(page)),
})

export { expect }
