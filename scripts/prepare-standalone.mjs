import { cp, lstat, mkdtemp, readdir, rename, rm } from 'node:fs/promises'
import { join, parse, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Erro intencional cuja mensagem pode ser exibida sem revelar caminhos locais. */
export class StandalonePreparationError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = 'StandalonePreparationError'
  }
}

async function statOrNull(pathname) {
  try {
    return await lstat(pathname)
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return null
    throw error
  }
}

async function requireDirectory(pathname, label) {
  const stats = await statOrNull(pathname)
  if (!stats) {
    throw new StandalonePreparationError(`Estrutura esperada ausente: diretório "${label}".`)
  }
  if (!stats.isDirectory()) {
    throw new StandalonePreparationError(`Estrutura inválida: "${label}" deve ser um diretório regular.`)
  }
}

async function requireFile(pathname, label) {
  const stats = await statOrNull(pathname)
  if (!stats) {
    throw new StandalonePreparationError(`Estrutura esperada ausente: arquivo "${label}".`)
  }
  if (!stats.isFile()) {
    throw new StandalonePreparationError(`Estrutura inválida: "${label}" deve ser um arquivo regular.`)
  }
}

async function requireReplaceableDirectory(pathname, label) {
  const stats = await statOrNull(pathname)
  if (stats && !stats.isDirectory()) {
    throw new StandalonePreparationError(`Estrutura inválida: destino "${label}" deve ser um diretório regular.`)
  }
}

async function removeEnvEntries(directory) {
  let removed = 0
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.name.startsWith('.env')) {
      await rm(entryPath, { force: true, recursive: true })
      removed += 1
    } else if (entry.isDirectory()) {
      removed += await removeEnvEntries(entryPath)
    }
  }

  return removed
}

async function containsEnvEntry(directory) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.env')) return true
    if (entry.isDirectory() && (await containsEnvEntry(join(directory, entry.name)))) return true
  }

  return false
}

async function requireNoSymlinks(directory, label) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new StandalonePreparationError(`Fonte insegura: "${label}" contém link simbólico.`)
    }
    if (entry.isDirectory()) await requireNoSymlinks(join(directory, entry.name), label)
  }
}

async function copyDirectory(source, destination) {
  await cp(source, destination, {
    recursive: true,
    force: true,
    errorOnExist: false,
    verbatimSymlinks: true,
  })
}

async function promoteDirectory(source, destination) {
  await rm(destination, { force: true, recursive: true })
  await rename(source, destination)
}

function resolveProjectPaths(projectRoot) {
  if (typeof projectRoot !== 'string' || !projectRoot.trim()) {
    throw new StandalonePreparationError('Raiz do projeto inválida.')
  }

  const root = resolve(projectRoot)
  if (root === parse(root).root) {
    throw new StandalonePreparationError('Raiz do projeto inválida: não use a raiz do sistema de arquivos.')
  }

  const nextDirectory = join(root, '.next')
  const standaloneDirectory = join(nextDirectory, 'standalone')
  const standaloneNextDirectory = join(standaloneDirectory, '.next')

  return {
    root,
    nextDirectory,
    standaloneDirectory,
    standaloneNextDirectory,
    serverFile: join(standaloneDirectory, 'server.js'),
    publicSource: join(root, 'public'),
    staticSource: join(nextDirectory, 'static'),
    publicDestination: join(standaloneDirectory, 'public'),
    staticDestination: join(standaloneNextDirectory, 'static'),
  }
}

/**
 * Audita o artefato sem modificá-lo. Pode ser chamado separadamente no CI para
 * impedir a publicação de um pacote incompleto ou que ainda contenha `.env*`.
 */
export async function verifyStandalone({ projectRoot = process.cwd() } = {}) {
  const paths = resolveProjectPaths(projectRoot)

  try {
    await requireDirectory(paths.root, 'raiz do projeto')
    await requireDirectory(paths.nextDirectory, '.next')
    await requireDirectory(paths.standaloneDirectory, '.next/standalone')
    await requireDirectory(paths.standaloneNextDirectory, '.next/standalone/.next')
    await requireFile(paths.serverFile, '.next/standalone/server.js')
    await requireDirectory(paths.publicDestination, '.next/standalone/public')
    await requireDirectory(paths.staticDestination, '.next/standalone/.next/static')

    if (await containsEnvEntry(paths.standaloneDirectory)) {
      throw new StandalonePreparationError('O artefato standalone contém uma entrada de ambiente proibida.')
    }

    return { valid: true }
  } catch (error) {
    if (error instanceof StandalonePreparationError) throw error
    throw new StandalonePreparationError('Não foi possível verificar o artefato standalone com segurança.', {
      cause: error,
    })
  }
}

/**
 * Completa o artefato produzido por `next build` com os assets que o modo
 * standalone deliberadamente não copia e elimina arquivos `.env*` do resultado.
 *
 * `projectRoot` é injetável para que todo o fluxo seja exercitado em um diretório
 * temporário, sem tocar no build real durante os testes.
 */
export async function prepareStandalone({ projectRoot = process.cwd() } = {}) {
  const paths = resolveProjectPaths(projectRoot)
  let stagingDirectory

  try {
    // Toda a estrutura é validada antes da primeira remoção: falhas de preflight
    // não deixam um artefato existente pela metade.
    await requireDirectory(paths.root, 'raiz do projeto')
    await requireDirectory(paths.nextDirectory, '.next')
    await requireDirectory(paths.standaloneDirectory, '.next/standalone')
    await requireDirectory(paths.standaloneNextDirectory, '.next/standalone/.next')
    await requireFile(paths.serverFile, '.next/standalone/server.js')
    await requireDirectory(paths.publicSource, 'public')
    await requireDirectory(paths.staticSource, '.next/static')
    await requireReplaceableDirectory(paths.publicDestination, '.next/standalone/public')
    await requireReplaceableDirectory(paths.staticDestination, '.next/standalone/.next/static')
    await requireNoSymlinks(paths.publicSource, 'public')
    await requireNoSymlinks(paths.staticSource, '.next/static')

    // O build standalone pode ter rastreado um .env da raiz. Ele é removido
    // antes de qualquer outra operação para reduzir a janela de exposição.
    let removedEnvEntries = await removeEnvEntries(paths.standaloneDirectory)

    // As cópias são preparadas e higienizadas fora do artefato. Só diretórios
    // completos são então promovidos, evitando publicar uma cópia parcial com
    // um arquivo de ambiente caso a leitura dos assets falhe no meio do caminho.
    stagingDirectory = await mkdtemp(join(paths.nextDirectory, '.prepare-standalone-'))
    const stagedPublic = join(stagingDirectory, 'public')
    const stagedStatic = join(stagingDirectory, 'static')
    await copyDirectory(paths.publicSource, stagedPublic)
    await copyDirectory(paths.staticSource, stagedStatic)
    removedEnvEntries += await removeEnvEntries(stagingDirectory)

    // Substituir, em vez de mesclar, também elimina assets obsoletos entre builds
    // e torna execuções repetidas determinísticas.
    await promoteDirectory(stagedPublic, paths.publicDestination)
    await promoteDirectory(stagedStatic, paths.staticDestination)

    await verifyStandalone({ projectRoot: paths.root })

    return { removedEnvEntries }
  } catch (error) {
    if (error instanceof StandalonePreparationError) throw error
    throw new StandalonePreparationError('Não foi possível preparar o artefato standalone com segurança.', {
      cause: error,
    })
  } finally {
    if (stagingDirectory) {
      // O diretório temporário só contém cópias já higienizadas. A limpeza é
      // best-effort para não esconder o resultado/erro principal da preparação.
      await rm(stagingDirectory, { force: true, recursive: true }).catch(() => undefined)
    }
  }
}

async function main() {
  try {
    const verifyOnly = process.argv[2] === '--verify'
    const projectRoot = process.argv[verifyOnly ? 3 : 2] ?? process.cwd()

    if (verifyOnly) {
      await verifyStandalone({ projectRoot })
      console.log('Artefato standalone verificado com sucesso.')
    } else {
      const { removedEnvEntries } = await prepareStandalone({ projectRoot })
      console.log(`Artefato standalone preparado com sucesso. Entradas .env removidas: ${removedEnvEntries}.`)
    }
  } catch (error) {
    const message = error instanceof StandalonePreparationError
      ? error.message
      : 'Não foi possível preparar o artefato standalone com segurança.'
    console.error(`[standalone] ${message}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
