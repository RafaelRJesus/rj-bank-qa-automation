import { expect, test } from '@playwright/test'
import {
  cetMensal,
  cronograma,
  encargosAtraso,
  pmt,
  simularEsperado,
  somarMeses,
} from '../../src/oraculo/credito'

// Valores de referência de livros de matemática financeira / calculadoras
// públicas (ex.: Calculadora do Cidadão do Banco Central).
test.describe('Oráculo de cálculo @oraculo', () => {
  test('PMT Price: R$ 10.000 a 2% a.m. em 12x = R$ 945,60', () => {
    expect(pmt(10_000, 0.02, 12)).toBeCloseTo(945.6, 2)
  })

  test('PMT Price: R$ 100.000 a 1% a.m. em 360x = R$ 1.028,61', () => {
    expect(pmt(100_000, 0.01, 360)).toBeCloseTo(1028.61, 2)
  })

  test('Price fecha o saldo em zero e amortiza o principal exato', () => {
    const p = cronograma(10_000, 0.02, 12, 'PRICE', '2026-01-31')
    expect(p.at(-1)!.saldo).toBe(0)
    expect(p.reduce((s, x) => s + x.amortizacao, 0)).toBeCloseTo(10_000, 2)
  })

  test('SAC: amortização constante e parcela decrescente', () => {
    const p = cronograma(12_000, 0.01, 12, 'SAC', '2026-01-10')
    expect(p[0].amortizacao).toBe(1000)
    expect(p[0].valor).toBe(1120)
    expect(p.at(-1)!.valor).toBe(1010)
  })

  test('vencimentos respeitam o último dia do mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2028-01-31', 1)).toBe('2028-02-29')
  })

  test('CET sem custos é igual à taxa nominal', () => {
    const p = cronograma(10_000, 0.03, 24, 'PRICE', '2026-01-10')
    expect(cetMensal(10_000, p)).toBeCloseTo(0.03, 6)
  })

  test('encargos: multa 2% + mora 1% a.m. pro rata', () => {
    expect(encargosAtraso(1000, '2026-03-10', '2026-03-25')).toEqual({
      dias: 15,
      multa: 20,
      mora: 5,
      total: 1025,
    })
    expect(encargosAtraso(1000, '2026-03-10', '2026-03-01').total).toBe(1000)
  })

  test('IOF financiado: quem recebe fica com o valor pedido', () => {
    const r = simularEsperado({
      valor: 500,
      taxaMensal: 0.065,
      prazo: 6,
      sistema: 'PRICE',
      contratacao: '2026-01-15',
      iofFinanciado: true,
    })
    expect(r.liberado).toBe(500)
    expect(r.principal).toBeCloseTo(500 + r.iof, 2)
  })
})
