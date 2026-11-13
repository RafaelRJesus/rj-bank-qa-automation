import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '../../src/fixtures'

const ROTAS = ['/', '/clientes', '/simulador', '/contratos']

async function violacoes(page: Page, regras?: string[]) {
  const axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])
  const { violations } = await (regras ? axe.withRules(regras) : axe).analyze()
  return violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)
}

for (const rota of ROTAS) {
  test(`A11Y-01 ${rota} sem violações graves de estrutura (WCAG A/AA) @a11y`, async ({ page }) => {
    await page.goto(rota)
    await page.locator('main h1').waitFor()
    const graves = await violacoes(page)
    expect(graves.filter((v) => !v.startsWith('color-contrast'))).toEqual([])
  })

  test(`A11Y-02 ${rota} contraste de cores (WCAG 1.4.3) @a11y`, async ({ page }) => {
    test.fail(
      true,
      'BUG-A11Y-01: cinza #8a94a6 e botão #00a868 abaixo de 4.5:1 (ver PLANO_DE_TESTES)',
    )
    await page.goto(rota)
    await page.locator('main h1').waitFor()
    expect(await violacoes(page, ['color-contrast'])).toEqual([])
  })
}
