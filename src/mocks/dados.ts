// Respostas no mesmo formato das APIs reais, capturadas em 13/11/2026.

export const CEP_SE = {
  cep: '01001000',
  street: 'Praça da Sé',
  neighborhood: 'Sé',
  city: 'São Paulo',
  state: 'SP',
}

export const CEP_INEXISTENTE = '99999999'

export const FIPE = {
  marcas: [
    { codigo: '21', nome: 'Fiat' },
    { codigo: '59', nome: 'VW - VolksWagen' },
  ],
  modelos: { modelos: [{ codigo: 11401, nome: 'ARGO 1.0 6V Flex' }], anos: [] },
  anos: [
    { codigo: '2008-1', nome: '2008 Gasolina' },
    { codigo: '2021-5', nome: '2021 Flex' },
    { codigo: '32000-5', nome: '32000 Flex' },
  ],
  preco: (ano: number) => ({
    TipoVeiculo: 1,
    Valor: ano === 2008 ? 'R$ 18.500,00' : 'R$ 54.246,00',
    Marca: 'Fiat',
    Modelo: 'ARGO 1.0 6V Flex',
    AnoModelo: ano,
    Combustivel: 'Flex',
    CodigoFipe: '001509-1',
    MesReferencia: 'novembro de 2026',
    SiglaCombustivel: 'F',
  }),
}

// Medianas da semana 23/10–29/10/2026 e do mês set/2026
export const TAXAS_BCB = {
  semanal: { InicioPeriodo: '2026-10-23', FimPeriodo: '2026-10-29' },
  mensal: { anoMes: '2026-09', Mes: 'Set-2026' },
  linhasSemanais: {
    'Crédito pessoal não consignado - Prefixado': [1.17, 5.13, 20.39],
    'Crédito pessoal consignado INSS - Prefixado': [1.51, 1.79, 2.15],
    'Crédito pessoal consignado público - Prefixado': [1.5, 1.81, 2.2],
    'Crédito pessoal consignado privado - Prefixado': [2.1, 3.33, 4.9],
    'Aquisição de veículos - Prefixado': [0, 1.7, 3.39],
    'Cartão de crédito - parcelado - Prefixado': [1.11, 7.61, 19.49],
  } as Record<string, number[]>,
  linhasMensais: {
    'Financiamento imobiliário com taxas de mercado - Prefixado': [0.87, 1.17, 1.43],
  } as Record<string, number[]>,
}
