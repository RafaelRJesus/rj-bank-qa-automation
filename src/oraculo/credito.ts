/**
 * Oráculo de cálculo: fórmulas financeiras escritas de forma independente
 * do código do app, para conferir os valores exibidos na tela.
 * Se app e oráculo divergirem, um dos dois está errado — e o teste mostra.
 */

export type Sistema = 'PRICE' | 'SAC'

export interface ParcelaEsperada {
  numero: number
  vencimento: string
  valor: number
  juros: number
  amortizacao: number
  saldo: number
}

const IOF_DIARIO_PF = 0.0082 / 100
const IOF_ADICIONAL = 0.38 / 100
const MULTA = 0.02
const MORA_MENSAL = 0.01

export const centavos = (n: number) => Math.round(n * 100) / 100

export function somarMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1))
  const ultimoDia = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0),
  ).getUTCDate()
  alvo.setUTCDate(Math.min(dia, ultimoDia))
  return alvo.toISOString().slice(0, 10)
}

export const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000)

/** PMT da tabela Price. */
export function pmt(principal: number, taxa: number, n: number): number {
  if (taxa === 0) return principal / n
  const fator = Math.pow(1 + taxa, n)
  return (principal * taxa * fator) / (fator - 1)
}

export function cronograma(
  principal: number,
  taxa: number,
  n: number,
  sistema: Sistema,
  contratacao: string,
): ParcelaEsperada[] {
  const parcelas: ParcelaEsperada[] = []
  let saldo = principal
  for (let k = 1; k <= n; k++) {
    const juros = centavos(saldo * taxa)
    let amortizacao =
      sistema === 'SAC' ? centavos(principal / n) : centavos(pmt(principal, taxa, n) - juros)
    if (k === n) amortizacao = centavos(saldo)
    saldo = centavos(saldo - amortizacao)
    parcelas.push({
      numero: k,
      vencimento: somarMeses(contratacao, k),
      valor: centavos(juros + amortizacao),
      juros,
      amortizacao,
      saldo,
    })
  }
  return parcelas
}

/** IOF de pessoa física: diário (até 365 dias) sobre cada amortização + adicional. */
export function iof(parcelas: ParcelaEsperada[], contratacao: string): number {
  let total = 0
  for (const p of parcelas) {
    const dias = Math.min(diasEntre(contratacao, p.vencimento), 365)
    total += p.amortizacao * (IOF_ADICIONAL + IOF_DIARIO_PF * dias)
  }
  return centavos(total)
}

/** Taxa interna de retorno mensal pelo método de Newton. */
export function cetMensal(valorLiberado: number, parcelas: { valor: number }[]): number {
  let taxa = 0.02
  for (let i = 0; i < 100; i++) {
    let vp = -valorLiberado
    let derivada = 0
    parcelas.forEach((p, idx) => {
      const t = idx + 1
      vp += p.valor / Math.pow(1 + taxa, t)
      derivada -= (t * p.valor) / Math.pow(1 + taxa, t + 1)
    })
    const proxima = taxa - vp / derivada
    if (Math.abs(proxima - taxa) < 1e-12) return proxima
    taxa = proxima
  }
  return taxa
}

export function encargosAtraso(valorParcela: number, vencimento: string, pagamento: string) {
  const dias = Math.max(0, diasEntre(vencimento, pagamento))
  if (dias === 0) return { dias, multa: 0, mora: 0, total: valorParcela }
  const multa = centavos(valorParcela * MULTA)
  const mora = centavos(((valorParcela * MORA_MENSAL) / 30) * dias)
  return { dias, multa, mora, total: centavos(valorParcela + multa + mora) }
}

/** Simulação completa, opcionalmente com IOF financiado (Pix parcelado). */
export function simularEsperado(args: {
  valor: number
  taxaMensal: number
  prazo: number
  sistema: Sistema
  contratacao: string
  iofFinanciado?: boolean
}) {
  const { valor, taxaMensal, prazo, sistema, contratacao, iofFinanciado } = args
  let principal = valor
  if (iofFinanciado) {
    const aliquota =
      iof(cronograma(valor, taxaMensal, prazo, sistema, contratacao), contratacao) / valor
    principal = centavos(valor / (1 - aliquota))
  }
  const parcelas = cronograma(principal, taxaMensal, prazo, sistema, contratacao)
  const valorIof = iofFinanciado ? centavos(principal - valor) : iof(parcelas, contratacao)
  const liberado = iofFinanciado ? valor : centavos(valor - valorIof)
  const total = centavos(parcelas.reduce((s, p) => s + p.valor, 0))
  return {
    parcelas,
    principal,
    iof: valorIof,
    liberado,
    total,
    juros: centavos(total - principal),
    cetMensal: cetMensal(liberado, parcelas),
  }
}
