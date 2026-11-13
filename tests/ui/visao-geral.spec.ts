import { umCliente } from '../../src/dados/cliente'
import { env } from '../../src/env'
import { expect, test } from '../../src/fixtures'

const numero = async (loc: import('@playwright/test').Locator) =>
  Number((await loc.innerText()).split(' ')[0])

test.describe('Visão geral', () => {
  test('VG-01 carteira vazia mostra zeros @smoke', async ({ visaoGeral }) => {
    test.skip(!env.appLocal, 'em produção a carteira do gestor não começa vazia')
    await visaoGeral.abrir()
    await expect(visaoGeral.kpi('Clientes')).toHaveText('0')
    await expect(visaoGeral.kpi('Contratos ativos')).toHaveText('0')
  })

  test('VG-02 KPIs acompanham cadastro, contratação e atraso @regressao', async ({
    clientes,
    simulador,
    visaoGeral,
  }) => {
    await visaoGeral.abrir()
    const antes = {
      clientes: await numero(visaoGeral.kpi('Clientes')),
      ativos: await numero(visaoGeral.kpi('Contratos ativos')),
      vencidas: await numero(visaoGeral.kpi('Parcelas vencidas')),
    }

    const c = umCliente()
    await clientes.abrir()
    await clientes.cadastrar(c)
    await simulador.abrir()
    await simulador.cliente(c.nome)
    await simulador.parametros({ valor: 3000, taxa: 2, prazo: 12, contratacao: '2026-06-10' })
    await simulador.contratar()

    await visaoGeral.abrir()
    await expect(visaoGeral.kpi('Clientes')).toHaveText(String(antes.clientes + 1))
    await expect(visaoGeral.kpi('Contratos ativos')).toHaveText(String(antes.ativos + 1))
    expect(await numero(visaoGeral.kpi('Parcelas vencidas'))).toBeGreaterThan(antes.vencidas)
  })
})
