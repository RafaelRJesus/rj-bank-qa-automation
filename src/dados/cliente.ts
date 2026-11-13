import { gerarCpf } from './cpf'

export interface DadosCliente {
  nome: string
  cpf: string
  email: string
  telefone: string
  cep: string
  numero: string
  complemento?: string
}

let sequencia = 0

/** Cliente fictício único por execução. Sobrescreva só o que importa no teste. */
export function umCliente(sobrescrever: Partial<DadosCliente> = {}): DadosCliente {
  sequencia += 1
  const id = `${Date.now().toString(36)}${sequencia}`
  return {
    nome: `QA Auto ${id}`,
    cpf: gerarCpf(),
    email: `qa.${id}@exemplo.com`,
    telefone: '51988887777',
    cep: '01001000',
    numero: String(10 + sequencia),
    ...sobrescrever,
  }
}
