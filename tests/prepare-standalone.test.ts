import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  prepareStandalone,
  StandalonePreparationError,
  verifyStandalone,
} from '@/scripts/prepare-standalone.mjs'

const temporaryRoots: string[] = []

async function createBuildFixture() {
  const root = await mkdtemp(join(tmpdir(), 'biblion-standalone-test-'))
  temporaryRoots.push(root)

  await mkdir(join(root, 'public', 'icons'), { recursive: true })
  await mkdir(join(root, '.next', 'static', 'chunks'), { recursive: true })
  await mkdir(join(root, '.next', 'standalone', '.next'), { recursive: true })
  await mkdir(join(root, '.next', 'standalone', 'node_modules', 'fixture'), { recursive: true })

  await writeFile(join(root, 'public', 'icons', 'app.svg'), '<svg>public</svg>')
  await writeFile(join(root, '.next', 'static', 'chunks', 'app.js'), 'static-asset')
  await writeFile(join(root, '.next', 'standalone', 'server.js'), 'server-entry')

  return root
}

async function findEnvEntries(directory: string): Promise<string[]> {
  const found: string[] = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.name.startsWith('.env')) found.push(entryPath)
    else if (entry.isDirectory()) found.push(...await findEnvEntries(entryPath))
  }

  return found
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })))
})

describe('prepareStandalone', () => {
  it('copia public/static e elimina toda entrada .env* do artefato', async () => {
    const root = await createBuildFixture()
    const standalone = join(root, '.next', 'standalone')

    await writeFile(join(standalone, '.env'), 'DATABASE_URL=segredo')
    await writeFile(join(standalone, 'node_modules', 'fixture', '.env.example'), 'TOKEN=exemplo')
    await writeFile(join(root, 'public', '.env.public'), 'PUBLIC_SECRET=segredo')
    await mkdir(join(root, '.next', 'static', '.env.cache'))
    await writeFile(join(root, '.next', 'static', '.env.cache', 'value'), 'segredo')

    const result = await prepareStandalone({ projectRoot: root })

    await expect(readFile(join(standalone, 'public', 'icons', 'app.svg'), 'utf8')).resolves.toBe('<svg>public</svg>')
    await expect(readFile(join(standalone, '.next', 'static', 'chunks', 'app.js'), 'utf8')).resolves.toBe('static-asset')
    await expect(findEnvEntries(standalone)).resolves.toEqual([])
    expect(result.removedEnvEntries).toBe(4)
  })

  it('é idempotente e não mantém assets obsoletos entre execuções', async () => {
    const root = await createBuildFixture()
    const standalone = join(root, '.next', 'standalone')

    await prepareStandalone({ projectRoot: root })
    await writeFile(join(standalone, 'public', 'obsoleto.txt'), 'remover')
    await writeFile(join(standalone, '.next', 'static', 'obsoleto.js'), 'remover')
    await writeFile(join(standalone, '.env.local'), 'SEGREDO=valor')

    const secondRun = await prepareStandalone({ projectRoot: root })

    await expect(readFile(join(standalone, 'public', 'icons', 'app.svg'), 'utf8')).resolves.toBe('<svg>public</svg>')
    await expect(readFile(join(standalone, '.next', 'static', 'chunks', 'app.js'), 'utf8')).resolves.toBe('static-asset')
    await expect(readFile(join(standalone, 'public', 'obsoleto.txt'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(standalone, '.next', 'static', 'obsoleto.js'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(findEnvEntries(standalone)).resolves.toEqual([])
    expect(secondRun.removedEnvEntries).toBe(1)
  })

  it.each([
    ['.next/standalone', '.next/standalone'],
    ['.next/standalone/.next', '.next/standalone/.next'],
    ['.next/standalone/server.js', '.next/standalone/server.js'],
    ['public', 'public'],
    ['.next/static', '.next/static'],
  ])('falha de forma segura antes de alterar o artefato quando falta %s', async (missing, expectedLabel) => {
    const root = await createBuildFixture()
    const marker = join(root, 'marker.txt')
    await writeFile(marker, 'preservar')
    await rm(join(root, ...missing.split('/')), { force: true, recursive: true })

    let thrown: unknown
    try {
      await prepareStandalone({ projectRoot: root })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(StandalonePreparationError)
    expect((thrown as Error).message).toContain(expectedLabel)
    expect((thrown as Error).message).not.toContain(root)
    await expect(readFile(marker, 'utf8')).resolves.toBe('preservar')
  })

  it('recusa um destino inesperado sem removê-lo', async () => {
    const root = await createBuildFixture()
    const destination = join(root, '.next', 'standalone', 'public')
    await writeFile(destination, 'não apagar')

    await expect(prepareStandalone({ projectRoot: root })).rejects.toThrow(
      'destino ".next/standalone/public" deve ser um diretório regular',
    )
    await expect(readFile(destination, 'utf8')).resolves.toBe('não apagar')
  })

  it.each([
    ['public', 'public'],
    ['.next/static', '.next/static'],
  ])('recusa symlink dentro da fonte %s antes de alterar o artefato', async (source, expectedLabel) => {
    const root = await createBuildFixture()
    const marker = join(root, '.next', 'standalone', 'marker.txt')
    const outside = join(root, 'fora-do-artefato.txt')
    await writeFile(marker, 'preservar')
    await writeFile(outside, 'não copiar')
    await symlink(outside, join(root, ...source.split('/'), 'link-externo'))

    await expect(prepareStandalone({ projectRoot: root })).rejects.toThrow(
      `Fonte insegura: "${expectedLabel}" contém link simbólico.`,
    )
    await expect(readFile(marker, 'utf8')).resolves.toBe('preservar')
  })

  it('oferece verificação somente leitura para uso após o empacotamento', async () => {
    const root = await createBuildFixture()
    const standalone = join(root, '.next', 'standalone')
    await prepareStandalone({ projectRoot: root })

    await expect(verifyStandalone({ projectRoot: root })).resolves.toEqual({ valid: true })

    const forbidden = join(standalone, '.env.production')
    await writeFile(forbidden, 'SEGREDO=preservado-pela-verificacao')
    await expect(verifyStandalone({ projectRoot: root })).rejects.toThrow('entrada de ambiente proibida')
    await expect(readFile(forbidden, 'utf8')).resolves.toBe('SEGREDO=preservado-pela-verificacao')
  })

  it.each([
    ['.next/standalone/server.js', '.next/standalone/server.js'],
    ['.next/standalone/public', '.next/standalone/public'],
    ['.next/standalone/.next/static', '.next/standalone/.next/static'],
  ])('a verificação recusa artefato incompleto sem modificá-lo: %s', async (missing, expectedLabel) => {
    const root = await createBuildFixture()
    await prepareStandalone({ projectRoot: root })
    const marker = join(root, '.next', 'standalone', 'marker.txt')
    await writeFile(marker, 'preservar')
    await rm(join(root, ...missing.split('/')), { force: true, recursive: true })

    await expect(verifyStandalone({ projectRoot: root })).rejects.toThrow(expectedLabel)
    await expect(readFile(marker, 'utf8')).resolves.toBe('preservar')
  })
})
