import { expect, type Page } from '@playwright/test'
import type { DadosCliente } from '../dados/cliente'

export class ClientesPage {
  readonly toast
  readonly lista

  constructor(private readonly page: Page) {
    this.toast = page.locator('.toast')
    this.lista = page.locator('.list-item')
  }

  async abrir() {
    await this.page.goto('/clientes')
    await expect(this.page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible()
  }

  campo(rotulo: string) {
    // campos obrigatórios têm um "*" no rótulo
    return this.page.getByLabel(new RegExp(`^${rotulo}\\*?$`))
  }

  erroDo(rotulo: string) {
    return this.page.locator('.field', { has: this.campo(rotulo) }).locator('.field-error')
  }

  /** Preenche o formulário e espera o CEP completar o endereço. */
  async preencher(c: DadosCliente, { esperarEndereco = true } = {}) {
    await this.campo('Nome').fill(c.nome)
    await this.campo('CPF').fill(c.cpf)
    await this.campo('E-mail').fill(c.email)
    await this.campo('Telefone').fill(c.telefone)
    await this.campo('CEP').fill(c.cep)
    if (esperarEndereco) await expect(this.campo('Cidade')).not.toHaveValue('')
    await this.campo('Número').fill(c.numero)
    if (c.complemento) await this.campo('Complemento').fill(c.complemento)
  }

  async enviar() {
    await this.page.getByRole('button', { name: 'Cadastrar' }).click()
  }

  async cadastrar(c: DadosCliente) {
    await this.preencher(c)
    await this.enviar()
    await expect(this.item(c.nome)).toBeVisible()
  }

  item(nome: string) {
    return this.lista.filter({ hasText: nome })
  }

  async buscar(termo: string) {
    await this.page.getByPlaceholder(/^Buscar por nome/).fill(termo)
  }

  botaoRemover(nome: string) {
    return this.item(nome).getByRole('button', { name: 'Remover' })
  }

  async remover(nome: string) {
    await this.botaoRemover(nome).click()
    await this.item(nome).getByRole('button', { name: 'Sim, remover' }).click()
    await expect(this.item(nome)).toHaveCount(0)
  }
}
