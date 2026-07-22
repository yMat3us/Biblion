'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  BookMarked,
  BookOpen,
  BrainCircuit,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Menu,
  Mic,
  MessageCircle,
  Music4,
  PenTool,
  Search,
  Settings,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { NotificationBell } from './NotificationBell'
import { accentFor, userInitial, type CurrentUserView } from '@/types/auth'

const routeMeta = [
  { prefix: '/dashboard', label: 'Fólio diário', shortLabel: 'Início', icon: LayoutDashboard, space: 'folio', index: '01' },
  { prefix: '/biblia', label: 'Bíblia', shortLabel: 'Bíblia', icon: BookOpen, space: 'scripture', index: '02' },
  { prefix: '/hinos', label: 'Harpa Cristã', shortLabel: 'Hinos', icon: Music4, space: 'library', index: '03' },
  { prefix: '/planos', label: 'Planos de leitura', shortLabel: 'Planos', icon: ListChecks, space: 'library', index: '04' },
  { prefix: '/sermoes', label: 'Sermões', shortLabel: 'Sermões', icon: Mic, space: 'manuscript', index: '05' },
  { prefix: '/ebd', label: 'Escola Bíblica', shortLabel: 'EBD', icon: GraduationCap, space: 'library', index: '06' },
  { prefix: '/tutor', label: 'Gabinete teológico', shortLabel: 'Tutor', icon: BrainCircuit, space: 'cabinet', index: '07' },
  { prefix: '/busca', label: 'Busca inteligente', shortLabel: 'Busca', icon: Search, space: 'atlas', index: '08' },
  { prefix: '/amigos', label: 'Comunidade', shortLabel: 'Amigos', icon: UsersRound, space: 'cabinet', index: '09' },
  { prefix: '/conversas', label: 'Mensagens', shortLabel: 'Chat', icon: MessageCircle, space: 'cabinet', index: '10' },
  { prefix: '/notificacoes', label: 'Notificações', shortLabel: 'Avisos', icon: Bell, space: 'cabinet', index: '11' },
  { prefix: '/anotacoes', label: 'Anotações', shortLabel: 'Notas', icon: PenTool, space: 'marginalia', index: '12' },
  { prefix: '/esbocos', label: 'Esboços', shortLabel: 'Esboços', icon: FileText, space: 'manuscript', index: '13' },
  { prefix: '/teologia', label: 'Teologia sistemática', shortLabel: 'Teologia', icon: BookMarked, space: 'atlas', index: '14' },
  { prefix: '/perfil', label: 'Preferências', shortLabel: 'Perfil', icon: Settings, space: 'administration', index: '15' },
  { prefix: '/contas', label: 'Gerenciar contas', shortLabel: 'Contas', icon: Users, space: 'administration', index: '16' },
] as const

const mobileDock = routeMeta.slice(0, 5)

export function DashboardLayout({
  children,
  user,
}: {
  children: React.ReactNode
  user: CurrentUserView
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const mobileNavigationRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const accent = accentFor(user.accentColor)
  const currentRoute = routeMeta.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`))
  const focusedChatRoute = pathname === '/tutor' || /^\/ebd\/[^/]+\/assistente\/?$/.test(pathname)
  const CurrentIcon = currentRoute?.icon ?? LayoutDashboard
  const mobileNavigationHidden = !isDesktop && !isMobileMenuOpen

  const accentStyle = {
    '--color-primary': accent.color,
    '--color-primary-hover': accent.hover,
    '--color-primary-soft': `${accent.color}24`,
    '--color-ring': accent.color,
  } as CSSProperties

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const syncViewport = () => setIsDesktop(media.matches)
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen || isDesktop) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      mobileNavigationRef.current?.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus()
    })
    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMobileMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(
        mobileNavigationRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute('inert') && element.getAttribute('aria-hidden') !== 'true')
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !mobileNavigationRef.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !mobileNavigationRef.current?.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleDrawerKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleDrawerKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [isDesktop, isMobileMenuOpen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        router.push('/busca')
        return
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const element = document.activeElement as HTMLElement | null
        const typing = element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.isContentEditable
        if (!typing) {
          event.preventDefault()
          router.push('/busca')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return (
    <div className="app-shell" data-space={currentRoute?.space ?? 'folio'} data-focus-mode={focusedChatRoute || undefined} style={accentStyle}>
      <button
        type="button"
        aria-label="Fechar menu"
        aria-hidden={!isMobileMenuOpen}
        tabIndex={-1}
        className={cn('fixed inset-0 z-40 bg-black/78 transition-opacity duration-300 lg:hidden', isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div
        ref={mobileNavigationRef}
        id="mobile-navigation"
        role={!isDesktop && isMobileMenuOpen ? 'dialog' : undefined}
        aria-modal={!isDesktop && isMobileMenuOpen ? true : undefined}
        aria-label={!isDesktop && isMobileMenuOpen ? 'Navegação principal' : undefined}
        aria-hidden={mobileNavigationHidden || undefined}
        inert={mobileNavigationHidden ? true : undefined}
        className={cn('fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0', isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full')}
      >
        <Sidebar user={user} onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      <div
        className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
        aria-hidden={!isDesktop && isMobileMenuOpen ? true : undefined}
        inert={!isDesktop && isMobileMenuOpen ? true : undefined}
      >
        <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
        <header className="shell-topbar">
          <button
            type="button"
            className="shell-menu-button lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menu"
            aria-controls="mobile-navigation"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={19} />
          </button>

          <div className="shell-location" aria-label="Localização atual">
            <span className="shell-location__index">{currentRoute?.index ?? '00'}</span>
            <span className="shell-location__icon"><CurrentIcon size={15} /></span>
            <span className="hidden truncate sm:block">{currentRoute?.label ?? 'Seu espaço'}</span>
          </div>

          <Link href="/busca" className="shell-search">
            <Search size={15} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-left">Buscar no seu códice</span>
            <kbd className="shell-search__key">Ctrl K</kbd>
          </Link>

          <NotificationBell />

          <Link href="/perfil" className="shell-profile" aria-label="Abrir perfil">
            <span
              className="shell-profile__avatar"
              style={user.avatarUrl ? { backgroundImage: `url(${JSON.stringify(user.avatarUrl)})` } : undefined}
            >
              {!user.avatarUrl && userInitial(user)}
            </span>
            <span className="hidden max-w-28 truncate md:block">{user.displayName || user.username}</span>
            <UserRound size={13} className="hidden text-subtle md:block" aria-hidden="true" />
          </Link>
        </header>

        <main id="main-content" tabIndex={-1} className="shell-main custom-scrollbar focus:outline-none">
          <div aria-hidden="true" className="shell-route-wash" />
          <div className={cn('relative min-h-full', focusedChatRoute ? 'pb-0' : 'pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-0')}>{children}</div>
        </main>

        {!focusedChatRoute && (
          <nav aria-label="Navegação rápida" className="mobile-dock lg:hidden">
            {mobileDock.map((route) => {
              const Icon = route.icon
              const active = pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
              return (
                <Link key={route.prefix} href={route.prefix} aria-current={active ? 'page' : undefined} data-active={active || undefined} className="mobile-dock__link">
                  <Icon size={18} aria-hidden="true" />
                  <span>{route.shortLabel}</span>
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
