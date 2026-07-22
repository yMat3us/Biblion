'use client'

import { useState } from 'react'
import {
  Activity,
  CalendarClock,
  Crown,
  Fingerprint,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { ROLE_LABELS, type UserRoleName } from '@/types/auth'

interface Account {
  id: string
  username: string
  role: UserRoleName
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  accentColor: string
  locale: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

interface ApiErrorBody { error?: { message?: string } }

async function readError(response: Response) {
  const body = await response.json().catch(() => null) as ApiErrorBody | null
  return body?.error?.message ?? 'Não foi possível concluir a operação.'
}

function accountInitial(account: Account) {
  return (account.displayName || account.username).trim().charAt(0).toUpperCase() || 'U'
}

export function AccountsClient({
  currentUserId,
  currentRole,
  initialAccounts,
}: {
  currentUserId: string
  currentRole: UserRoleName
  initialAccounts: Account[]
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'MEMBER' as UserRoleName })

  const roles: UserRoleName[] = currentRole === 'OWNER' ? ['MEMBER', 'ADMIN', 'OWNER'] : ['MEMBER']
  const activeAccounts = accounts.filter((account) => account.isActive).length
  const privilegedAccounts = accounts.filter((account) => account.role === 'OWNER' || account.role === 'ADMIN').length

  function canEdit(account: Account) {
    if (currentRole === 'OWNER') return true
    return currentRole === 'ADMIN' && account.role === 'MEMBER'
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error(await readError(response))
      const account = await response.json() as Account
      setAccounts((items) => [...items, account])
      setForm({ username: '', displayName: '', password: '', role: 'MEMBER' })
      toast.success('Conta criada com sucesso.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a conta.')
    } finally {
      setCreating(false)
    }
  }

  async function updateAccount(id: string, patch: Partial<Pick<Account, 'role' | 'isActive'>>) {
    setUpdatingId(id)
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error(await readError(response))
      const account = await response.json() as Account
      setAccounts((items) => items.map((item) => item.id === id ? account : item))
      toast.success('Conta atualizada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a conta.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function requestRoleChange(account: Account, role: UserRoleName) {
    if (role === account.role) return
    if (role === 'OWNER' || account.role === 'OWNER') {
      const accepted = await confirm({
        title: 'Alterar permissão proprietária',
        message: `Esta mudança concede ou remove controle total da conta de ${account.displayName || account.username}. Deseja continuar?`,
        confirmText: 'Alterar permissão',
      })
      if (!accepted) return
    }
    await updateAccount(account.id, { role })
  }

  return (
    <WorkspacePage size="full" archetype="administration">
      <PageHeader
        variant="administration"
        index="Governança do acervo · acessos e papéis"
        eyebrow={<><Crown size={13} /> Administração segura</>}
        title={<>Pessoas, acessos e <span className="text-gradient">responsabilidades.</span></>}
        description="Conceda acesso individual, distribua papéis com intenção e preserve o isolamento do acervo sem compartilhar credenciais."
        action={<Badge variant="default"><Fingerprint size={12} /> Você é {ROLE_LABELS[currentRole]}</Badge>}
        aside={
          <div className="account-ledger">
            <div><span>01</span><p>Total</p><strong>{accounts.length}</strong></div>
            <div><span>02</span><p>Ativas</p><strong className="text-success">{activeAccounts}</strong></div>
            <div><span>03</span><p>Gestores</p><strong className="text-primary-hover">{privilegedAccounts}</strong></div>
          </div>
        }
      />

      <div className="accounts-workspace grid gap-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <form onSubmit={createAccount} className="account-invite form-section form-section--accent h-fit space-y-5 xl:sticky xl:top-6">
          <SectionHeading
            icon={UserPlus}
            title="Novo acesso"
            description="Crie credenciais individuais e defina a permissão inicial."
          />
          <Input
            label="Usuário"
            autoComplete="off"
            autoCapitalize="none"
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            value={form.username}
            onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))}
            icon={<Fingerprint size={16} />}
            placeholder="nome.sobrenome"
            hint="Letras, números, ponto, hífen ou sublinhado."
          />
          <Input
            label="Nome de exibição"
            required
            maxLength={80}
            value={form.displayName}
            onChange={(event) => setForm((value) => ({ ...value, displayName: event.target.value }))}
            icon={<UserCheck size={16} />}
            placeholder="Nome da pessoa"
          />
          <Input
            label="Senha inicial"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            value={form.password}
            onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
            icon={<ShieldCheck size={16} />}
            hint="A pessoa poderá trocar a senha no próprio perfil."
          />
          <label className="block">
            <span className="field-label mb-1.5 block">Cargo inicial</span>
            <select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value as UserRoleName }))} className="select-field">
              {roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </label>
          <Button type="submit" loading={creating} className="w-full">
            <UserPlus size={16} /> Criar conta
          </Button>
        </form>

        <section className="accounts-registry">
          <div className="flex flex-col gap-3 border-b border-hairline px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <SectionHeading icon={Users} title="Equipe e acessos" description="Status, atividade recente e nível de permissão de cada conta." className="mb-0" />
            <Badge variant="outline">{accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}</Badge>
          </div>

          <div className="divide-y divide-hairline">
            {accounts.map((account, index) => {
              const editable = canEdit(account)
              const isSelf = account.id === currentUserId
              const updating = updatingId === account.id
              return (
                <article key={account.id} className="account-row group">
                  <span className="account-row__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft bg-cover bg-center text-sm font-semibold text-primary"
                      style={account.avatarUrl ? { backgroundImage: `url(${JSON.stringify(account.avatarUrl)})` } : undefined}
                    >
                      {!account.avatarUrl && accountInitial(account)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{account.displayName || account.username}</p>
                        {isSelf && <Badge variant="default">Você</Badge>}
                        <Badge variant={account.isActive ? 'success' : 'outline'}>
                          <span className={`h-1.5 w-1.5 rounded-full ${account.isActive ? 'bg-success' : 'bg-subtle'}`} />
                          {account.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-subtle">@{account.username}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtle">
                        <span className="flex items-center gap-1.5"><CalendarClock size={12} /> Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span className="flex items-center gap-1.5"><Activity size={12} /> {account.lastLoginAt ? `Último acesso ${new Date(account.lastLoginAt).toLocaleDateString('pt-BR')}` : 'Ainda não acessou'}</span>
                      </div>
                    </div>
                  </div>

                  {editable ? (
                    <label className="block">
                      <span className="field-label mb-1.5 block">Permissão</span>
                      <select
                        value={account.role}
                        disabled={updating}
                        onChange={(event) => void requestRoleChange(account, event.target.value as UserRoleName)}
                        className="select-field h-10 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                      </select>
                    </label>
                  ) : (
                    <div>
                      <span className="field-label mb-1.5 block">Permissão</span>
                      <div className="flex h-10 items-center rounded-xl border border-hairline bg-elevated/45 px-3" aria-label={`Permissão: ${ROLE_LABELS[account.role]}`}>
                        <Badge variant={account.role === 'OWNER' ? 'default' : 'outline'}>{ROLE_LABELS[account.role]}</Badge>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant={account.isActive ? 'outline' : 'secondary'}
                    size="sm"
                    loading={updating}
                    disabled={!editable || isSelf}
                    onClick={() => updateAccount(account.id, { isActive: !account.isActive })}
                    className={account.isActive ? 'hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive' : 'text-success'}
                  >
                    <ShieldCheck size={14} /> {account.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </WorkspacePage>
  )
}
