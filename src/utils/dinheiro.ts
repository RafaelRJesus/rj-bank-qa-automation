/** "R$ 1.234,56" -> 1234.56 */
export function lerReais(texto: string): number {
  const limpo = texto.replace(/[^\d,-]/g, '').replace(',', '.')
  const n = Number(limpo)
  if (!Number.isFinite(n)) throw new Error(`Valor monetário inválido: "${texto}"`)
  return n
}

/** "5,13%" -> 0.0513 */
export function lerPercentual(texto: string): number {
  return Number(texto.replace('%', '').replace(/\./g, '').replace(',', '.').trim()) / 100
}

export const hojeIso = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
