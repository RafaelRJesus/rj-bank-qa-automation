import type { Page } from '@playwright/test'
import { env } from '../env'

interface Sessao {
  uid: string
  token: string
}

/** Lê o usuário anônimo que o app criou (o SDK guarda no IndexedDB). */
export async function sessaoFirebase(page: Page): Promise<Sessao | null> {
  return page.evaluate(
    () =>
      new Promise<{ uid: string; token: string } | null>((resolve) => {
        const req = indexedDB.open('firebaseLocalStorageDb')
        req.onerror = () => resolve(null)
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null)
          const all = db
            .transaction('firebaseLocalStorage')
            .objectStore('firebaseLocalStorage')
            .getAll()
          all.onsuccess = () => {
            const user = all.result.map((r) => r.value).find((v) => v?.stsTokenManager)
            resolve(user ? { uid: user.uid, token: user.stsTokenManager.accessToken } : null)
          }
          all.onerror = () => resolve(null)
        }
      }),
  )
}

const base = () =>
  `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents`

/** Apaga tudo que o usuário anônimo do teste gravou. Sem sessão (modo local), não faz nada. */
export async function limparDadosDoTeste(page: Page) {
  const sessao = await sessaoFirebase(page).catch(() => null)
  if (!sessao || !env.firebaseProjectId) return

  const headers = { authorization: `Bearer ${sessao.token}`, 'content-type': 'application/json' }
  for (const colecao of ['contratos', 'clientes']) {
    const resp = await page.request.post(`${base()}:runQuery`, {
      headers,
      data: {
        structuredQuery: {
          from: [{ collectionId: colecao }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'uid' },
              op: 'EQUAL',
              value: { stringValue: sessao.uid },
            },
          },
        },
      },
    })
    if (!resp.ok()) continue
    const docs = ((await resp.json()) as { document?: { name: string } }[]).filter(
      (d) => d.document,
    )
    for (const { document } of docs) {
      await page.request.delete(`https://firestore.googleapis.com/v1/${document!.name}`, {
        headers,
      })
    }
  }
}
