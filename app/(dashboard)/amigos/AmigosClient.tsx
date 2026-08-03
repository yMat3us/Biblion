'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Clock, Inbox, MessageCircle, Search, Send, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'
import type { RelationshipStatus } from '@/lib/services/social'

interface SocialUser {
  id: string
  publicId: string | null
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  status: RelationshipStatus
}

type Aba = 'amigos' | 'recebidas' | 'enviadas'

const ABAS: Array<{ id: Aba; label: string; icon: typeof Users }> = [
  { id: 'amigos', label: 'Amigos', icon: Users },
  { id: 'recebidas', label: 'Solicitações', icon: Inbox },
  { id: 'enviadas', label: 'Enviadas', icon: Send },
]

export function AmigosClient({ amigosIniciais }: { amigosIniciais: SocialUser[] }) {
  const toast = useToast()
  const router = useRouter()

  async function iniciarConversa(alvoId: string) {
    try {
      const response = await fetch('/api/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alvoId }),
      })
      if (!response.ok) throw new Error('conversa-failed')
      const data = (await response.json()) as { id: string }
      router.push(`/conversas/${data.id}`)
    } catch {
      toast.error('Não foi possível abrir a conversa.')
    }
  }

  const [aba, setAba] = useState<Aba>('amigos')
  const [cache, setCache] = useState<Record<Aba, SocialUser[] | null>>({ amigos: amigosIniciais, recebidas: null, enviadas: null })
  const [carregando, setCarregando] = useState(false)

  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<SocialUser[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function carregarAba(proxima: Aba) {
    setAba(proxima)
    if (cache[proxima] !== null) return
    setCarregando(true)
    try {
      const response = await fetch(`/api/amigos?escopo=${proxima}`)
      if (!response.ok) throw new Error('load-failed')
      const data = (await response.json()) as { usuarios: SocialUser[] }
      setCache((atual) => ({ ...atual, [proxima]: data.usuarios }))
    } catch {
      toast.error('Não foi possível carregar a lista.')
    } finally {
      setCarregando(false)
    }
  }

  async function buscar(event: React.FormEvent) {
    event.preventDefault()
    if (query.trim().length < 2) return
    setBuscando(true)
    try {
      const response = await fetch(`/api/usuarios?q=${encodeURIComponent(query.trim())}`)
      if (!response.ok) throw new Error('search-failed')
      const data = (await response.json()) as { usuarios: SocialUser[] }
      setResultados(data.usuarios)
    } catch {
      toast.error('Não foi possível buscar usuários.')
    } finally {
      setBuscando(false)
    }
  }

  function aplicarStatus(id: string, status: RelationshipStatus) {
    setResultados((atual) => atual?.map((u) => (u.id === id ? { ...u, status } : u)) ?? atual)
    setCache((atual) => {
      const proximo = { ...atual }
      for (const chave of Object.keys(proximo) as Aba[]) {
        const lista = proximo[chave]
        if (lista) proximo[chave] = lista.map((u) => (u.id === id ? { ...u, status } : u))
      }
      return proximo
    })
  }

  async function acao(url: string, body: Record<string, unknown>, alvo: SocialUser, otimista: RelationshipStatus, sucesso?: string) {
    if (ocupado) return
    setOcupado(alvo.id)
    aplicarStatus(alvo.id, otimista)
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!response.ok) throw new Error('action-failed')
      const data = (await response.json()) as { status?: RelationshipStatus }
      if (data.status) aplicarStatus(alvo.id, data.status)
      // Remove das listas de pendências quando resolvido.
      if (aba === 'recebidas' || aba === 'enviadas') {
        setCache((atual) => ({ ...atual, [aba]: (atual[aba] ?? []).filter((u) => u.id !== alvo.id) }))
      }
      if (sucesso) toast.success(sucesso)
    } catch {
      aplicarStatus(alvo.id, alvo.status)
      toast.error('Não foi possível concluir a ação.')
    } finally {
      setOcupado(null)
    }
  }

  const lista = cache[aba] ?? []

  return (
    <WorkspacePage archetype="cabinet" size="wide">
      <PageHeader
        variant="cabinet"
        index="Comunidade"
        eyebrow="Comunhão e edificação"
        title="Amigos"
        description="Encontre irmãos, acompanhe solicitações e caminhem juntos na Palavra. Comunicação respeitosa, sem ruído."
      />

      <form onSubmit={buscar} className="mb-6 flex gap-2">
        <Input
          icon={<Search size={16} />}
          placeholder="Buscar por nome, usuário ou ID…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar usuários"
          className="flex-1"
        />
        <Button type="submit" loading={buscando} disabled={query.trim().length < 2}>Buscar</Button>
      </form>

      {resultados !== null && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Resultados da busca</h2>
            <button type="button" onClick={() => { setResultados(null); setQuery('') }} className="text-xs text-subtle hover:text-foreground">Limpar</button>
          </div>
          {resultados.length === 0 ? (
            <p className="surface p-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {resultados.map((u) => <UsuarioCard key={u.id} usuario={u} ocupado={ocupado === u.id} onAcao={acao} onMensagem={iniciarConversa} />)}
            </div>
          )}
        </section>
      )}

      <div className="mb-6 flex gap-1.5" role="tablist" aria-label="Listas de amizade">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => carregarAba(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
              aba === id ? 'border-primary/40 bg-primary-soft text-primary' : 'border-hairline-strong bg-background/40 text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <span aria-hidden="true" className="empty-state__halo" />
          <span className="empty-state__icon"><Users size={24} /></span>
          <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground">
            {aba === 'amigos' ? 'Você ainda não tem amigos. Busque irmãos pelo nome ou ID.' : aba === 'recebidas' ? 'Nenhuma solicitação recebida.' : 'Nenhuma solicitação enviada.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {lista.map((u) => <UsuarioCard key={u.id} usuario={u} ocupado={ocupado === u.id} onAcao={acao} onMensagem={iniciarConversa} />)}
        </div>
      )}
    </WorkspacePage>
  )
}

function UsuarioCard({
  usuario,
  ocupado,
  onAcao,
  onMensagem,
}: {
  usuario: SocialUser
  ocupado: boolean
  onAcao: (url: string, body: Record<string, unknown>, alvo: SocialUser, otimista: RelationshipStatus, sucesso?: string) => void
  onMensagem: (alvoId: string) => void
}) {
  const nome = usuario.displayName || usuario.username
  const conteudoNome = (
    <>
      <span className="block truncate font-medium text-foreground">{nome}</span>
      <span className="block truncate text-xs text-subtle">@{usuario.username}</span>
    </>
  )

  return (
    <div className="surface flex items-center gap-3 p-3.5">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft bg-cover bg-center font-semibold text-primary"
        style={usuario.avatarUrl ? { backgroundImage: `url(${JSON.stringify(usuario.avatarUrl)})` } : undefined}
      >
        {!usuario.avatarUrl && nome.charAt(0).toLocaleUpperCase('pt-BR')}
      </span>
      <div className="min-w-0 flex-1">
        {usuario.publicId ? <Link href={`/u/${usuario.publicId}`} className="hover:underline">{conteudoNome}</Link> : conteudoNome}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {usuario.status === 'friends' && (
          <>
            <Button size="sm" variant="outline" onClick={() => onMensagem(usuario.id)} aria-label={`Enviar mensagem para ${usuario.displayName || usuario.username}`}>
              <MessageCircle size={14} />
            </Button>
            <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => onAcao('/api/amigos/remover', { alvoId: usuario.id }, usuario, 'none')}>
              <UserMinus size={14} /> Remover
            </Button>
          </>
        )}
        {usuario.status === 'pending_received' && (
          <>
            <Button size="sm" disabled={ocupado} onClick={() => onAcao('/api/amigos/responder', { solicitanteId: usuario.id, aceitar: true }, usuario, 'friends', `Agora vocês são amigos.`)}>
              <Check size={14} /> Aceitar
            </Button>
            <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => onAcao('/api/amigos/responder', { solicitanteId: usuario.id, aceitar: false }, usuario, 'none')}>
              <X size={14} />
            </Button>
          </>
        )}
        {usuario.status === 'pending_sent' && <Badge variant="outline"><Clock size={11} /> Enviada</Badge>}
        {usuario.status === 'none' && (
          <Button size="sm" disabled={ocupado} onClick={() => onAcao('/api/amigos/solicitar', { alvoId: usuario.id }, usuario, 'pending_sent')}>
            <UserPlus size={14} /> Adicionar
          </Button>
        )}
      </div>
    </div>
  )
}
