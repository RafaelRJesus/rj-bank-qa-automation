import { expect, test, type APIRequestContext } from '@playwright/test'
import { TAXAS_BCB } from '../../src/mocks/dados'

// Testes de contrato: confirmam que as APIs públicas ainda respondem no formato
// que o app e os mocks (src/mocks/dados.ts) assumem. Rodam contra a internet real.
test.describe('Contrato das APIs externas @contrato', () => {
  test.describe.configure({ retries: 2, timeout: 90_000 })

  test('API-01 BrasilAPI CEP v2 devolve rua, bairro, cidade e UF', async ({ request }) => {
    const r = await request.get('https://brasilapi.com.br/api/cep/v2/01001000')
    expect(r.status()).toBe(200)
    expect(await r.json()).toMatchObject({
      cep: '01001000',
      street: expect.any(String),
      neighborhood: expect.any(String),
      city: 'São Paulo',
      state: 'SP',
    })
  })

  test('API-02 BrasilAPI responde 404 para CEP inexistente', async ({ request }) => {
    const r = await request.get('https://brasilapi.com.br/api/cep/v2/99999999')
    expect(r.status()).toBe(404)
  })

  test('API-03 ViaCEP (fallback) mantém os campos usados', async ({ request }) => {
    const r = await request.get('https://viacep.com.br/ws/01001000/json/')
    expect(r.status()).toBe(200)
    expect(await r.json()).toMatchObject({
      logradouro: expect.any(String),
      bairro: expect.any(String),
      localidade: 'São Paulo',
      uf: 'SP',
    })
    const inexistente = await (await request.get('https://viacep.com.br/ws/99999999/json/')).json()
    expect(inexistente).toMatchObject({ erro: expect.anything() })
  })

  test('API-04 FIPE: marcas → modelos → anos → preço', async ({ request }) => {
    const base = 'https://parallelum.com.br/fipe/api/v1/carros'
    const marcas = await (await request.get(`${base}/marcas`)).json()
    expect(marcas.length).toBeGreaterThan(10)
    expect(marcas[0]).toMatchObject({ codigo: expect.any(String), nome: expect.any(String) })

    const fiat = marcas.find((m: { nome: string }) => m.nome === 'Fiat')
    const { modelos } = await (await request.get(`${base}/marcas/${fiat.codigo}/modelos`)).json()
    expect(modelos[0]).toMatchObject({ codigo: expect.any(Number), nome: expect.any(String) })

    const anos = await (
      await request.get(`${base}/marcas/${fiat.codigo}/modelos/${modelos[0].codigo}/anos`)
    ).json()
    expect(anos[0].codigo).toMatch(/^\d{4,5}-\d$/)

    const preco = await (
      await request.get(
        `${base}/marcas/${fiat.codigo}/modelos/${modelos[0].codigo}/anos/${anos[0].codigo}`,
      )
    ).json()
    expect(preco).toMatchObject({
      Valor: expect.stringMatching(/^R\$ [\d.]+,\d{2}$/),
      AnoModelo: expect.any(Number),
      CodigoFipe: expect.any(String),
      MesReferencia: expect.any(String),
    })
  })

  const OLINDA = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata'

  const get = async (request: APIRequestContext, consulta: string) => {
    const r = await request.get(`${OLINDA}/${consulta}`, { timeout: 60_000 })
    expect(r.status()).toBe(200)
    return (await r.json()).value as Record<string, unknown>[]
  }

  test('API-05 Banco Central: semana mais recente traz as modalidades usadas', async ({
    request,
  }) => {
    const [ultimo] = await get(
      request,
      'TaxasJurosDiariaPorInicioPeriodo?$top=1&$orderby=InicioPeriodo desc&$format=json',
    )
    expect(ultimo.InicioPeriodo).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const filtro = `InicioPeriodo eq '${ultimo.InicioPeriodo}' and Segmento eq 'PESSOA FÍSICA'`
    const linhas = await get(
      request,
      `TaxasJurosDiariaPorInicioPeriodo?$filter=${encodeURIComponent(filtro)}&$top=5000&$format=json&$select=Modalidade,TaxaJurosAoMes`,
    )
    expect(linhas[0]).toMatchObject({
      Modalidade: expect.any(String),
      TaxaJurosAoMes: expect.any(Number),
    })
    const existentes = new Set(linhas.map((l) => l.Modalidade))
    for (const modalidade of Object.keys(TAXAS_BCB.linhasSemanais)) {
      expect.soft(existentes.has(modalidade), modalidade).toBe(true)
    }
  })

  test('API-06 Banco Central: série mensal do imobiliário usa "Mmm-AAAA"', async ({ request }) => {
    const [ultimo] = await get(
      request,
      'TaxasJurosMensalPorMes?$top=1&$orderby=anoMes desc&$format=json',
    )
    // Formato que causou o bug do período exibido como 01/01/AAAA
    expect(ultimo.Mes).toMatch(/^[A-Z][a-z]{2}-\d{4}$/)
    expect(ultimo.anoMes).toMatch(/^\d{4}-\d{2}$/)

    const linhas = await get(
      request,
      `TaxasJurosMensalPorMes?$filter=${encodeURIComponent(`anoMes eq '${ultimo.anoMes}'`)}&$top=5000&$format=json&$select=Modalidade,TaxaJurosAoMes`,
    )
    const existentes = new Set(linhas.map((l) => l.Modalidade))
    for (const modalidade of Object.keys(TAXAS_BCB.linhasMensais)) {
      expect(existentes.has(modalidade), modalidade).toBe(true)
    }
  })
})
