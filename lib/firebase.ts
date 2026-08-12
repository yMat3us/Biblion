import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Firebase admin SDK requires private key to be formatted correctly with newline characters
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.error('Firebase admin initialization error', error)
  }
}

export const db = getFirestore()

// Campos com valor `undefined` (ex.: `auditDetails` quando a análise é aprovada)
// fariam o `.set()` lançar. Ignorá-los é o comportamento recomendado e evita ter
// de limpar objetos manualmente antes de gravar. settings() só pode ser chamado
// uma vez, antes de qualquer operação; em HMR (dev) o módulo pode reavaliar sobre
// a mesma instância, então a segunda chamada é ignorada.
try {
  db.settings({ ignoreUndefinedProperties: true })
} catch {
  // Instância já inicializada/utilizada: mantém a configuração da primeira carga.
}
