import { expect, type Page } from '@playwright/test'
import { lerReais } from '../utils/dinheiro'

export class ContratosPage {
  readonly linhas

  constructor(private readonly page: Page) {
    this.linhas = page.locator('a.row-link')
  }

  async abrir() {
    await this.page.goto('/contratos')
    await expect(this.page.getByRole('heading', { name: 'Contratos', level: 1 })).toBeVisible()
  }

  async filtrar(rotulo: string) {
    await this.page.locator('.tab', { hasText: rotulo }).click()
  }

  async abrirContratoDe(nome: string) {
    await this.linhas.filter({ hasText: nome }).first().click()
    await expect(this.page).toHaveURL(/\/contratos\/[^/]+$/)
  }
}

export class ContratoDetalhePage {
  constructor(private readonly page: Page) {}

  titulo() {
    return this.page.getByRole('heading', { level: 1 })
  }

  async kpi(rotulo: string) {
    return this.page
      .locator('.kpi', { has: this.page.getByText(rotulo, { exact: true }) })
      .locator('strong')
      .innerText()
  }

  linhaParcela(numero: number) {
    return this.page
      .locator('section', { hasText: /^Parcelas ·/ })
      .locator('tbody tr')
      .filter({ has: this.page.locator('td:first-child', { hasText: new RegExp(`^${numero}$`) }) })
  }

  async iniciarPagamento(numero: number) {
    await this.linhaParcela(numero).getByRole('button', { name: 'Pagar' }).click()
    await expect(
      this.page.getByRole('heading', { name: `Pagamento da parcela ${numero}` }),
    ).toBeVisible()
  }

  async dataPagamento(iso: string) {
    await this.page.locator('#dataPagamento').fill(iso)
  }

  async encargos() {
    const dd = async (rotulo: string) =>
      this.page
        .locator('.card-highlight .resume > div', {
          has: this.page.locator('dt', { hasText: rotulo }),
        })
        .locator('dd')
        .innerText()
    return {
      dias: Number(await dd('Dias em atraso')),
      multa: lerReais(await dd('Multa')),
      mora: lerReais(await dd('Juros de mora')),
      total: lerReais(await dd('Total')),
    }
  }

  async confirmarPagamento(numero: number) {
    await this.page.getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(this.page.locator('.toast')).toContainText(`Parcela ${numero} paga`)
  }

  async excluir() {
    await this.page.getByRole('button', { name: 'Excluir contrato' }).click()
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Sim, excluir' }).click()
    await expect(this.page).toHaveURL(/\/contratos$/)
  }
}
