import { expect, test } from '../../src/fixtures'

test.describe('Navegação', () => {
  test('NAV-01 menu leva a todas as áreas e marca a ativa @smoke @mobile', async ({
    page,
    nav,
  }) => {
    await page.goto('/')
    for (const area of ['Clientes', 'Simulador de crédito', 'Contratos', 'Visão geral'] as const) {
      await nav.ir(area)
      await expect(nav.linkAtivo()).toHaveText(area)
    }
  })

  test('NAV-02 rota direta funciona sem 404 (SPA rewrite) @regressao', async ({ page }) => {
    const resp = await page.goto('/contratos')
    expect(resp?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Contratos', level: 1 })).toBeVisible()
  })

  test('NAV-03 contrato inexistente mostra aviso @regressao', async ({ page }) => {
    await page.goto('/contratos/nao-existe')
    await expect(page.locator('.empty')).toBeVisible()
  })

  test('NAV-04 abas de produto funcionam pelo teclado @regressao', async ({ page, simulador }) => {
    // Bug corrigido: abas não respondiam ao teclado
    await simulador.abrir()
    await page.getByRole('tab', { name: 'Consignado' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('tab', { name: 'Consignado' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
