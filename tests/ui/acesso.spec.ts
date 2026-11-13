import { umCliente } from '../../src/dados/cliente'
import { gerarCpf } from '../../src/dados/cpf'
import { env } from '../../src/env'
import { expect, test } from '../../src/fixtures'
import { ADMIN_LOCAL } from '../../src/paginas/AcessoPage'

const SENHA = 'senha123'
const emailNovo = (prefixo: string) => `${prefixo}.${Date.now().toString(36)}@exemplo.com`

test.describe('Acesso · sem login', () => {
  test.use({ logado: false })

  test('ACE-01 qualquer rota leva ao login @smoke @mobile', async ({ page }) => {
    await page.goto('/contratos')
    await expect(page).toHaveURL(/\/entrar$/)
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  })

  test('ACE-02 senha errada não entra @regressao', async ({ acesso }) => {
    await acesso.entrar(env.gestor.email || ADMIN_LOCAL.email, 'senha-errada')
    await expect(acesso.erro()).toHaveText('E-mail ou senha incorretos.')
  })

  test('ACE-03 criar conta valida e-mail e senha @regressao', async ({ acesso, page }) => {
    await acesso.criarConta('sem-arroba', '123', '123')
    await expect(page.getByText('E-mail inválido.')).toBeVisible()
    await acesso.criarConta('ok@exemplo.com', SENHA, 'outra123')
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()
  })

  test('ACE-04 esqueci a senha confirma o envio sem revelar se a conta existe @regressao', async ({
    page,
    acesso,
  }) => {
    await page.goto('/esqueci-senha')
    await acesso.campo('E-mail').fill('ninguem@exemplo.com')
    await page.getByRole('button', { name: 'Enviar link' }).click()
    await expect(page.getByRole('status')).toContainText('Se existir uma conta')
  })
})

test.describe('Acesso · equipe', () => {
  test('ACE-05 menu da equipe e saída @smoke', async ({ acesso, page }) => {
    await page.goto('/')
    for (const area of ['Visão geral', 'Clientes', 'Simulador de crédito', 'Contratos']) {
      await expect(page.getByRole('navigation').getByRole('link', { name: area })).toBeVisible()
    }
    // o gestor de teste (produção) não cadastra gestores; o admin local sim
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Gestores' })).toHaveCount(
      env.appLocal ? 1 : 0,
    )
    await acesso.sair()
    await page.goto('/clientes')
    await expect(page).toHaveURL(/\/entrar$/)
  })
})

// Fluxos que criam contas novas: só no app local, porque em produção a conta
// precisaria de um e-mail real para ser confirmada.
test.describe('Acesso · papéis (app local)', () => {
  test.skip(!env.appLocal, 'cria contas novas; só roda contra o app local')

  test('ACE-10 admin cadastra gestor, que entra sem a tela de gestores @regressao', async ({
    gestores,
    acesso,
    page,
  }) => {
    const email = emailNovo('gestor')
    await gestores.abrir()
    await gestores.cadastrar('Gestor QA', email)
    await acesso.sair()

    await acesso.criarConta(email, SENHA)
    await expect(page.getByRole('heading', { name: 'Acesso de gestor' })).toBeVisible()
    await acesso.ativarGestor('Gestor QA')
    await expect(acesso.usuario()).toContainText('Gestor')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Gestores' })).toHaveCount(
      0,
    )
    await page.goto('/gestores')
    await expect(page).not.toHaveURL(/gestores/)
  })

  test('ACE-11 gestor removido perde o acesso @regressao @seguranca', async ({
    gestores,
    acesso,
    page,
  }) => {
    const email = emailNovo('removido')
    await gestores.abrir()
    await gestores.cadastrar('Gestor Removido', email)
    await acesso.sair()
    await acesso.criarConta(email, SENHA)
    await acesso.ativarGestor('Gestor Removido')
    await acesso.sair()

    await acesso.entrarComSucesso(ADMIN_LOCAL.email, ADMIN_LOCAL.senha)
    await gestores.abrir()
    await gestores.remover(email)
    await acesso.sair()

    await acesso.entrar(email, SENHA)
    await expect(page.getByText('Seu acesso de gestor foi removido')).toBeVisible()
  })

  test('ACE-12 cliente pré-cadastrado vê só os próprios contratos e paga @smoke @seguranca', async ({
    clientes,
    simulador,
    contrato,
    acesso,
    page,
  }) => {
    const email = emailNovo('cliente')
    const dono = umCliente({ email })
    const outro = umCliente()
    for (const c of [dono, outro]) {
      await clientes.abrir()
      await clientes.cadastrar(c)
      await simulador.abrir()
      await simulador.cliente(c.nome)
      await simulador.parametros({ valor: 2000, taxa: 2, prazo: 3 })
      await simulador.contratar()
    }
    await acesso.sair()

    await acesso.criarConta(email, SENHA)
    await acesso.informarCpf(dono.nome, dono.cpf)

    await expect(page.getByRole('heading', { name: 'Meus contratos' })).toBeVisible()
    await expect(page.locator('a.row-link')).toHaveText([dono.nome])
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Clientes' })).toHaveCount(
      0,
    )

    await page.locator('a.row-link').click()
    await expect(page.getByRole('button', { name: 'Excluir contrato' })).toHaveCount(0)
    await contrato.iniciarPagamento(1)
    await contrato.confirmarPagamento(1)

    await simulador.abrir()
    await expect(page.getByText('Para contratar, fale com seu gestor.')).toBeVisible()
    await expect(simulador.botaoContratar()).toHaveCount(0)

    for (const rota of ['/clientes', '/gestores', '/']) {
      await page.goto(rota)
      await expect(page).toHaveURL(/\/contratos$/)
    }
  })

  test('ACE-13 cliente sem cadastro se cadastra sozinho @regressao', async ({ acesso, page }) => {
    await page.goto('/')
    await acesso.sair()
    const email = emailNovo('novo')
    await acesso.criarConta(email, SENHA)
    await acesso.informarCpf('Cliente Novo', gerarCpf())

    await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
    await expect(acesso.campo('E-mail')).toHaveValue(email)
    await expect(acesso.campo('E-mail')).toHaveAttribute('readonly', '')
    await acesso.campo('Telefone').fill('51988887777')
    await acesso.campo('CEP').fill('01001000')
    await expect(acesso.campo('Cidade')).toHaveValue('São Paulo')
    await acesso.campo('Número').fill('10')
    await page.getByRole('button', { name: 'Concluir cadastro' }).click()

    await expect(page.getByRole('heading', { name: 'Meus contratos' })).toBeVisible()
    await expect(acesso.usuario()).toContainText('Cliente')
  })

  test('ACE-14 não assume o CPF de outra pessoa @seguranca', async ({ clientes, acesso, page }) => {
    const vitima = umCliente()
    await clientes.abrir()
    await clientes.cadastrar(vitima)
    await acesso.sair()

    await acesso.criarConta(emailNovo('golpe'), SENHA)
    await acesso.informarCpf(vitima.nome, vitima.cpf)
    await acesso.campo('Telefone').fill('51988887777')
    await acesso.campo('CEP').fill('01001000')
    await expect(acesso.campo('Cidade')).toHaveValue('São Paulo')
    await acesso.campo('Número').fill('10')
    await page.getByRole('button', { name: 'Concluir cadastro' }).click()

    await expect(page.getByText('Esse CPF já está cadastrado com outro e-mail')).toBeVisible()
  })
})

// Em produção: conta de cliente de teste fixa (QA_CLIENTE_EMAIL).
test.describe('Acesso · cliente de teste (produção)', () => {
  test.use({ logado: false })
  test.skip(env.appLocal || !env.cliente.email, 'precisa de QA_CLIENTE_EMAIL em produção')

  test('ACE-20 cliente vê só "Meus contratos" e não entra nas telas da equipe @smoke @seguranca', async ({
    acesso,
    simulador,
    page,
  }) => {
    await acesso.entrarComSucesso(env.cliente.email, env.cliente.senha)
    await expect(page.getByRole('heading', { name: 'Meus contratos' })).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Clientes' })).toHaveCount(
      0,
    )
    for (const rota of ['/clientes', '/gestores']) {
      await page.goto(rota)
      await expect(page).toHaveURL(/\/contratos$/)
    }
    await simulador.abrir()
    await expect(simulador.botaoContratar()).toHaveCount(0)
  })
})
