import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { buildSignedPut, ingestDataUrlToStorage, publicUrl, storageConfigured } from '@/lib/storage'

const config = {
  endpoint: 'https://account.r2.cloudflarestorage.com',
  region: 'auto',
  bucket: 'biblion',
  accessKeyId: 'AKIAEXAMPLE',
  secretAccessKey: 'dummy-storage-key',
  publicBaseUrl: 'https://cdn.example.com',
}

describe('storage — assinatura SigV4 (buildSignedPut)', () => {
  const body = Buffer.from('conteudo-de-imagem')
  const now = new Date('2026-07-22T22:00:00.000Z')

  it('monta a URL path-style e os headers assinados', () => {
    const signed = buildSignedPut(config, 'avatars/u1/abc.png', body, 'image/png', now)

    expect(signed.url).toBe('https://account.r2.cloudflarestorage.com/biblion/avatars/u1/abc.png')
    expect(signed.headers['x-amz-date']).toBe('20260722T220000Z')
    expect(signed.headers['x-amz-content-sha256']).toBe(createHash('sha256').update(body).digest('hex'))
    expect(signed.headers['Content-Type']).toBe('image/png')
    expect(signed.headers.Authorization).toContain(
      'AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE/20260722/auto/s3/aws4_request',
    )
    expect(signed.headers.Authorization).toContain('SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date')
    expect(signed.headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/)
  })

  it('é determinística e sensível ao corpo (assinaturas diferentes p/ corpos diferentes)', () => {
    const a = buildSignedPut(config, 'k.png', body, 'image/png', now)
    const b = buildSignedPut(config, 'k.png', body, 'image/png', now)
    const c = buildSignedPut(config, 'k.png', Buffer.from('outro'), 'image/png', now)

    expect(a.headers.Authorization).toBe(b.headers.Authorization)
    expect(a.headers.Authorization).not.toBe(c.headers.Authorization)
  })
})

describe('storage — gate de configuração', () => {
  beforeEach(() => {
    vi.stubEnv('STORAGE_ENDPOINT', '')
    vi.stubEnv('STORAGE_BUCKET', '')
    vi.stubEnv('STORAGE_ACCESS_KEY_ID', '')
    vi.stubEnv('STORAGE_SECRET_ACCESS_KEY', '')
  })

  it('storageConfigured é false sem as variáveis', () => {
    expect(storageConfigured()).toBe(false)
    expect(publicUrl('avatars/x.png')).toBeNull()
  })

  it('ingestDataUrlToStorage devolve null (fallback) quando não configurado', async () => {
    const dataUrl = 'data:image/png;base64,AAAA'
    await expect(ingestDataUrlToStorage(dataUrl, 'u1')).resolves.toBeNull()
  })
})

describe('storage — ingestão de data URL (configurado)', () => {
  beforeEach(() => {
    vi.stubEnv('STORAGE_ENDPOINT', config.endpoint)
    vi.stubEnv('STORAGE_REGION', config.region)
    vi.stubEnv('STORAGE_BUCKET', config.bucket)
    vi.stubEnv('STORAGE_ACCESS_KEY_ID', config.accessKeyId)
    vi.stubEnv('STORAGE_SECRET_ACCESS_KEY', config.secretAccessKey)
    vi.stubEnv('STORAGE_PUBLIC_BASE_URL', config.publicBaseUrl)
  })

  it('sobe a imagem (PUT assinado) e devolve a URL pública', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const url = await ingestDataUrlToStorage('data:image/png;base64,QUJD', 'user-1')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [reqUrl, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('PUT')
    expect(init.headers.Authorization).toContain('AWS4-HMAC-SHA256')
    expect(String(reqUrl)).toContain('/biblion/avatars/user-1/')
    expect(url).toMatch(/^https:\/\/cdn\.example\.com\/avatars\/user-1\/[0-9a-f]{24}\.png$/)
  })

  it('devolve null para data URL que não é imagem suportada', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(ingestDataUrlToStorage('data:text/html;base64,QQ==', 'user-1')).resolves.toBeNull()
  })

  it('devolve null (fallback) quando o upload falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(ingestDataUrlToStorage('data:image/png;base64,QUJD', 'user-1')).resolves.toBeNull()
  })
})
