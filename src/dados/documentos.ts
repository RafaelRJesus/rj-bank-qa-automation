import { gerarCpf } from './cpf'
import { cronograma } from '../oraculo/credito'

export function docCliente(uid: string, extra: Record<string, unknown> = {}) {
  return {
    uid,
    nome: 'QA Regras',
    email: 'qa.regras@exemplo.com',
    telefone: '(51) 98888-7777',
    cpf: gerarCpf(),
    endereco: {
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '1',
      cidade: 'São Paulo',
      uf: 'SP',
    },
    criadoEm: new Date().toISOString(),
    ...extra,
  }
}

export function docContrato(uid: string, clienteId: string, extra: Record<string, unknown> = {}) {
  const prazo = 3
  return {
    uid,
    clienteId,
    clienteNome: 'QA Regras',
    produto: 'pessoal',
    detalhes: {},
    valor: 1000,
    taxaMensal: 0.02,
    prazo,
    sistema: 'PRICE',
    dataContratacao: '2026-11-13',
    iof: 10.5,
    cetMensal: 0.025,
    parcelas: cronograma(1000, 0.02, prazo, 'PRICE', '2026-11-13'),
    criadoEm: new Date().toISOString(),
    ...extra,
  }
}
