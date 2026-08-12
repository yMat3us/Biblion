// APAGA TODO O FIRESTORE: lista todas as coleções raiz e as remove
// recursivamente (documentos + subcoleções). Ação IRREVERSÍVEL.
//
// Uso: node --env-file=.env scripts/firestore-wipe.mjs
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
  console.log('Firestore já está vazio.')
  process.exit(0)
}

for (const col of collections) {
  await db.recursiveDelete(col)
  console.log(`Coleção apagada: ${col.id}`)
}

console.log(`Firestore limpo por completo (${collections.length} coleção/ões removida(s)).`)
process.exit(0)
