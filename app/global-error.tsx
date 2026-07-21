'use client'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Erro inesperado · Biblion</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#060811',
          color: '#f7f7fb',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: '1.5rem',
          boxSizing: 'border-box',
        }}
      >
        <style>{`
          * { box-sizing: border-box; }
          .global-error-action:focus-visible { outline: 2px solid #9677ff; outline-offset: 3px; }
          .global-error-action:hover { transform: translateY(-1px); filter: brightness(1.08); }
        `}</style>
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(circle at 50% -10%, rgba(130,92,246,.19), transparent 42%), radial-gradient(circle at 10% 90%, rgba(232,188,105,.06), transparent 30%)',
          }}
        />
        <main
          role="alert"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '32rem',
            overflow: 'hidden',
            textAlign: 'left',
            background: 'linear-gradient(90deg, rgba(150,119,255,.045), transparent 32%), #0b0f1a',
            border: '1px solid rgba(226,232,255,.11)',
            borderRadius: '.7rem 1.25rem 1.25rem .7rem',
            padding: 'clamp(1.5rem, 5vw, 2.5rem)',
            boxShadow: '0 32px 90px -24px rgba(0,0,0,.92)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: '4rem',
              height: '4rem',
              margin: '0 0 1.5rem',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              border: '1px solid rgba(241,111,122,.28)',
              background: 'rgba(241,111,122,.1)',
              color: '#f16f7a',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            !
          </div>
          <p style={{ margin: '0 0 .75rem', color: '#f16f7a', fontSize: '.68rem', fontWeight: 750, letterSpacing: '.14em', textTransform: 'uppercase' }}>
            Falha geral da aplicação
          </p>
          <h1 style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 'clamp(1.65rem, 5vw, 2.25rem)', lineHeight: 1.1, letterSpacing: '-.035em', fontWeight: 600, margin: 0 }}>
            O Biblion precisa ser recarregado.
          </h1>
          <p style={{ fontSize: '.9rem', color: '#a7adbd', lineHeight: 1.75, margin: '.9rem auto 0', maxWidth: '25rem' }}>
            Encontramos uma falha inesperada na estrutura da aplicação. Seus dados não foram removidos.
          </p>
          {error.digest && (
            <p style={{ display: 'inline-block', margin: '1rem 0 0', border: '1px solid rgba(226,232,255,.075)', borderRadius: '.55rem', padding: '.4rem .65rem', color: '#737b90', fontFamily: 'ui-monospace, monospace', fontSize: '.7rem' }}>
              Referência: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: '.65rem', marginTop: '1.75rem' }}>
            <button
              type="button"
              className="global-error-action"
              onClick={unstable_retry}
              style={{
                minHeight: '2.75rem',
                border: '1px solid rgba(150,119,255,.55)',
                borderRadius: '.75rem',
                background: '#825cf6',
                color: '#fff',
                padding: '.65rem 1rem',
                fontSize: '.875rem',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'transform .18s ease, filter .18s ease',
              }}
            >
              Tentar novamente
            </button>
            <a
              href="/dashboard"
              className="global-error-action"
              style={{
                minHeight: '2.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid rgba(226,232,255,.14)',
                borderRadius: '.75rem',
                background: '#111727',
                color: '#f7f7fb',
                padding: '.65rem 1rem',
                fontSize: '.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'transform .18s ease, filter .18s ease',
              }}
            >
              Ir para o painel
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
