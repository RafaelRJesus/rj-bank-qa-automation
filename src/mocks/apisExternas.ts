import type { Page, Route } from '@playwright/test'
import { CEP_INEXISTENTE, CEP_SE, FIPE, TAXAS_BCB } from './dados'

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })

const linhas = (tabela: Record<string, number[]>) =>
  Object.entries(tabela).flatMap(([Modalidade, taxas]) =>
    taxas.map((TaxaJurosAoMes) => ({ Modalidade, TaxaJurosAoMes })),
  )

/** Simula CEP, FIPE e Banco Central com respostas fixas e realistas. */
export async function simularApisExternas(page: Page, opcoes: { bcbFora?: boolean } = {}) {
  await page.route('**/brasilapi.com.br/api/cep/**', (route) =>
    route.request().url().includes(CEP_INEXISTENTE)
      ? json(route, { message: 'CEP não encontrado' }, 404)
      : json(route, CEP_SE),
  )
  await page.route('**/viacep.com.br/**', (route) =>
    route.request().url().includes(CEP_INEXISTENTE)
      ? json(route, { erro: true })
      : json(route, {
          logradouro: CEP_SE.street,
          bairro: CEP_SE.neighborhood,
          localidade: CEP_SE.city,
          uf: CEP_SE.state,
        }),
  )

  await page.route('**/parallelum.com.br/fipe/**', (route) => {
    const url = route.request().url()
    if (url.endsWith('/marcas')) return json(route, FIPE.marcas)
    if (url.endsWith('/modelos')) return json(route, FIPE.modelos)
    if (url.endsWith('/anos')) return json(route, FIPE.anos)
    const ano = Number(url.split('/').pop()!.split('-')[0])
    return json(route, FIPE.preco(ano === 32000 ? new Date().getFullYear() : ano))
  })

  await page.route('**/olinda.bcb.gov.br/**', (route) => {
    if (opcoes.bcbFora) return route.abort()
    const url = decodeURIComponent(route.request().url())
    const ultimo = /\$top=1(&|$)/.test(url)
    if (url.includes('TaxasJurosDiariaPorInicioPeriodo')) {
      return json(route, { value: ultimo ? [TAXAS_BCB.semanal] : linhas(TAXAS_BCB.linhasSemanais) })
    }
    return json(route, { value: ultimo ? [TAXAS_BCB.mensal] : linhas(TAXAS_BCB.linhasMensais) })
  })
}
