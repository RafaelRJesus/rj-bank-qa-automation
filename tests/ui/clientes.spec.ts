import { CPF_INVALIDO } from '../../src/dados/cpf'
import { umCliente } from '../../src/dados/cliente'
import { CEP_INEXISTENTE } from '../../src/mocks/dados'
import { expect, test } from '../../src/fixtures'

test.describe('Clientes', () => {
  test.beforeEach(async ({ clientes }) => {
    await clientes.abrir()
  })

  test('CLI-01 cadastra cliente com endereço completado pelo CEP @smoke', async ({ clientes }) => {
    const c = umCliente()
    await clientes.preencher(c)

    await expect(clientes.campo('Logradouro')).toHaveValue('Praça da Sé')
    await expect(clientes.campo('Bairro')).toHaveValue('Sé')
    await expect(clientes.campo('UF')).toHaveValue('SP')

    await clientes.enviar()
    await expect(clientes.toast).toContainText('Cliente cadastrado.')
    await expect(clientes.item(c.nome)).toContainText(`CPF ${c.cpf}`)
    await expect(clientes.item(c.nome)).toContainText(/Nº \d{7}/)
    await expect(clientes.item(c.nome)).toContainText('São Paulo')
    await expect(clientes.campo('Nome')).toHaveValue('')
  })

  test('CLI-02 aplica máscaras de CPF, telefone e CEP @regressao', async ({ clientes }) => {
    await clientes.campo('CPF').fill('52998224725')
    await clientes.campo('Telefone').fill('51988887777')
    await clientes.campo('CEP').fill('01001000')

    await expect(clientes.campo('CPF')).toHaveValue('529.982.247-25')
    await expect(clientes.campo('Telefone')).toHaveValue('(51) 98888-7777')
    await expect(clientes.campo('CEP')).toHaveValue('01001-000')
  })

  test('CLI-03 recusa CPF com dígito verificador inválido @regressao', async ({ clientes }) => {
    await clientes.preencher(umCliente({ cpf: CPF_INVALIDO }))
    await clientes.enviar()
    await expect(clientes.erroDo('CPF')).toBeVisible()
    await expect(clientes.toast).toHaveCount(0)
  })

  test('CLI-04 não deixa cadastrar o mesmo CPF duas vezes @regressao', async ({ clientes }) => {
    const primeiro = umCliente()
    await clientes.cadastrar(primeiro)

    const segundo = umCliente({ cpf: primeiro.cpf })
    await clientes.preencher(segundo)
    await clientes.enviar()
    await expect(clientes.erroDo('CPF')).toHaveText('CPF já cadastrado.')
    await expect(clientes.item(segundo.nome)).toHaveCount(0)
  })

  test('CLI-05 obriga os campos principais @regressao', async ({ clientes }) => {
    await clientes.enviar()
    for (const campo of ['Nome', 'CPF', 'E-mail']) {
      await expect(clientes.erroDo(campo), campo).toBeVisible()
    }
  })

  test('CLI-06 nome acima de 120 caracteres é cortado e o cadastro grava @regressao', async ({
    clientes,
  }) => {
    // Bug corrigido: nome longo passava na tela e o banco recusava com erro genérico
    const c = umCliente({ nome: `Nome Longo ${'A'.repeat(120)}` })
    await clientes.preencher(c)
    await expect(clientes.campo('Nome')).toHaveValue(c.nome.slice(0, 120))
    await clientes.enviar()
    await expect(clientes.toast).toContainText('Cliente cadastrado.')
  })

  test('CLI-07 avisa quando o CEP não existe e libera o endereço manual @regressao', async ({
    clientes,
  }) => {
    await clientes.campo('CEP').fill(CEP_INEXISTENTE)
    await expect(clientes.erroDo('CEP')).toBeVisible()
    await expect(clientes.campo('Logradouro')).toBeEditable()
  })

  test('CLI-08 busca por nome, CPF e número do cliente @regressao', async ({ clientes }) => {
    // nomes únicos: em produção a carteira do gestor tem outros clientes
    const ana = umCliente()
    const bruno = umCliente()
    ana.nome = `Ana ${ana.nome}`
    bruno.nome = `Bruno ${bruno.nome}`
    await clientes.cadastrar(ana)
    await clientes.cadastrar(bruno)

    await clientes.buscar(ana.nome.toLowerCase())
    await expect(clientes.lista).toHaveCount(1)
    await expect(clientes.item(ana.nome)).toBeVisible()

    await clientes.buscar(bruno.cpf)
    await expect(clientes.lista).toHaveCount(1)
    await expect(clientes.item(bruno.nome)).toBeVisible()

    // número do cliente, como aparece na lista
    const numero = (await clientes.item(bruno.nome).innerText()).match(/Nº (\d{7})/)![1]
    await clientes.buscar(numero)
    await expect(clientes.lista.first()).toContainText(bruno.nome)

    await clientes.buscar('ninguém com esse nome')
    await expect(clientes.lista).toHaveCount(0)
    await expect(
      clientes.campo('Nome').page().getByText('Nenhum cliente encontrado.'),
    ).toBeVisible()
  })

  test('CLI-09 remover pede confirmação e cancelar mantém o cliente @regressao', async ({
    clientes,
  }) => {
    // Bug corrigido: o cliente era removido sem confirmação
    const c = umCliente()
    await clientes.cadastrar(c)

    await clientes.botaoRemover(c.nome).click()
    const dialogo = clientes.item(c.nome).getByRole('alertdialog')
    await expect(dialogo).toContainText(`Remover ${c.nome}?`)
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(clientes.item(c.nome)).toBeVisible()

    await clientes.remover(c.nome)
  })

  test('CLI-10 dados continuam após recarregar a página @regressao', async ({ clientes, page }) => {
    const c = umCliente()
    await clientes.cadastrar(c)
    await page.reload()
    await expect(clientes.item(c.nome)).toBeVisible()
  })
})
