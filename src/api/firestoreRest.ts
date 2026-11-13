import type { APIRequestContext, APIResponse } from '@playwright/test'
import { env } from '../env'

// Converte JSON comum para o formato tipado da API REST do Firestore.
type Valor = Record<string, unknown>
export function paraFirestore(v: unknown): Valor {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number')
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(paraFirestore) } }
  return { mapValue: { fields: campos(v as Record<string, unknown>) } }
}
const campos = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, paraFirestore(v)]))

const IDENTITY = 'https://identitytoolkit.googleapis.com/v1/accounts'

/** Conta real do Firebase Auth, usada para bater na API REST como o app faria. */
export class UsuarioTeste {
  private constructor(
    private readonly request: APIRequestContext,
    readonly uid: string,
    readonly email: string,
    private readonly token: string,
  ) {}

  private static async autenticar(request: APIRequestContext, acao: string, data: object) {
    const resp = await request.post(`${IDENTITY}:${acao}?key=${env.firebaseApiKey}`, { data })
    if (!resp.ok()) throw new Error(`${acao} falhou: ${resp.status()} ${await resp.text()}`)
    const { localId, idToken, email } = await resp.json()
    return new UsuarioTeste(request, localId, email, idToken)
  }

  /** Conta nova com e-mail ainda não confirmado (não dá para confirmar sem caixa de entrada). */
  static criarSemConfirmar(request: APIRequestContext) {
    const email = `qa.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@exemplo.com`
    return UsuarioTeste.autenticar(request, 'signUp', {
      email,
      password: `Qa!${Math.random().toString(36).slice(2)}`,
      returnSecureToken: true,
    })
  }

  static entrar(request: APIRequestContext, email: string, senha: string) {
    return UsuarioTeste.autenticar(request, 'signInWithPassword', {
      email,
      password: senha,
      returnSecureToken: true,
    })
  }

  private get headers() {
    return { authorization: `Bearer ${this.token}` }
  }

  private url(caminho = '') {
    return `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents${caminho}`
  }

  caminho(colecao: string, id: string) {
    return `projects/${env.firebaseProjectId}/databases/(default)/documents/${colecao}/${id}`
  }

  criarDoc(colecao: string, dados: Record<string, unknown>, id?: string): Promise<APIResponse> {
    const query = id ? `?documentId=${encodeURIComponent(id)}` : ''
    return this.request.post(this.url(`/${colecao}${query}`), {
      headers: this.headers,
      data: { fields: campos(dados) },
    })
  }

  lerDoc(nome: string) {
    return this.request.get(`https://firestore.googleapis.com/v1/${nome}`, {
      headers: this.headers,
    })
  }

  alterarDoc(nome: string, dados: Record<string, unknown>) {
    const mask = Object.keys(dados)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&')
    return this.request.patch(`https://firestore.googleapis.com/v1/${nome}?${mask}`, {
      headers: this.headers,
      data: { fields: campos(dados) },
    })
  }

  apagarDoc(nome: string) {
    return this.request.delete(`https://firestore.googleapis.com/v1/${nome}`, {
      headers: this.headers,
    })
  }

  listar(colecao: string) {
    return this.request.get(this.url(`/${colecao}`), { headers: this.headers })
  }

  consultar(colecao: string, campo: string, valor: string) {
    return this.request.post(`${this.url()}:runQuery`, {
      headers: this.headers,
      data: {
        structuredQuery: {
          from: [{ collectionId: colecao }],
          where: {
            fieldFilter: {
              field: { fieldPath: campo },
              op: 'EQUAL',
              value: { stringValue: valor },
            },
          },
        },
      },
    })
  }

  /** Apaga o que esta conta criou (criadoPor = uid). */
  async limparCriados() {
    for (const colecao of ['contratos', 'clientes']) {
      const resp = await this.consultar(colecao, 'criadoPor', this.uid)
      if (!resp.ok()) continue
      for (const r of (await resp.json()) as { document?: { name: string } }[]) {
        if (r.document) await this.apagarDoc(r.document.name)
      }
    }
  }

  /** Só para contas descartáveis criadas pelo próprio teste. */
  excluirConta() {
    return this.request.post(`${IDENTITY}:delete?key=${env.firebaseApiKey}`, {
      data: { idToken: this.token },
    })
  }
}
