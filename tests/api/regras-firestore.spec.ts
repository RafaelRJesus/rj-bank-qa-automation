import { expect, test } from '@playwright/test'
import { UsuarioTeste } from '../../src/api/firestoreRest'
import { docCliente, docContrato, idDoCpf } from '../../src/dados/documentos'
import { env } from '../../src/env'

// Bate direto na API REST do Firestore publicado, como alguém faria sem passar
// pela tela. A matriz completa de regras roda no emulador (cliente-app,
// npm run test:regras); aqui conferimos que o que está no ar é o esperado.
test.describe('Regras do Firestore em produção @seguranca', () => {
  test.skip(!env.firebaseApiKey, 'FIREBASE_API_KEY ausente')
  test.describe.configure({ mode: 'serial' })

  const base = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents`

  test('SEG-01 sem login não lê nem grava', async ({ request }) => {
    expect((await request.get(`${base}/clientes`)).status()).toBe(403)
    expect((await request.get(`${base}/contratos`)).status()).toBe(403)
    expect((await request.get(`${base}/usuarios`)).status()).toBe(403)
    expect((await request.post(`${base}/clientes`, { data: { fields: {} } })).status()).toBe(403)
  })

  test('SEG-02 conta sem e-mail confirmado não faz nada', async ({ request }) => {
    const nova = await UsuarioTeste.criarSemConfirmar(request)
    try {
      expect((await nova.listar('clientes')).status()).toBe(403)
      expect((await nova.listar('contratos')).status()).toBe(403)

      const cliente = docCliente(nova.uid, { email: nova.email })
      const r = await nova.criarDoc('clientes', cliente, idDoCpf(cliente.cpf as string))
      expect(r.status(), 'cadastrar-se sem confirmar o e-mail').toBe(403)

      for (const papel of ['admin', 'gestor', 'cliente']) {
        const perfil = { papel, email: nova.email, nome: 'X', criadoEm: new Date().toISOString() }
        const p = await nova.criarDoc('usuarios', perfil, nova.uid)
        expect(p.status(), `criar perfil ${papel}`).toBe(403)
      }
      const convite = await nova.criarDoc('gestores', { nome: 'X', criadoEm: 'x' }, nova.email)
      expect(convite.status(), 'convidar a si mesmo como gestor').toBe(403)
    } finally {
      await nova.excluirConta()
    }
  })

  test.describe('com as contas de teste', () => {
    test.skip(!env.gestor.email, 'QA_GESTOR_EMAIL/QA_GESTOR_SENHA ausentes')

    let gestor: UsuarioTeste
    let contratoAlheio: string

    test.beforeAll(async ({ request }) => {
      gestor = await UsuarioTeste.entrar(request, env.gestor.email, env.gestor.senha)
    })

    test.afterAll(async () => {
      await gestor?.limparCriados()
    })

    test('SEG-03 gestor vê a carteira e cadastra cliente e contrato', async () => {
      expect((await gestor.listar('clientes')).status()).toBe(200)
      expect((await gestor.listar('contratos')).status()).toBe(200)

      const cliente = docCliente(gestor.uid)
      const id = idDoCpf(cliente.cpf as string)
      expect((await gestor.criarDoc('clientes', cliente, id)).status()).toBe(200)

      const k = await gestor.criarDoc('contratos', docContrato(gestor.uid, id))
      expect(k.status(), await k.text()).toBe(200)
      contratoAlheio = (await k.json()).name

      expect((await gestor.alterarDoc(contratoAlheio, { valor: 1 })).status()).toBe(403)
      expect(
        (await gestor.alterarDoc(gestor.caminho('clientes', id), { nome: 'X' })).status(),
      ).toBe(403)
    })

    test('SEG-04 gestor não cria gestor nem muda o próprio papel', async () => {
      const convite = await gestor.criarDoc(
        'gestores',
        { nome: 'X', criadoEm: 'x' },
        'outro@exemplo.com',
      )
      expect(convite.status()).toBe(403)
      const papel = await gestor.alterarDoc(gestor.caminho('usuarios', gestor.uid), {
        papel: 'admin',
      })
      expect(papel.status()).toBe(403)
      expect((await gestor.listar('usuarios')).status()).toBe(403)
    })

    test('SEG-05 cliente não enxerga nada além do que é dele', async ({ request }) => {
      test.skip(!env.cliente.email, 'QA_CLIENTE_EMAIL/QA_CLIENTE_SENHA ausentes')
      const cliente = await UsuarioTeste.entrar(request, env.cliente.email, env.cliente.senha)

      expect((await cliente.listar('clientes')).status()).toBe(403)
      expect((await cliente.listar('contratos')).status()).toBe(403)
      expect((await cliente.lerDoc(contratoAlheio)).status()).toBe(403)
      const parcelas = { parcelas: docContrato('x', 'x').parcelas }
      expect((await cliente.alterarDoc(contratoAlheio, parcelas)).status()).toBe(403)
      expect((await cliente.apagarDoc(contratoAlheio)).status()).toBe(403)

      const proprio = docContrato(cliente.uid, 'qualquer')
      expect((await cliente.criarDoc('contratos', proprio)).status(), 'cliente contratando').toBe(
        403,
      )
    })

    test('SEG-06 coleções fora do app são bloqueadas', async () => {
      expect((await gestor.criarDoc('admins', { x: 1 })).status()).toBe(403)
    })
  })
})
