import 'server-only'

import { createHash, createHmac, randomBytes } from 'node:crypto'
import { logger } from '@/lib/logger'

/**
 * Adaptador de object storage compatível com S3 (AWS S3, Cloudflare R2, MinIO…).
 *
 * Config-gated: sem as variáveis STORAGE_*, `storageConfigured()` é false e os
 * chamadores mantêm o comportamento atual (avatar como data URL base64 no banco).
 * Com storage configurado, imagens vão para o bucket e o banco guarda apenas a
 * URL pública (HTTPS) — leve e servida por CDN.
 *
 * A assinatura é SigV4 feita à mão (sem SDK/dependências nativas), então funciona
 * em qualquer runtime Node e é determinística/testável.
 */
interface StorageConfig {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl: string
}

export function storageConfig(): StorageConfig | null {
  const endpoint = process.env.STORAGE_ENDPOINT?.replace(/\/$/, '')
  const bucket = process.env.STORAGE_BUCKET
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null
  const region = process.env.STORAGE_REGION || 'auto'
  // Base pública: CDN dedicada quando definida, senão o próprio endpoint/bucket.
  const publicBaseUrl = (process.env.STORAGE_PUBLIC_BASE_URL || `${endpoint}/${bucket}`).replace(/\/$/, '')
  return { endpoint, region, bucket, accessKeyId, secretAccessKey, publicBaseUrl }
}

export function storageConfigured(): boolean {
  return storageConfig() !== null
}

function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

/** Percent-encode conforme RFC 3986 (mais estrito que encodeURIComponent). */
function encodeRfc3986(segment: string): string {
  return encodeURIComponent(segment).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, dateStamp), region), service), 'aws4_request')
}

export interface SignedRequest {
  url: string
  headers: Record<string, string>
}

/**
 * Constrói uma requisição PUT assinada com SigV4 (path-style: {endpoint}/{bucket}/{key}),
 * compatível com S3 e R2. Exportada para teste determinístico da assinatura.
 */
export function buildSignedPut(
  config: StorageConfig,
  key: string,
  body: Buffer,
  contentType: string,
  now = new Date(),
): SignedRequest {
  const service = 's3'
  const host = new URL(config.endpoint).host
  const canonicalKey = key.split('/').map(encodeRfc3986).join('/')
  const canonicalUri = `/${config.bucket}/${canonicalKey}`
  const amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, '')}` // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256Hex(body)

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')

  const scope = `${dateStamp}/${config.region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n')
  const signature = createHmac('sha256', signingKey(config.secretAccessKey, dateStamp, config.region, service))
    .update(stringToSign)
    .digest('hex')

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    url: `${config.endpoint}${canonicalUri}`,
    headers: {
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
    },
  }
}

/** Sobe um objeto para o bucket. Best-effort: devolve false (e loga) em falha. */
export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<boolean> {
  const config = storageConfig()
  if (!config) return false
  const signed = buildSignedPut(config, key, body, contentType)
  try {
    const response = await fetch(signed.url, {
      method: 'PUT',
      headers: signed.headers,
      // Uint8Array (não Buffer) para casar com o tipo BodyInit do fetch.
      body: Uint8Array.from(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      logger.warn('storage_upload_failed', { status: response.status })
      return false
    }
    return true
  } catch (error) {
    logger.warn('storage_upload_error', { error })
    return false
  }
}

/** URL pública de um objeto (CDN/base configurada). Null se storage não configurado. */
export function publicUrl(key: string): string | null {
  const config = storageConfig()
  return config ? `${config.publicBaseUrl}/${key}` : null
}

const IMAGE_DATA_URL = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/
const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
}

/** Chave de objeto única para o avatar de um usuário. */
export function objectKeyForAvatar(userId: string, ext: string): string {
  return `avatars/${userId}/${randomBytes(12).toString('hex')}.${ext}`
}

/**
 * Se `dataUrl` for uma imagem embutida E o storage estiver configurado, sobe os
 * bytes para o bucket e devolve a URL pública (HTTPS). Caso contrário devolve null
 * — sinal para o chamador manter o data URL (fallback). Best-effort.
 */
export async function ingestDataUrlToStorage(dataUrl: string, userId: string): Promise<string | null> {
  if (!storageConfigured()) return null
  const match = IMAGE_DATA_URL.exec(dataUrl)
  if (!match) return null

  const [, contentType, base64] = match
  const ext = EXT_BY_TYPE[contentType] ?? 'bin'
  const body = Buffer.from(base64, 'base64')
  const key = objectKeyForAvatar(userId, ext)

  const uploaded = await uploadObject(key, body, contentType)
  return uploaded ? publicUrl(key) : null
}
