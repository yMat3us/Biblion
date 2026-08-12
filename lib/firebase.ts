import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let firestore: Firestore | null = null

// Inicialização PREGUIÇOSA: o Firebase só é tocado no primeiro uso real (runtime),
// nunca na importação do módulo. Isso é essencial para o `next build`, que importa
// as rotas para "coletar dados de página" sem as variáveis FIREBASE_* no ambiente —
// inicializar o Firestore no topo do módulo quebrava o build (app/invalid-credential).
function getDb(): Firestore {
  if (firestore) return firestore

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // O SDK admin exige a chave privada com quebras de linha reais.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }

  firestore = getFirestore()
  // Campos `undefined` (ex.: `auditDetails` quando a análise é aprovada) fariam o
  // `.set()` lançar; ignorá-los é o comportamento recomendado. settings() só pode
  // ser chamado uma vez, antes de qualquer operação.
  try {
    firestore.settings({ ignoreUndefinedProperties: true })
  } catch {
    // Já configurado/utilizado: mantém a configuração inicial.
  }
  return firestore
}

// Proxy que difere a inicialização para o primeiro acesso a uma propriedade
// (ex.: `db.collection(...)`). Importar este módulo só cria o proxy — nenhum
// acesso ao Firebase acontece até o primeiro uso em runtime.
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getDb()
    const value = Reflect.get(instance, prop, instance)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
