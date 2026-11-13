import { umCliente } from '../../src/dados/cliente'
import { expect, test } from '../../src/fixtures'
import { encargosAtraso, simularEsperado } from '../../src/oraculo/credito'
import { hojeIso, lerReais } from '../../src/utils/dinheiro'

const CONTRATACAO_ANTIGA = '2026-06-10' // 1ª parcela vence em 10/07/2026: já está em atraso

test.describe('Contratos', () => {
  let nome: string

  test.beforeEach(async ({ clientes, simulador }) => {
    nome = umCliente().nome
    await clientes.abrir()
    await clientes.cadastrar(umCliente({ nome }))
    await simulador.abrir()
    await simulador.cliente(nome)
  })

  test('CTR-01 contrata e o detalhe mostra os números da simulação @smoke', async ({
    simulador,
    contrato,
  }) => {
    await simulador.parametros({ valor: 10000, taxa: 2, prazo: 12, sistema: 'PRICE' })
    await simulador.contratar()

    await expect(contrato.titulo()).toHaveText(nome)
    expect(lerReais(await contrato.kpi('Valor contratado'))).toBe(10000)
    expect(await contrato.kpi('Parcelas pagas')).toBe('0 de 12')
    await expect(contrato.linhaParcela(12)).toBeVisible()
  })

  test('CTR-02 pagamento em atraso cobra multa e mora como o oráculo @smoke', async ({
    simulador,
    contrato,
  }) => {
    await simulador.parametros({ valor: 5000, taxa: 3, prazo: 6, contratacao: CONTRATACAO_ANTIGA })
    await simulador.contratar()

    const hoje = hojeIso()
    const esperado = simularEsperado({
      valor: 5000,
      taxaMensal: 0.03,
      prazo: 6,
      sistema: 'PRICE',
      contratacao: CONTRATACAO_ANTIGA,
    })
    const p1 = esperado.parcelas[0]
    const encargos = encargosAtraso(p1.valor, p1.vencimento, hoje)

    await contrato.iniciarPagamento(1)
    await contrato.dataPagamento(hoje)
    expect(await contrato.encargos()).toEqual(encargos)

    await contrato.confirmarPagamento(1)
    expect(await contrato.kpi('Parcelas pagas')).toBe('1 de 6')
    await expect(contrato.linhaParcela(1)).toContainText('paga')
  })

  test('CTR-03 pagamento em dia não tem encargos @regressao', async ({ simulador, contrato }) => {
    await simulador.parametros({ valor: 2000, taxa: 2, prazo: 3, contratacao: CONTRATACAO_ANTIGA })
    await simulador.contratar()
    await contrato.iniciarPagamento(1)
    await contrato.dataPagamento('2026-07-10')
    const e = await contrato.encargos()
    expect(e).toMatchObject({ dias: 0, multa: 0, mora: 0 })
  })

  test('CTR-04 data de pagamento apagada não gera NaN @regressao', async ({
    simulador,
    contrato,
    page,
  }) => {
    await simulador.parametros({ valor: 2000, taxa: 2, prazo: 3 })
    await simulador.contratar()
    await contrato.iniciarPagamento(1)
    await contrato.dataPagamento('')
    await expect(page.locator('.card-highlight')).not.toContainText('NaN')
    await expect(page.getByRole('button', { name: 'Confirmar pagamento' })).toBeDisabled()
  })

  test('CTR-05 situação e filtro refletem atraso e quitação @regressao', async ({
    simulador,
    contrato,
    contratos,
  }) => {
    await simulador.parametros({ valor: 1000, taxa: 2, prazo: 1, contratacao: CONTRATACAO_ANTIGA })
    await simulador.contratar()

    await contratos.abrir()
    await contratos.filtrar('em atraso')
    await expect(contratos.linhas.filter({ hasText: nome })).toHaveCount(1)

    await contratos.abrirContratoDe(nome)
    await contrato.iniciarPagamento(1)
    await contrato.dataPagamento(hojeIso())
    await contrato.confirmarPagamento(1)

    await contratos.abrir()
    await contratos.filtrar('quitado')
    await expect(contratos.linhas.filter({ hasText: nome })).toHaveCount(1)
    await contratos.filtrar('em atraso')
    await expect(contratos.linhas.filter({ hasText: nome })).toHaveCount(0)
  })

  test('CTR-06 exclui contrato após confirmação @regressao', async ({
    simulador,
    contrato,
    contratos,
  }) => {
    await simulador.parametros({ valor: 2000, taxa: 2, prazo: 3 })
    await simulador.contratar()
    await contrato.excluir()
    await contratos.filtrar('todos')
    await expect(contratos.linhas.filter({ hasText: nome })).toHaveCount(0)
  })

  test('CTR-07 cliente com contrato não pode ser removido @regressao', async ({
    simulador,
    clientes,
  }) => {
    await simulador.parametros({ valor: 2000, taxa: 2, prazo: 3 })
    await simulador.contratar()
    await clientes.abrir()
    await expect(clientes.botaoRemover(nome)).toBeDisabled()
    await expect(clientes.item(nome)).toContainText('1 contrato(s)')
  })
})
