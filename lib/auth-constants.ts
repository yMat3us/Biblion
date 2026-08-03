// Contexto seguro: site público em HTTPS ou execução em produção. Determina o
// atributo Secure dos cookies e se podemos usar o prefixo __Host-.
const secureContext = (() => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return siteUrl ? siteUrl.startsWith('https://') : process.env.NODE_ENV === 'production'
})()

export const SECURE_COOKIES = secureContext

// O prefixo __Host- exige Secure + Path=/ + sem Domain. Só o aplicamos quando o
// cookie é Secure (HTTPS/produção); em dev por HTTP (inclui `next dev -H 0.0.0.0`
// e Capacitor via LAN) mantemos o nome simples para não quebrar o login local.
export const SESSION_COOKIE = secureContext ? '__Host-biblion_session' : 'biblion_session'

// Janela de inatividade: desliza a cada atividade. Sessão inativa por mais que
// isso é invalidada mesmo com o cookie ainda presente.
export const SESSION_IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Teto absoluto de vida da sessão, contado desde a criação. Mesmo em uso contínuo,
// força re-login ao atingir este limite (limita a janela de um token vazado).
export const SESSION_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const MAX_ACTIVE_SESSIONS = 10
