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

/** Usuário anônimo real, criado pela mesma API que o app usa. */
export class UsuarioAnonimo {
  private constructor(
    private readonly request: APIRequestContext,
    readonly uid: string,
    private readonly token: string,
  ) {}

  static async criar(request: APIRequestContext) {
    const resp = await request.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${env.firebaseApiKey}`,
      { data: { returnSecureToken: true } },
    )
    if (!resp.ok()) throw new Error(`signUp falhou: ${resp.status()} ${await resp.text()}`)
    const { localId, idToken } = await resp.json()
    return new UsuarioAnonimo(request, localId, idToken)
  }

  private get headers() {
    return { authorization: `Bearer ${this.token}` }
  }

  private url(caminho = '') {
    return `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents${caminho}`
  }

  criarDoc(colecao: string, dados: Record<string, unknown>): Promise<APIResponse> {
    return this.request.post(this.url(`/${colecao}`), {
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

  consultarPorUid(colecao: string, uid: string) {
    return this.request.post(`${this.url()}:runQuery`, {
      headers: this.headers,
      data: {
        structuredQuery: {
          from: [{ collectionId: colecao }],
          where: {
            fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } },
          },
        },
      },
    })
  }

  /** Apaga os documentos e a própria conta anônima. */
  async encerrar() {
    for (const colecao of ['contratos', 'clientes']) {
      const resp = await this.consultarPorUid(colecao, this.uid)
      if (!resp.ok()) continue
      for (const r of (await resp.json()) as { document?: { name: string } }[]) {
        if (r.document) await this.apagarDoc(r.document.name)
      }
    }
    await this.request.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${env.firebaseApiKey}`,
      { data: { idToken: this.token } },
    )
  }
}
