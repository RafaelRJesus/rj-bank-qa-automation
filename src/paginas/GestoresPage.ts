import { expect, type Page } from '@playwright/test'

export class GestoresPage {
  readonly lista

  constructor(private readonly page: Page) {
    this.lista = page.locator('.list-item')
  }

  async abrir() {
    await this.page.goto('/gestores')
    await expect(this.page.getByRole('heading', { name: 'Gestores', level: 1 })).toBeVisible()
  }

  async cadastrar(nome: string, email: string) {
    await this.page.getByLabel(/^Nome\*?$/).fill(nome)
    await this.page.getByLabel(/^E-mail\*?$/).fill(email)
    await this.page.getByRole('button', { name: 'Cadastrar gestor' }).click()
    await expect(this.item(email)).toBeVisible()
  }

  item(email: string) {
    return this.lista.filter({ hasText: email })
  }

  async remover(email: string) {
    await this.item(email).getByRole('button', { name: 'Remover' }).click()
    await this.item(email).getByRole('button', { name: 'Sim, remover' }).click()
    await expect(this.item(email)).toHaveCount(0)
  }
}
