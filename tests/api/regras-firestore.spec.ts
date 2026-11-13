import { expect, test } from '@playwright/test'
import { UsuarioAnonimo } from '../../src/api/firestoreRest'
import { docCliente, docContrato } from '../../src/dados/documentos'
import { env } from '../../src/env'

// Bate direto na API REST do Firestore, como um atacante faria sem passar pela tela.
test.describe('Regras do Firestore @seguranca', () => {
  test.skip(!env.firebaseApiKey || !env.firebaseProjectId, 'FIREBASE_API_KEY/PROJECT_ID ausentes')
  test.describe.configure({ mode: 'serial' })

  let dono: UsuarioAnonimo
  let intruso: UsuarioAnonimo
  let clienteDoc: string
  let contratoDoc: string

  test.beforeAll(async ({ request }) => {
    dono = await UsuarioAnonimo.criar(request)
    intruso = await UsuarioAnonimo.criar(request)
  })

  test.afterAll(async () => {
    await dono?.encerrar()
    await intruso?.encerrar()
  })

  test('SEG-01 dono cria cliente e contrato válidos', async () => {
    const c = await dono.criarDoc('clientes', docCliente(dono.uid))
    expect(c.status()).toBe(200)
    clienteDoc = (await c.json()).name

    const k = await dono.criarDoc('contratos', docContrato(dono.uid, clienteDoc.split('/').pop()!))
    expect(k.status(), await k.text()).toBe(200)
    contratoDoc = (await k.json()).name
  })

  test('SEG-02 sem login não lê nem grava', async ({ request }) => {
    const base = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents`
    expect((await request.get(`${base}/clientes`)).status()).toBe(403)
    expect((await request.get(`https://firestore.googleapis.com/v1/${clienteDoc}`)).status()).toBe(
      403,
    )
    const post = await request.post(`${base}/clientes`, { data: { fields: {} } })
    expect(post.status()).toBe(403)
  })

  test('SEG-03 outro usuário não lê, altera nem apaga dados alheios', async () => {
    expect((await intruso.lerDoc(clienteDoc)).status()).toBe(403)
    expect((await intruso.lerDoc(contratoDoc)).status()).toBe(403)
    expect((await intruso.apagarDoc(contratoDoc)).status()).toBe(403)
    expect((await intruso.alterarDoc(contratoDoc, { parcelas: [] })).status()).toBe(403)
    // listar tudo da coleção é negado: a consulta precisa filtrar pelo próprio uid
    expect((await intruso.listar('clientes')).status()).toBe(403)
  })

  test('SEG-04 consulta pelo uid de outro usuário é negada', async () => {
    expect((await intruso.consultarPorUid('clientes', dono.uid)).status()).toBe(403)
  })

  test('SEG-05 não cria documento em nome de outro uid', async () => {
    const r = await intruso.criarDoc('clientes', docCliente(dono.uid))
    expect(r.status()).toBe(403)
  })

  const clientesInvalidos: [string, Record<string, unknown>][] = [
    ['nome vazio', { nome: '' }],
    ['nome com 121 caracteres', { nome: 'A'.repeat(121) }],
    ['e-mail com 161 caracteres', { email: `${'a'.repeat(150)}@exemplo.com` }],
    ['campo extra', { admin: true }],
    ['nome numérico', { nome: 123 }],
    ['endereço com chave desconhecida', { endereco: { cep: '01001-000', pais: 'BR' } }],
    ['logradouro com 121 caracteres', { endereco: { logradouro: 'R'.repeat(121) } }],
    ['UF com 3 letras', { endereco: { uf: 'SPX' } }],
  ]
  for (const [caso, extra] of clientesInvalidos) {
    test(`SEG-06 recusa cliente: ${caso}`, async () => {
      const r = await dono.criarDoc('clientes', docCliente(dono.uid, extra))
      expect(r.status()).toBe(403)
    })
  }

  const contratosInvalidos: [string, Record<string, unknown>][] = [
    ['produto desconhecido', { produto: 'cartao' }],
    ['valor zero', { valor: 0 }],
    ['valor acima do teto', { valor: 2_100_001 }],
    ['taxa negativa', { taxaMensal: -0.01 }],
    ['taxa acima de 20%', { taxaMensal: 0.21 }],
    ['prazo 241', { prazo: 241 }],
    ['sistema desconhecido', { sistema: 'SAM' }],
    ['parcelas em quantidade diferente do prazo', { prazo: 4 }],
    ['detalhes com chave desconhecida', { detalhes: { score: 900 } }],
    ['iofFinanciado não booleano', { detalhes: { iofFinanciado: 'sim' } }],
    [
      'parcela com campo extra',
      { parcelas: [{ numero: 1, vencimento: '2026-12-13', valor: 1, hack: 1 }], prazo: 1 },
    ],
  ]
  for (const [caso, extra] of contratosInvalidos) {
    test(`SEG-07 recusa contrato: ${caso}`, async () => {
      const r = await dono.criarDoc('contratos', docContrato(dono.uid, 'x', extra))
      expect(r.status()).toBe(403)
    })
  }

  test('SEG-08 cliente não pode ser alterado depois de criado', async () => {
    expect((await dono.alterarDoc(clienteDoc, { nome: 'Outro nome' })).status()).toBe(403)
  })

  test('SEG-09 no contrato só o cronograma muda (pagamento)', async () => {
    expect((await dono.alterarDoc(contratoDoc, { valor: 1 })).status()).toBe(403)
    expect((await dono.alterarDoc(contratoDoc, { taxaMensal: 0 })).status()).toBe(403)

    const parcelas = docContrato(dono.uid, 'x').parcelas.map((p, i) =>
      i === 0 ? { ...p, pagaEm: '2026-12-13', valorPago: p.valor } : p,
    )
    expect((await dono.alterarDoc(contratoDoc, { parcelas })).status()).toBe(200)
    expect((await dono.alterarDoc(contratoDoc, { parcelas: parcelas.slice(1) })).status()).toBe(403)
  })

  test('SEG-10 coleções fora do app são bloqueadas', async () => {
    expect((await dono.criarDoc('admins', { uid: dono.uid })).status()).toBe(403)
  })

  test('SEG-11 dono apaga os próprios dados', async () => {
    expect((await dono.apagarDoc(contratoDoc)).status()).toBe(200)
    expect((await dono.apagarDoc(clienteDoc)).status()).toBe(200)
    expect((await dono.lerDoc(clienteDoc)).status()).toBe(403)
  })
})
