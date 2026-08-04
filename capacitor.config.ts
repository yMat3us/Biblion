import type { CapacitorConfig } from '@capacitor/cli'

function configuredServerUrl(): URL | undefined {
  const rawValue = process.env.CAPACITOR_SERVER_URL?.trim()
  if (!rawValue) {
    if (process.env.CAPACITOR_REQUIRE_SERVER_URL === 'true') {
      throw new Error('CAPACITOR_SERVER_URL é obrigatória para sincronizar um aplicativo funcional.')
    }
    return undefined
  }

  let url: URL
  try {
    url = new URL(rawValue)
  } catch {
    throw new Error('CAPACITOR_SERVER_URL deve ser uma URL válida.')
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('CAPACITOR_SERVER_URL deve ser uma origem HTTP ou HTTPS sem credenciais, caminho, query ou fragmento.')
  }
  return url
}

const serverUrl = configuredServerUrl()
const config: CapacitorConfig = {
  appId: 'com.biblion.app',
  appName: 'Biblion',
  webDir: 'out',
  server: serverUrl 
    ? {
        url: serverUrl.origin,
        cleartext: true,
        androidScheme: serverUrl.protocol === 'http:' ? 'http' : 'https',
        allowNavigation: [serverUrl.hostname],
      }
    : {
        cleartext: true,
      },
  android: {
    allowMixedContent: false,
    backgroundColor: '#08090c',
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#08090c',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#7c6cf6',
    },
  },
}

export default config
