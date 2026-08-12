import 'server-only'

import { getMessaging } from 'firebase-admin/messaging'
import { db } from '@/lib/firebase'

// Push nativo (FCM) para acompanhar a geração de análises na barra de
// notificações do celular, mesmo com o app em segundo plano ou fechado.
//
// Os tokens de dispositivo são registrados pelo cliente (PushRegistration) e
// guardados no Firestore associados ao usuário. O servidor — que roda o pipeline
// e tem o firebase-admin — envia as atualizações de progresso como notificações
// que se substituem no lugar (mesma tag/collapseKey), então o usuário vê uma
// única notificação "andando" conforme o progresso avança.

const TOKENS_COLLECTION = 'pushTokens'
/** Canal Android criado no cliente; precisa bater com o id usado aqui. */
const ANDROID_CHANNEL = 'analysis_progress'

export type PushPlatform = 'android' | 'ios' | 'web'

/** Registra (ou atualiza) um token de dispositivo para um usuário. */
export async function savePushToken(userId: string, token: string, platform: PushPlatform): Promise<void> {
  await db.collection(TOKENS_COLLECTION).doc(token).set({
    userId,
    platform,
    updatedAt: new Date().toISOString(),
  })
}

/** Remove um token (ex.: logout ou token inválido). */
export async function removePushToken(token: string): Promise<void> {
  await db.collection(TOKENS_COLLECTION).doc(token).delete()
}

async function tokensForUser(userId: string): Promise<string[]> {
  const snap = await db.collection(TOKENS_COLLECTION).where('userId', '==', userId).get()
  return snap.docs.map((doc) => doc.id)
}

export type AnalysisPushState = 'progress' | 'done' | 'error'

export interface AnalysisPushInput {
  docId: string
  verseRef: string
  /** 0-100. */
  progress: number
  statusMessage: string
  waitingRateLimit?: boolean
  state: AnalysisPushState
}

function buildText(input: AnalysisPushInput): { title: string; body: string } {
  if (input.state === 'done') {
    return { title: 'Análise concluída', body: `${input.verseRef} está pronta para leitura.` }
  }
  if (input.state === 'error') {
    return { title: 'Falha na análise', body: `Não foi possível concluir ${input.verseRef}.` }
  }
  const pct = Math.max(0, Math.min(100, Math.round(input.progress)))
  const detail = input.waitingRateLimit ? 'Aguardando limite de requisições…' : input.statusMessage
  return { title: `Analisando ${input.verseRef}`, body: `${pct}% · ${detail}` }
}

/**
 * Envia (best-effort) uma atualização de progresso para todos os dispositivos do
 * usuário. Nunca lança: uma falha de push jamais deve afetar o pipeline.
 */
export async function sendAnalysisPush(userId: string, input: AnalysisPushInput): Promise<void> {
  try {
    const tokens = await tokensForUser(userId)
    if (tokens.length === 0) return

    const { title, body } = buildText(input)
    const generating = input.state === 'progress'
    const tag = `analysis-${input.docId}`

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      // Dados para o app tratar o toque/estado, se estiver aberto.
      data: {
        type: 'analysis',
        docId: input.docId,
        verseRef: input.verseRef,
        progress: String(Math.round(input.progress)),
        state: input.state,
      },
      notification: { title, body },
      android: {
        // Mesma collapseKey/tag → a notificação se substitui no lugar (progresso
        // "andando" numa única notificação, em vez de empilhar várias).
        collapseKey: tag,
        priority: generating ? 'normal' : 'high',
        notification: {
          title,
          body,
          tag,
          channelId: ANDROID_CHANNEL,
          // Enquanto gera, fica fixa (não pode ser dispensada por engano); no fim
          // vira dispensável.
          sticky: generating,
          priority: generating ? 'low' : 'default',
          // Sem som/vibração nas atualizações intermediárias (evita spam).
          defaultSound: !generating,
        },
      },
    })

    // Poda tokens inválidos para não tentar de novo indefinidamente.
    response.responses.forEach((r, i) => {
      if (r.success) return
      const code = r.error?.code
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        void db.collection(TOKENS_COLLECTION).doc(tokens[i]).delete().catch(() => undefined)
      }
    })
  } catch (error) {
    console.error('[Push] Failed to send analysis push:', error)
  }
}
