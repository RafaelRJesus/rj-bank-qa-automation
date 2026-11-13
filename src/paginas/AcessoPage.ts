import { expect, type Page } from '@playwright/test'

export const ADMIN_LOCAL = { email: 'admin@rjbank.test', senha: 'admin123' }

export class AcessoPage {
  constructor(private readonly page: Page) {}

  campo(rotulo: string) {
    return this.page.getByLabel(new RegExp(`^${rotulo}\\*?$`))
  }

  async entrar(email: string, senha: string) {
    await this.page.goto('/entrar')
    await this.campo('E-mail').fill(email)
    await this.campo('Senha').fill(senha)
    await this.page.getByRole('button', { name: 'Entrar' }).click()
  }

  async entrarComSucesso(email: string, senha: string) {
    await this.entrar(email, senha)
    await expect(this.page.locator('.usuario')).toContainText(email)
  }

  async criarConta(email: string, senha: string, confirmacao = senha) {
    await this.page.goto('/criar-conta')
    await this.campo('E-mail').fill(email)
    await this.campo('Senha').fill(senha)
    await this.campo('Repita a senha').fill(confirmacao)
    await this.page.getByRole('button', { name: 'Criar conta' }).click()
  }

  async informarCpf(nome: string, cpf: string) {
    await this.campo('Nome').fill(nome)
    await this.campo('CPF').fill(cpf)
    await this.page.getByRole('button', { name: 'Continuar' }).click()
  }

  async ativarGestor(nome: string) {
    await this.campo('Seu nome').fill(nome)
    await this.page.getByRole('button', { name: 'Ativar acesso' }).click()
  }

  async sair() {
    await this.page.locator('.usuario').getByRole('button', { name: 'Sair' }).click()
    await expect(this.page).toHaveURL(/\/entrar$/)
  }

  usuario() {
    return this.page.locator('.usuario')
  }

  erro() {
    return this.page.locator('.field-error')
  }
}
