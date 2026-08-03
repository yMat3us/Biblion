'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  BookMarked,
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageCircle,
  Mic,
  Music4,
  PenTool,
  Search,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ROLE_LABELS, userInitial, type CurrentUserView } from '@/types/auth'

interface NavigationLink {
  href: string
  label: string
  icon: LucideIcon
  index: string
  tone: 'primary' | 'scripture' | 'info' | 'success' | 'neutral'
}

const mainLinks: NavigationLink[] = [
  { href: '/dashboard', label: 'Fólio diário', icon: LayoutDashboard, index: '01', tone: 'primary' },
  { href: '/biblia', label: 'Bíblia', icon: BookOpen, index: '02', tone: 'scripture' },
  { href: '/hinos', label: 'Harpa Cristã', icon: Music4, index: '03', tone: 'success' },
  { href: '/planos', label: 'Planos de leitura', icon: ListChecks, index: '04', tone: 'info' },
  { href: '/sermoes', label: 'Sermões', icon: Mic, index: '05', tone: 'primary' },
  { href: '/ebd', label: 'Escola Bíblica', icon: GraduationCap, index: '06', tone: 'success' },
  { href: '/busca', label: 'Busca inteligente', icon: Search, index: '07', tone: 'info' },
]

const resourceLinks: NavigationLink[] = [
  { href: '/esbocos', label: 'Esboços', icon: FileText, index: '08', tone: 'primary' },
  { href: '/anotacoes', label: 'Anotações', icon: PenTool, index: '09', tone: 'scripture' },
  { href: '/teologia', label: 'Teologia sistemática', icon: BookMarked, index: '10', tone: 'info' },
]

export function Sidebar({ user, onClose }: { user: CurrentUserView; onClose?: () => void }) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const canManageAccounts = user.role === 'OWNER' || user.role === 'ADMIN'

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok && response.status !== 401) throw new Error('session-revocation-failed')
      navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_PRIVATE_CACHES' })
      window.location.replace('/login')
    } catch {
      setLogoutError('Não foi possível revogar a sessão. Verifique sua conexão e tente novamente.')
      setLoggingOut(false)
    }
  }

  const renderLink = (link: NavigationLink) => {
    const Icon = link.icon
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`)

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        data-active={active || undefined}
        data-tone={link.tone}
        className="sidebar-link group"
      >
        <span className="sidebar-link__index" aria-hidden="true">{link.index}</span>
        <span className="sidebar-link__icon"><Icon size={16} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1 truncate">{link.label}</span>
        <ChevronRight size={13} className="sidebar-link__arrow" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <aside aria-label="Barra lateral" className="sidebar-shell">
      <div className="sidebar-brand-row">
        <Link href="/dashboard" onClick={onClose} className="sidebar-brand group" aria-label="Biblion — início">
          <span className="sidebar-brand__mark" aria-hidden="true">
            <BookOpen size={21} strokeWidth={1.8} />
            <span />
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-[1.18rem] font-semibold tracking-[-0.025em] text-foreground">Biblion</span>
            <span className="index-label mt-0.5 block truncate">Códice de estudo</span>
          </span>
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar menu" className="sidebar-close lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <nav aria-label="Navegação principal" className="sidebar-navigation scrollbar-hide">
        <section aria-labelledby="nav-reading">
          <div className="sidebar-section-label">
            <span aria-hidden="true">I</span>
            <p id="nav-reading">Leitura e preparo</p>
          </div>
          <div className="space-y-0.5">{mainLinks.map(renderLink)}</div>
        </section>

        <Link
          href="/tutor"
          onClick={onClose}
          aria-current={pathname === '/tutor' || pathname.startsWith('/tutor/') ? 'page' : undefined}
          data-active={pathname === '/tutor' || pathname.startsWith('/tutor/') || undefined}
          className="sidebar-tutor group"
        >
          <span className="sidebar-tutor__icon"><Sparkles size={16} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              Gabinete teológico
              <span className="index-label text-primary-hover">IA</span>
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">Dialogue com seu acervo.</span>
          </span>
          <ChevronRight size={13} className="text-subtle transition-transform group-hover:translate-x-0.5" />
        </Link>

        <section aria-labelledby="nav-archive">
          <div className="sidebar-section-label">
            <span aria-hidden="true">II</span>
            <p id="nav-archive">Arquivo pessoal</p>
          </div>
          <div className="space-y-0.5">{resourceLinks.map(renderLink)}</div>
        </section>

        <section aria-labelledby="nav-account">
          <div className="sidebar-section-label">
            <span aria-hidden="true">III</span>
            <p id="nav-account">Administração</p>
          </div>
          <div className="space-y-0.5">
            {renderLink({ href: '/amigos', label: 'Comunidade', icon: UsersRound, index: '11', tone: 'primary' })}
            {renderLink({ href: '/conversas', label: 'Mensagens', icon: MessageCircle, index: '12', tone: 'info' })}
            {renderLink({ href: '/notificacoes', label: 'Notificações', icon: Bell, index: '13', tone: 'scripture' })}
            {renderLink({ href: '/perfil', label: 'Preferências', icon: Settings, index: '14', tone: 'neutral' })}
            {canManageAccounts && renderLink({ href: '/contas', label: 'Gerenciar contas', icon: Users, index: '15', tone: 'neutral' })}
          </div>
        </section>
      </nav>

      <div className="sidebar-account">
        <Link href="/perfil" onClick={onClose} className="sidebar-profile">
          <span
            className="sidebar-profile__avatar"
            style={user.avatarUrl ? { backgroundImage: `url(${JSON.stringify(user.avatarUrl)})` } : undefined}
          >
            {!user.avatarUrl && userInitial(user)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{user.displayName || user.username}</span>
            <span className="mt-0.5 block truncate text-[11px] text-subtle">{ROLE_LABELS[user.role]}</span>
          </span>
          <ChevronRight size={13} className="text-subtle" aria-hidden="true" />
        </Link>
        <button type="button" onClick={logout} disabled={loggingOut} className="sidebar-logout">
          <LogOut size={14} aria-hidden="true" />
          {loggingOut ? 'Encerrando sessão…' : 'Sair com segurança'}
        </button>
        {logoutError && <p role="alert" className="px-2 pt-2 text-xs leading-relaxed text-destructive">{logoutError}</p>}
      </div>
    </aside>
  )
}
