const digito = (base: number[]) => {
  const soma = base.reduce((acc, n, i) => acc + n * (base.length + 1 - i), 0)
  const resto = (soma * 10) % 11
  return resto === 10 ? 0 : resto
}

/** CPF válido e aleatório (só para teste), formatado 000.000.000-00. */
export function gerarCpf(): string {
  let base: number[]
  do {
    base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  } while (base.every((n) => n === base[0]))
  const d1 = digito(base)
  const d2 = digito([...base, d1])
  const s = [...base, d1, d2].join('')
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
}

export const CPF_INVALIDO = '111.111.111-11'
