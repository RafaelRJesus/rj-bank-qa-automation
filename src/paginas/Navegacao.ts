import type { Page } from '@playwright/test'

export type Area = 'Visão geral' | 'Clientes' | 'Simulador de crédito' | 'Contratos'

export class Navegacao {
  constructor(private readonly page: Page) {}

  async ir(area: Area) {
    await this.page.getByRole('navigation').getByRole('link', { name: area, exact: true }).click()
  }

  linkAtivo() {
    return this.page.locator('nav a.active')
  }

  rodape() {
    return this.page.locator('.sidebar-footer')
  }
}
