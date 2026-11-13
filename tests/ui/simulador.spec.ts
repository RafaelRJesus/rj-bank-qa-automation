import { umCliente } from '../../src/dados/cliente'
import { expect, test } from '../../src/fixtures'
import { simularEsperado } from '../../src/oraculo/credito'
import { hojeIso } from '../../src/utils/dinheiro'

test.describe('Simulador · cálculo', () => {
  test.beforeEach(async ({ simulador }) => {
    await simulador.abrir()
  })

  for (const sistema of ['PRICE', 'SAC'] as const) {
    test(`SIM-01 cronograma ${sistema} bate com o oráculo @smoke`, async ({ simulador }) => {
      const contratacao = '2026-11-13'
      await simulador.parametros({ valor: 10000, taxa: 2, prazo: 12, sistema, contratacao })

      const esperado = simularEsperado({
        valor: 10000,
        taxaMensal: 0.02,
        prazo: 12,
        sistema,
        contratacao,
      })
      const parcelas = await simulador.parcelas()

      expect(parcelas).toHaveLength(12)
      parcelas.forEach((p, i) => {
        expect.soft(p.valor, `parcela ${p.numero}`).toBe(esperado.parcelas[i].valor)
        expect.soft(p.juros, `juros ${p.numero}`).toBe(esperado.parcelas[i].juros)
      })
      expect(parcelas.at(-1)!.saldo).toBe(0)
      expect(await simulador.kpi('Total a pagar')).toBe(esperado.total)
      expect(await simulador.kpi('Valor liberado')).toBe(esperado.liberado)
    })
  }

  test('SIM-02 SAC fecha o saldo em zero mesmo com valor quebrado @regressao', async ({
    simulador,
  }) => {
    // Bug corrigido: arredondamento deixava centavos na última parcela
    await simulador.parametros({ valor: 10000.01, taxa: 3.17, prazo: 7, sistema: 'SAC' })
    const parcelas = await simulador.parcelas()
    const amortizado = parcelas.reduce((s, p) => s + p.amortizacao, 0)
    expect(Math.round(amortizado * 100)).toBe(1000001)
    expect(parcelas.at(-1)!.saldo).toBe(0)
  })

  test('SIM-03 taxa vazia bloqueia a contratação em vez de virar 0% @regressao', async ({
    simulador,
    page,
  }) => {
    await simulador.parametros({ taxa: '' as unknown as number })
    await expect(simulador.erroDo('taxa')).toHaveText('Informe a taxa.')
    await expect(page.getByText('Ajuste os parâmetros para ver a simulação.')).toBeVisible()
    await expect(simulador.botaoContratar()).toHaveCount(0)
  })

  test('SIM-04 respeita os limites de valor e prazo do produto @regressao', async ({
    simulador,
  }) => {
    await simulador.parametros({ valor: 100, prazo: 61 })
    await expect(simulador.erroDo('valor')).toContainText('R$ 500,00')
    await expect(simulador.erroDo('prazo')).toHaveText('De 1 a 60 meses.')
    await expect(simulador.botaoContratar()).toBeDisabled()
  })

  test('SIM-05 sem cliente selecionado não contrata @regressao', async ({ simulador, page }) => {
    await simulador.botaoContratar().click()
    await expect(simulador.erroDo('clienteId')).toHaveText('Selecione o cliente para contratar.')
    await expect(page).toHaveURL(/\/simulador$/)
  })

  test('SIM-06 mostra a referência de mercado do Banco Central @regressao', async ({
    simulador,
  }) => {
    // Bug corrigido: o período "Set-2026" aparecia como 01/01/2026
    await expect(simulador.referencia).toContainText('Banco Central')
    await expect(simulador.referencia).toContainText('5,13% a.m.')

    await simulador.produto('Garantia de imóvel')
    await expect(simulador.referencia).toContainText('set/2026')
    await expect(simulador.referencia).not.toContainText('01/01/2026')
  })
})

test.describe('Simulador · Banco Central fora do ar', () => {
  test.use({ bcbFora: true })

  test('SIM-07 usa a taxa padrão e oferece tentar de novo @regressao', async ({
    simulador,
    page,
  }) => {
    await simulador.abrir()
    await expect(page.getByText('Banco Central não respondeu')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
    await expect(page.locator('#taxa')).toHaveValue('5')
  })
})

test.describe('Simulador · produtos', () => {
  test.beforeEach(async ({ clientes, simulador }) => {
    await clientes.abrir()
    await clientes.cadastrar(umCliente({ nome: 'Cliente Produtos' }))
    await simulador.abrir()
    await simulador.cliente('Cliente Produtos')
  })

  test('SIM-10 consignado limita a parcela a 35% da renda @regressao', async ({ simulador }) => {
    await simulador.produto('Consignado')
    await simulador.consignado('inss', 3000)
    await simulador.parametros({ valor: 50000, taxa: 1.8, prazo: 24 })
    await expect(
      simulador
        .erroDo('renda')
        .or(simulador.pendencias.filter({ hasText: /margem|renda/i }))
        .first(),
    ).toBeVisible()
    await expect(simulador.botaoContratar()).toBeDisabled()

    await simulador.parametros({ valor: 10000, prazo: 84 })
    await expect(simulador.botaoContratar()).toBeEnabled()
  })

  test('SIM-11 veículo: valor máximo é 70% da FIPE @regressao', async ({ simulador }) => {
    await simulador.produto('Garantia de veículo')
    await simulador.veiculo()
    // FIPE simulada: R$ 54.246,00 → 70% = R$ 37.972,20
    await simulador.parametros({ valor: 37972.21, taxa: 1.9, prazo: 36 })
    await expect(simulador.erroDo('valor')).toContainText('R$ 37.972,20')
    await simulador.parametros({ valor: 37972.2 })
    await expect(simulador.botaoContratar()).toBeEnabled()
  })

  test('SIM-12 veículo com mais de 15 anos não é aceito @regressao', async ({
    simulador,
    page,
  }) => {
    await simulador.produto('Garantia de veículo')
    await simulador.veiculo({ ano: '2008 Gasolina' })
    await expect(page.locator('.field-error', { hasText: 'mais de 15 anos' })).toBeVisible()
    await expect(simulador.botaoContratar()).toBeDisabled()
  })

  test('SIM-13 veículo zero km aparece como "Zero km", não 32000 @regressao', async ({
    simulador,
    page,
  }) => {
    await simulador.produto('Garantia de veículo')
    await page.locator('#placa').fill('ABC1D23')
    await page.locator('#marca').selectOption({ label: 'Fiat' })
    await page.locator('#modelo').selectOption({ label: 'ARGO 1.0 6V Flex' })
    await expect(page.locator('#anoModelo option', { hasText: 'Zero km' })).toHaveCount(1)
    await expect(page.locator('#anoModelo option', { hasText: '32000' })).toHaveCount(0)
  })

  test('SIM-14 placa inválida bloqueia a contratação @regressao', async ({ simulador }) => {
    await simulador.produto('Garantia de veículo')
    await simulador.veiculo({ placa: 'AB12345' })
    await expect(simulador.botaoContratar()).toBeDisabled()
  })

  test('SIM-15 imóvel: valor máximo é 60% do imóvel e prazo até 240 @regressao', async ({
    simulador,
  }) => {
    await simulador.produto('Garantia de imóvel')
    await simulador.imovel(500000)
    await simulador.parametros({ valor: 300000.01, taxa: 1.2, prazo: 241 })
    await expect(simulador.erroDo('valor')).toContainText('R$ 300.000,00')
    await expect(simulador.erroDo('prazo')).toHaveText('De 1 a 240 meses.')

    await simulador.parametros({ valor: 300000, prazo: 240 })
    await expect(simulador.botaoContratar()).toBeEnabled()
  })

  test('SIM-16 Pix parcelado financia o IOF e envia o valor cheio @regressao', async ({
    simulador,
  }) => {
    // Decisão do bug #3: o cliente recebe o valor do Pix; o IOF entra no financiado
    const contratacao = hojeIso()
    await simulador.produto('Pix parcelado')
    await simulador.parametros({ valor: 1000, taxa: 6.5, prazo: 6, contratacao })

    const esperado = simularEsperado({
      valor: 1000,
      taxaMensal: 0.065,
      prazo: 6,
      sistema: 'PRICE',
      contratacao,
      iofFinanciado: true,
    })
    expect(await simulador.kpi('Valor enviado')).toBe(1000)
    expect(await simulador.resumo('Valor financiado')).toContain(
      esperado.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    )
    expect(await simulador.kpi('Parcela')).toBe(esperado.parcelas[0].valor)
  })
})

test.describe('Simulador · busca de cliente', () => {
  test('SIM-17 acha o cliente por nome completo, CPF ou número @regressao', async ({
    clientes,
    simulador,
    page,
  }) => {
    const c = umCliente()
    c.nome = `Joana Álvares ${c.nome}`
    await clientes.abrir()
    await clientes.cadastrar(c)
    const numero = (await clientes.item(c.nome).innerText()).match(/Nº (\d{7})/)![1]

    await simulador.abrir()
    const sugestoes = page
      .getByRole('listbox', { name: 'Clientes encontrados' })
      .getByRole('option')
    const campo = page.getByRole('combobox', { name: 'Cliente' })

    // nome sem acento e fora de ordem
    await campo.fill(`alvares joana ${c.nome.split(' ').at(-1)}`.toLowerCase())
    await expect(sugestoes).toHaveText([new RegExp(c.nome)])

    await campo.fill(c.cpf)
    await expect(sugestoes).toHaveText([new RegExp(c.nome)])

    await campo.fill(numero)
    await expect(sugestoes.first()).toContainText(c.nome)
    await campo.press('Enter')
    await expect(page.getByTestId('cliente-escolhido')).toContainText(`Nº ${numero}`)
  })
})
