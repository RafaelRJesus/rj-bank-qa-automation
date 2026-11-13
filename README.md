# RJ Bank · automação de testes

Testes automatizados do [RJ Bank](https://github.com/RafaelRJesus/cliente-app),
um simulador de crédito pessoal feito para estudo. Playwright + TypeScript.

Site testado: https://cliente-app-1a979.web.app

## O que tem aqui

```
src/
  oraculo/    cálculo independente de parcelas, IOF, CET e atraso
  paginas/    page objects (uma classe por tela)
  fixtures/   mocks, page objects e limpeza do Firestore por teste
  mocks/      respostas simuladas de CEP, FIPE e Banco Central
  dados/      CPF válido aleatório e builders de cliente/contrato
  api/        cliente REST do Firestore com usuário anônimo
tests/
  oraculo/    o oráculo contra valores calculados à mão
  ui/         interface: clientes, simulador, contratos, visão geral, a11y
  api/        regras de segurança do Firestore
  contrato/   formato das APIs públicas
docs/PLANO_DE_TESTES.md   estratégia, cenários e rastreabilidade dos bugs
```

## Rodando

```bash
npm ci
npx playwright install chromium
cp .env.example .env   # ajuste se precisar
```

Contra o app local (mais rápido e estável). No repositório `cliente-app`:

```bash
npm run build -- --mode e2e && npx vite preview --port 4173
```

E aqui:

```bash
BASE_URL=http://localhost:4173 EXTERNAL_APIS=mock npm run test:ui
```

Contra o site publicado:

```bash
npm run test:smoke                  # caminho feliz
npm run test:ui                     # interface completa
npm run test:api                    # precisa de FIREBASE_API_KEY e FIREBASE_PROJECT_ID
npm run test:contrato               # APIs externas reais
npm run report                      # abre o último relatório
```

`FIREBASE_API_KEY` é a chave web do app (a mesma que vai no bundle do site), não
uma credencial de administrador. Mesmo assim fica fora do repositório: no CI é
um secret.

## Variáveis

| Variável                                | Padrão              | Para quê                                                    |
| --------------------------------------- | ------------------- | ----------------------------------------------------------- |
| `BASE_URL`                              | site publicado      | URL do app; `localhost` liga o login com o admin de exemplo |
| `EXTERNAL_APIS`                         | `mock`              | `mock` simula CEP/FIPE/BCB; `live` usa as reais             |
| `FIREBASE_API_KEY`                      |                     | suíte de segurança                                          |
| `FIREBASE_PROJECT_ID`                   | `cliente-app-1a979` | suíte de segurança e limpeza dos dados de teste             |
| `QA_GESTOR_EMAIL` / `QA_GESTOR_SENHA`   |                     | conta de gestor de teste em produção                        |
| `QA_CLIENTE_EMAIL` / `QA_CLIENTE_SENHA` |                     | conta de cliente de teste em produção                       |
| `CHROME_PATH`                           |                     | usar um Chrome já instalado em vez do baixado               |

## CI

`.github/workflows/testes.yml`:

- **push e PR**: tipos, formatação, oráculo e interface contra o app compilado
  do repositório `cliente-app`, com APIs simuladas.
- **toda madrugada**: interface, segurança e contrato contra o site publicado.
- **manual** (Actions → testes → Run workflow): escolhe URL e suíte.

Para a parte de produção, cadastre em Settings → Secrets and variables → Actions:
os secrets `FIREBASE_API_KEY`, `QA_GESTOR_EMAIL`, `QA_GESTOR_SENHA`,
`QA_CLIENTE_EMAIL`, `QA_CLIENTE_SENHA` e a variável `FIREBASE_PROJECT_ID`.

### Contas de teste em produção (uma vez)

O app exige login. Use e-mails que você controla (um alias tipo
`seuemail+qagestor@gmail.com` serve), nunca a conta de admin:

1. Como admin, cadastre o e-mail do gestor de teste na tela **Gestores**.
2. Crie a conta com esse e-mail, confirme pelo link e ative o acesso.
3. Crie outra conta para o cliente de teste, confirme e faça o cadastro com um
   CPF fictício válido.

Sem essas contas, os testes de interface contra produção são pulados (não
falham) e só rodam os que não precisam de login.

## Convenções

- Cenário tem ID (`SIM-04`) e tag (`@smoke`, `@regressao`...). O plano de testes
  lista todos.
- Bug corrigido no app ganha um teste com o comentário `// Bug corrigido: ...`.
- Valor esperado de cálculo vem do oráculo, nunca de um número copiado da tela.
- Seletor por papel e rótulo (`getByRole`, `getByLabel`); classe CSS só quando
  não há alternativa, e sempre dentro do page object.
- Só dados fictícios. Cada teste apaga o que criou.
