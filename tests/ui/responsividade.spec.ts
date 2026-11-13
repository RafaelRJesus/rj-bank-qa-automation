import { expect, test } from '../../src/fixtures'

for (const rota of ['/', '/clientes', '/simulador', '/contratos']) {
  test(`RESP-01 ${rota} sem rolagem horizontal @mobile @regressao`, async ({ page }) => {
    // Bug corrigido: grid estourava a largura no celular
    await page.goto(rota)
    await page.locator('main h1').waitFor()
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(sobra).toBeLessThanOrEqual(1)
  })
}
