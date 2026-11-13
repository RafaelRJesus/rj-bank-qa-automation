import { umCliente } from '../../src/dados/cliente'
import { expect, test } from '../../src/fixtures'

test.describe('Visão geral', () => {
  test('VG-01 carteira vazia mostra zeros @smoke', async ({ visaoGeral }) => {
    await visaoGeral.abrir()
    await expect(visaoGeral.kpi('Clientes')).toHaveText('0')
    await expect(visaoGeral.kpi('Contratos ativos')).toHaveText('0')
  })

  test('VG-02 KPIs acompanham cadastro, contratação e atraso @regressao', async ({
    clientes,
    simulador,
    visaoGeral,
  }) => {
    const c = umCliente()
    await clientes.abrir()
    await clientes.cadastrar(c)
    await simulador.abrir()
    await simulador.cliente(c.nome)
    await simulador.parametros({ valor: 3000, taxa: 2, prazo: 12, contratacao: '2026-06-10' })
    await simulador.contratar()

    await visaoGeral.abrir()
    await expect(visaoGeral.kpi('Clientes')).toHaveText('1')
    await expect(visaoGeral.kpi('Contratos ativos')).toHaveText('1')
    await expect(visaoGeral.kpi('Parcelas vencidas')).not.toHaveText(/^0 ·/)
    await expect(visaoGeral.proximosVencimentos().first()).toContainText(c.nome)
  })
})
