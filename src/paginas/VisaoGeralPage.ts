import { expect, type Page } from '@playwright/test'

export class VisaoGeralPage {
  constructor(private readonly page: Page) {}

  async abrir() {
    await this.page.goto('/')
    await expect(this.page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
    // A tela não mostra "carregando" nos KPIs: espera os dados chegarem.
    await this.page.waitForLoadState('networkidle')
    const vencimentos = this.page.locator('section', { hasText: 'Próximos vencimentos' })
    await expect(vencimentos.locator('.empty, .list-item').first()).toBeVisible()
  }

  kpi(rotulo: string) {
    return this.page
      .locator('.kpi', { has: this.page.getByText(rotulo, { exact: true }) })
      .locator('strong')
  }

  proximosVencimentos() {
    return this.page.locator('section', { hasText: 'Próximos vencimentos' }).locator('.list-item')
  }
}
