import { test as base, expect } from '@playwright/test'
import { env } from '../env'
import { simularApisExternas } from '../mocks/apisExternas'
import { ClientesPage } from '../paginas/ClientesPage'
import { ContratoDetalhePage, ContratosPage } from '../paginas/ContratosPage'
import { Navegacao } from '../paginas/Navegacao'
import { SimuladorPage } from '../paginas/SimuladorPage'
import { VisaoGeralPage } from '../paginas/VisaoGeralPage'
import { limparDadosDoTeste } from './firestore'

interface Paginas {
  nav: Navegacao
  clientes: ClientesPage
  simulador: SimuladorPage
  contratos: ContratosPage
  contrato: ContratoDetalhePage
  visaoGeral: VisaoGeralPage
}

export const test = base.extend<Paginas & { bcbFora: boolean }>({
  bcbFora: [false, { option: true }],

  // Cada teste roda num contexto novo: no Firestore isso vira um usuário anônimo
  // próprio, então um teste nunca enxerga os dados de outro.
  page: async ({ page, bcbFora }, run) => {
    if (env.apisExternas === 'mock') await simularApisExternas(page, { bcbFora })
    await run(page)
    await limparDadosDoTeste(page)
  },

  nav: async ({ page }, run) => run(new Navegacao(page)),
  clientes: async ({ page }, run) => run(new ClientesPage(page)),
  simulador: async ({ page }, run) => run(new SimuladorPage(page)),
  contratos: async ({ page }, run) => run(new ContratosPage(page)),
  contrato: async ({ page }, run) => run(new ContratoDetalhePage(page)),
  visaoGeral: async ({ page }, run) => run(new VisaoGeralPage(page)),
})

export { expect }
