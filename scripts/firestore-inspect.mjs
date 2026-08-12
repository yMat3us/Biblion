// Inspeção SOMENTE LEITURA do Firestore: lista as coleções raiz e a contagem de
// documentos de cada uma. Não altera nada.
//
// Uso: node --env-file=.env scripts/firestore-inspect.mjs
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()
const collections = await db.listCollections()

if (collections.length === 0) {
  console.log('Nenhuma coleção encontrada no Firestore.')
  process.exit(0)
}

console.log(`Coleções raiz encontradas: ${collections.length}`)
for (const col of collections) {
  try {
    const agg = await col.count().get()
    console.log(`- ${col.id}: ${agg.data().count} documento(s)`)
  } catch {
    console.log(`- ${col.id}: (não foi possível contar)`)
  }
}
process.exit(0)
