import { expect, type Page } from '@playwright/test'
import { lerReais } from '../utils/dinheiro'

export type Produto =
  'Crédito pessoal' | 'Consignado' | 'Garantia de veículo' | 'Garantia de imóvel' | 'Pix parcelado'

export interface Parametros {
  valor?: number
  taxa?: number
  prazo?: number
  sistema?: 'PRICE' | 'SAC'
  contratacao?: string
}

export class SimuladorPage {
  readonly pendencias
  readonly cronograma
  readonly referencia

  constructor(private readonly page: Page) {
    this.pendencias = page.locator('.pendencias li')
    this.cronograma = page
      .locator('section', { hasText: 'Cronograma de parcelas' })
      .locator('tbody tr')
    this.referencia = page.locator('.referencia')
  }

  async abrir() {
    await this.page.goto('/simulador')
    await expect(this.page.getByRole('heading', { name: 'Simulador de crédito' })).toBeVisible()
  }

  async produto(nome: Produto) {
    const aba = this.page.getByRole('tab', { name: nome })
    await aba.click()
    await expect(aba).toHaveAttribute('aria-selected', 'true')
  }

  async cliente(nome: string) {
    const select = this.page.locator('#clienteId')
    const valor = await select.locator('option', { hasText: nome }).getAttribute('value')
    await select.selectOption(valor!)
  }

  async parametros(p: Parametros) {
    if (p.valor !== undefined) await this.page.locator('#valor').fill(String(p.valor))
    if (p.taxa !== undefined) await this.page.locator('#taxa').fill(String(p.taxa))
    if (p.prazo !== undefined) await this.page.locator('#prazo').fill(String(p.prazo))
    if (p.sistema) await this.page.locator('#sistema').selectOption(p.sistema)
    if (p.contratacao) await this.page.locator('#dataContratacao').fill(p.contratacao)
  }

  erroDo(id: string) {
    return this.page.locator('.field', { has: this.page.locator(`#${id}`) }).locator('.field-error')
  }

  async kpi(rotulo: string) {
    const kpi = this.page.locator('.kpi', { has: this.page.getByText(rotulo, { exact: true }) })
    return lerReais(await kpi.locator('strong').innerText())
  }

  async resumo(rotulo: string | RegExp) {
    const linha = this.page.locator('.resume > div', {
      has: this.page.locator('dt', { hasText: rotulo }),
    })
    return linha.locator('dd').innerText()
  }

  async parcelas() {
    const linhas = await this.cronograma.all()
    return Promise.all(
      linhas.map(async (tr) => {
        const td = tr.locator('td')
        return {
          numero: Number(await td.nth(0).innerText()),
          vencimento: await td.nth(1).innerText(),
          valor: lerReais(await td.nth(2).innerText()),
          juros: lerReais(await td.nth(3).innerText()),
          amortizacao: lerReais(await td.nth(4).innerText()),
          saldo: lerReais(await td.nth(5).innerText()),
        }
      }),
    )
  }

  botaoContratar() {
    return this.page.getByRole('button', { name: 'Contratar' })
  }

  async contratar() {
    await this.botaoContratar().click()
    await expect(this.page).toHaveURL(/\/contratos\/[^/]+$/)
  }

  // Garantia de veículo
  async veiculo({ placa = 'ABC1D23', ano = '2021 Flex' }: { placa?: string; ano?: string } = {}) {
    await this.page.locator('#placa').fill(placa)
    await this.page.locator('#marca').selectOption({ label: 'Fiat' })
    await this.page.locator('#modelo').selectOption({ label: 'ARGO 1.0 6V Flex' })
    await this.page.locator('#anoModelo').selectOption({ label: ano })
    await expect(this.page.locator('.garantia-box')).toContainText('FIPE')
  }

  // Garantia de imóvel
  async imovel(valorImovel: number) {
    await this.page.locator('#valorImovel').fill(String(valorImovel))
  }

  // Consignado
  async consignado(convenio: 'inss' | 'publico' | 'privado', renda: number) {
    await this.page.locator('#convenio').selectOption(convenio)
    await this.page.locator('#renda').fill(String(renda))
  }
}
