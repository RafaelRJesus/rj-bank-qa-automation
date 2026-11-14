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
    // BUG-A11Y-01 corrigido na repaginação de 13/11/2026 (nova paleta)
    await page.goto(rota)
    await page.locator('main h1').waitFor()
    expect(await violacoes(page, ['color-contrast'])).toEqual([])
  })
}

test.describe('Página de entrada (sem login)', () => {
  test.use({ logado: false })

  test('A11Y-03 página de entrada sem violações graves, contraste incluído @a11y', async ({
    page,
  }) => {
    // sem a animação de entrada: no meio do fade o axe mede contraste de texto semitransparente
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('heading', { level: 1 }).waitFor()
    expect(await violacoes(page)).toEqual([])
  })
})
