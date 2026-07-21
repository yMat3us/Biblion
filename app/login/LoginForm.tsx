'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Book,
  BookOpen,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { safeInternalPath } from '@/lib/navigation'

const PRODUCT_POINTS = [
  { icon: BookOpen, label: 'Leitura e estudo bíblico em profundidade' },
  { icon: Sparkles, label: 'Assistência teológica no contexto certo' },
  { icon: ShieldCheck, label: 'Acervo pessoal isolado e protegido' },
]

export function LoginForm({ from }: { from: string }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error?.message ?? 'Não foi possível entrar.')
        return
      }

      navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_PRIVATE_CACHES' })
      window.location.replace(safeInternalPath(from))
    } catch {
      setError('Falha de conexão. Verifique sua rede e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-gate">
      <div aria-hidden="true" className="login-gate__atmosphere" />
      <div className="login-gate__shell">
        <section className="login-brand-panel">
          <div aria-hidden="true" className="login-brand-panel__texture" />
          <div className="relative">
            <div className="inline-flex items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/35 bg-primary text-white shadow-glow">
                <Book size={20} />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-scripture" />
              </span>
              <div>
                <p className="text-lg font-semibold tracking-tight text-foreground">Biblion</p>
                <p className="eyebrow mt-0.5">Estudo com propósito</p>
              </div>
            </div>

            <div className="mt-16 max-w-xl">
              <p className="eyebrow mb-4 text-primary-hover">Seu ambiente de formação</p>
              <h1 className="text-[clamp(2.6rem,5vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-foreground">
                Conhecimento que se transforma em <span className="text-gradient-gold">sabedoria.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground">
                Bíblia, sermões, EBD e ferramentas inteligentes reunidos em um workspace contemplativo para servir melhor.
              </p>
            </div>

            <div className="login-manifesto">
              {PRODUCT_POINTS.map(({ icon: Icon, label }, index) => (
                <div key={label} className="login-manifesto__entry">
                  <span className="login-manifesto__index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="login-manifesto__icon"><Icon size={15} /></span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <blockquote className="relative mt-12 border-l-2 border-scripture/50 pl-5 font-serif text-sm italic leading-7 text-muted-foreground">
            “Ensina-nos a contar os nossos dias para que alcancemos coração sábio.”
            <cite className="mt-2 block font-sans text-[11px] not-italic uppercase tracking-[0.12em] text-scripture">Salmo 90:12</cite>
          </blockquote>
        </section>

        <section className="login-auth-panel">
          <div className="w-full max-w-[25rem]">
            <div className="mb-9 lg:hidden">
              <div className="mb-7 inline-flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-glow"><Book size={20} /></span>
                <div><p className="font-semibold text-foreground">Biblion</p><p className="eyebrow mt-0.5">Estudo com propósito</p></div>
              </div>
            </div>

            <div className="mb-7">
              <p className="eyebrow mb-3 text-primary-hover">Área protegida</p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Bem-vindo de volta.</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Entre para continuar de onde parou no seu acervo.</p>
            </div>

            <form onSubmit={handleSubmit} aria-busy={loading} className="login-auth-form space-y-5">
              <Input
                id="username"
                name="username"
                label="Usuário"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                minLength={3}
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                icon={<UserRound size={16} />}
                placeholder="seu.usuario"
              />

              <Input
                id="password"
                name="password"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={200}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                icon={<LockKeyhole size={16} />}
                placeholder="Sua senha"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-overlay hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <div aria-live="assertive" className="min-h-6">
                {error && (
                  <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <Button type="submit" size="lg" loading={loading} disabled={!username.trim() || password.length < 8} className="w-full">
                {!loading && <ArrowRight size={17} />}
                {loading ? 'Validando acesso…' : 'Entrar no Biblion'}
              </Button>
            </form>

            <div className="mt-7 flex items-start gap-3 rounded-xl border border-hairline bg-elevated/45 p-3.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" />
              <p className="text-xs leading-6 text-subtle">Sessão protegida por cookie HttpOnly, isolamento por conta e revogação no servidor.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
