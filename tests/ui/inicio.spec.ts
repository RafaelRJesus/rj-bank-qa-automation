import { expect, test } from '../../src/fixtures'
import { simularEsperado } from '../../src/oraculo/credito'
import { hojeIso } from '../../src/utils/dinheiro'

test.describe('Página de entrada', () => {
  test.use({ logado: false })

  test('INI-01 apresenta o banco e leva para abrir conta e entrar @smoke @mobile', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Crédito que você entende antes de contratar.',
    )
    await page.getByRole('link', { name: 'Abrir conta' }).first().click()
    await expect(page).toHaveURL(/\/criar-conta$/)
    await page.goto('/')
    await page.getByRole('link', { name: 'Entrar', exact: true }).first().click()
    await expect(page).toHaveURL(/\/entrar$/)
  })

  test('INI-02 Pix parcelado do celular calcula como o oráculo @regressao', async ({ page }) => {
    await page.goto('/')
    const celular = page.getByRole('figure', { name: 'Tela do app: Pix parcelado' })
    await celular.getByRole('slider', { name: 'Quanto você quer enviar' }).fill('2000')
    await celular.getByRole('radio', { name: '10x' }).click()

    const esperado = simularEsperado({
      valor: 2000,
      taxaMensal: 0.065,
      prazo: 10,
      sistema: 'PRICE',
      contratacao: hojeIso(),
      iofFinanciado: true,
    })
    const brl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    await expect(celular).toContainText(`10x de R$ ${brl(esperado.parcelas[0].valor)}`)
    await expect(celular).toContainText(`Total R$ ${brl(esperado.total)}`)
  })

  test('INI-03 limites dos produtos na página batem com o simulador @regressao', async ({
    page,
  }) => {
    await page.goto('/')
    const linha = (produto: string) =>
      page.locator('#produtos tbody tr', { has: page.getByText(produto, { exact: true }) })
    await expect(linha('Garantia de imóvel')).toContainText('até 240 meses')
    await expect(linha('Pix parcelado')).toContainText('R$ 50 a R$ 10.000')
    await expect(linha('Consignado')).toContainText('até 84 meses')
  })
})
