# Plano de testes · RJ Bank

## Objetivo

Garantir que o simulador de crédito calcula certo, que cada papel (admin,
gestor e cliente) só enxerga o que pode e que as integrações externas (CEP,
FIPE, Banco Central) continuam funcionando. Tudo com dados fictícios.

## O que está fora

- Desempenho e carga (o app roda no plano gratuito do Firebase).
- Navegadores além do Chromium. O público-alvo usa Chrome/Edge; Firefox e
  WebKit podem entrar depois, só adicionando projetos no `playwright.config.ts`.
- Regras de negócio de qualquer empresa real. Os limites dos produtos são os
  do próprio app (`src/lib/produtos.js` no repositório cliente-app).

## Estratégia

| Camada    | Pasta            | Contra o quê                 | Quando roda    |
| --------- | ---------------- | ---------------------------- | -------------- |
| Oráculo   | `tests/oraculo`  | funções puras                | todo push      |
| Interface | `tests/ui`       | app local com APIs simuladas | todo push/PR   |
| Interface | `tests/ui`       | site publicado, APIs reais   | toda madrugada |
| Segurança | `tests/api`      | API REST do Firestore        | toda madrugada |
| Contrato  | `tests/contrato` | BrasilAPI, ViaCEP, FIPE, BCB | toda madrugada |

**Oráculo independente.** Os valores esperados de parcela, IOF, CET e encargos
saem de `src/oraculo/credito.ts`, escrito do zero a partir das fórmulas, sem
copiar código do app. Se os dois discordarem, um deles está errado e o teste
mostra onde. O próprio oráculo é testado contra valores calculados à mão.

**Mocks com contrato.** Na interface as APIs externas são simuladas (`src/mocks`)
para o resultado depender só do código. Para o mock não ficar mentindo, a suíte
`contrato` confere toda noite se as APIs reais ainda respondem naquele formato.

**Login.** Contra o app local cada teste já começa como o admin de exemplo
(só existe sem Firebase). Em produção os testes entram com contas de teste
fixas (`QA_GESTOR_*`, `QA_CLIENTE_*`), com e-mail confirmado uma vez à mão.
Fluxos que criam contas novas rodam só no app local, porque em produção a
conta precisaria de uma caixa de e-mail real para ser confirmada.

**Isolamento.** Cada teste abre um contexto novo e usa nomes e CPFs únicos,
porque em produção o gestor de teste vê a carteira toda. No fim a fixture apaga
tudo que a conta de teste criou (`criadoPor`).

**Regras em duas camadas.** A matriz completa das regras do Firestore (cada
papel tentando o que pode e o que não pode) roda no emulador, no repositório
cliente-app (`npm run test:regras`). Aqui a suíte `@seguranca` confere que o
que está publicado se comporta igual.

## Tags

- `@smoke`: caminho feliz das quatro áreas, roda em segundos.
- `@regressao`: regras de produto, validações e bugs já corrigidos.
- `@seguranca`: regras do Firestore.
- `@contrato`: APIs externas.
- `@a11y`: acessibilidade com axe-core (WCAG 2 A/AA).
- `@mobile`: também roda no Pixel 7.

## Cenários

### Clientes

| ID     | Cenário                                   |
| ------ | ----------------------------------------- |
| CLI-01 | Cadastro com endereço completado pelo CEP |
| CLI-02 | Máscaras de CPF, telefone e CEP           |
| CLI-03 | CPF com dígito inválido é recusado        |
| CLI-04 | CPF duplicado é recusado                  |
| CLI-05 | Campos obrigatórios                       |
| CLI-06 | Nome acima de 120 caracteres              |
| CLI-07 | CEP inexistente libera endereço manual    |
| CLI-08 | Busca por nome, CPF e número do cliente   |
| CLI-09 | Remoção com confirmação                   |
| CLI-10 | Dados persistem após recarregar           |

### Simulador

| ID     | Cenário                                      |
| ------ | -------------------------------------------- |
| SIM-01 | Cronograma Price e SAC iguais ao oráculo     |
| SIM-02 | SAC fecha saldo zero com valor quebrado      |
| SIM-03 | Taxa vazia não vira 0%                       |
| SIM-04 | Limites de valor e prazo                     |
| SIM-05 | Contratar sem cliente                        |
| SIM-06 | Referência do Banco Central e período mensal |
| SIM-07 | Banco Central fora do ar                     |
| SIM-10 | Consignado: margem de 35% da renda           |
| SIM-11 | Veículo: até 70% da FIPE                     |
| SIM-12 | Veículo com mais de 15 anos                  |
| SIM-13 | Veículo zero km                              |
| SIM-14 | Placa inválida                               |
| SIM-15 | Imóvel: até 60% do valor, prazo até 240      |
| SIM-16 | Pix parcelado com IOF financiado             |

### Contratos e visão geral

| ID         | Cenário                                                   |
| ---------- | --------------------------------------------------------- |
| CTR-01     | Contratação e detalhe do contrato                         |
| CTR-02     | Pagamento em atraso: multa 2% + mora 1% a.m.              |
| CTR-03     | Pagamento em dia sem encargos                             |
| CTR-04     | Data de pagamento vazia                                   |
| CTR-05     | Situação "em atraso" e "quitado" no filtro                |
| CTR-06     | Exclusão de contrato                                      |
| CTR-07     | Cliente com contrato não pode ser removido                |
| VG-01      | Carteira vazia                                            |
| VG-02      | KPIs acompanham cadastro, contrato e atraso               |
| NAV-01..04 | Menu, rota direta, contrato inexistente, teclado nas abas |
| RESP-01    | Sem rolagem horizontal no celular                         |
| A11Y-01    | Sem violações graves de estrutura                         |
| A11Y-02    | Contraste de cores                                        |

### Acesso

| ID     | Cenário                                                 | Onde      |
| ------ | ------------------------------------------------------- | --------- |
| ACE-01 | Rota sem login leva ao login                            | todos     |
| ACE-02 | Senha errada                                            | todos     |
| ACE-03 | Validação de e-mail e senha na criação de conta         | todos     |
| ACE-04 | Esqueci a senha não revela se a conta existe            | todos     |
| ACE-05 | Menu da equipe e saída                                  | todos     |
| ACE-10 | Admin cadastra gestor, que entra sem a tela de gestores | app local |
| ACE-11 | Gestor removido perde o acesso                          | app local |
| ACE-12 | Cliente vê só os próprios contratos e paga              | app local |
| ACE-13 | Cliente sem cadastro se cadastra sozinho                | app local |
| ACE-14 | Não assume o CPF de outra pessoa                        | app local |
| ACE-20 | Cliente de teste não entra nas telas da equipe          | produção  |

### Segurança (Firestore publicado)

| ID     | Cenário                                                    |
| ------ | ---------------------------------------------------------- |
| SEG-01 | Sem login não lê nem grava                                 |
| SEG-02 | Conta sem e-mail confirmado não faz nada                   |
| SEG-03 | Gestor vê a carteira; cliente e contrato não são editáveis |
| SEG-04 | Gestor não cria gestor nem muda o próprio papel            |
| SEG-05 | Cliente não lê, paga nem apaga contrato alheio             |
| SEG-06 | Coleções desconhecidas                                     |

### Contrato das APIs

| ID        | Cenário                                           |
| --------- | ------------------------------------------------- |
| API-01/02 | BrasilAPI CEP: sucesso e 404                      |
| API-03    | ViaCEP                                            |
| API-04    | FIPE: marcas, modelos, anos e preço               |
| API-05    | Banco Central semanal: modalidades usadas existem |
| API-06    | Banco Central mensal: formato `Mmm-AAAA`          |

## Rastreabilidade dos bugs

Cada bug corrigido no app ganhou um teste que falharia se ele voltasse.

| Bug                                           | Teste                  |
| --------------------------------------------- | ---------------------- |
| Última parcela SAC com centavos sobrando      | SIM-02                 |
| Ano FIPE 32000 aparecendo no lugar de zero km | SIM-13                 |
| Banco Central lento derrubava a referência    | SIM-07, API-05         |
| Contrato não podia ser excluído               | CTR-06                 |
| Taxa vazia virava 0%                          | SIM-03                 |
| NaN no pagamento sem data                     | CTR-04                 |
| Cliente removido sem confirmação              | CLI-09                 |
| Pix: valor enviado descontava o IOF           | SIM-16                 |
| Layout estourando no celular                  | RESP-01                |
| Abas sem teclado                              | NAV-04                 |
| Nome longo com erro genérico                  | CLI-06                 |
| Período "Set-2026" exibido como 01/01/2026    | SIM-06, API-06         |
| Regras aceitando campos sem limite            | emulador (cliente-app) |

## Defeitos abertos

### BUG-A11Y-01 · contraste abaixo do mínimo WCAG (sério)

O axe encontrou texto com contraste menor que 4.5:1 em todas as telas:

- cinza `#8a94a6` (rótulos dos KPIs, `dt`, cabeçalho das tabelas, textos
  `.muted` e `.empty`): 3.05:1 no branco, 2.8:1 no `#f3f5f9`;
- texto branco no botão `#00a868`: 3.08:1;
- link verde `#008a55`: 4.4:1.

Sugestão (contrastes conferidos): cinza `#5f6b7d` (5.4:1 no branco, 4.87:1 no
fundo da aba ativa), botão `#00804f` (5.0:1) e link `#007a4c` (5.4:1). O teste A11Y-02 está marcado como falha esperada; quando o app for
corrigido ele passa a acusar "passou inesperadamente", e é só remover o
`test.fail`.

## Riscos conhecidos

- A gravação no Firestore não tem tempo limite: com a rede travada, o botão
  fica em "Gravando..." indefinidamente. Não há teste para isso ainda.
- Os testes contra produção dependem das APIs públicas. Uma falha na suíte
  `contrato` com a interface passando quase sempre é instabilidade externa.
