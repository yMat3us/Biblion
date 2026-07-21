'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AtSign,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Palette,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Feedback'
import { ACCENT_OPTIONS, ROLE_LABELS, userInitial, type CurrentUserView, type UserAccent } from '@/types/auth'

interface ApiErrorBody { error?: { message?: string } }

interface ProfileForm {
  displayName: string
  bio: string
  avatarUrl: string
  accentColor: UserAccent
}

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as ApiErrorBody | null
  return body?.error?.message ?? fallback
}

function profileFromUser(user: CurrentUserView): ProfileForm {
  return {
    displayName: user.displayName ?? '',
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? '',
    accentColor: user.accentColor as UserAccent,
  }
}

export function ProfileClient({ user: initialUser }: { user: CurrentUserView }) {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState(initialUser)
  const [profile, setProfile] = useState<ProfileForm>(() => profileFromUser(initialUser))
  const [savedProfile, setSavedProfile] = useState<ProfileForm>(() => profileFromUser(initialUser))
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const profileDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)
  const passwordMismatch = Boolean(password.confirmation && password.newPassword !== password.confirmation)

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profileDirty) return
    setSavingProfile(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!response.ok) throw new Error(await errorMessage(response, 'Não foi possível salvar o perfil.'))
      const body = await response.json() as { user: CurrentUserView }
      const nextProfile = profileFromUser(body.user)
      setUser(body.user)
      setProfile(nextProfile)
      setSavedProfile(nextProfile)
      toast.success('Perfil atualizado com sucesso.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (passwordMismatch) {
      toast.error('A confirmação não coincide com a nova senha.')
      return
    }
    setSavingPassword(true)
    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: password.currentPassword, newPassword: password.newPassword }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, 'Não foi possível alterar a senha.'))
      const body = await response.json() as { success: boolean; reauthRequired?: boolean }
      setPassword({ currentPassword: '', newPassword: '', confirmation: '' })
      if (body.reauthRequired) {
        toast.success('Senha alterada. Entre novamente para continuar.')
        router.push('/login')
        router.refresh()
        return
      }
      toast.success('Senha alterada. As outras sessões foram encerradas.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a senha.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <WorkspacePage size="wide" archetype="administration">
      <PageHeader
        variant="administration"
        index="Identidade e segurança · conta pessoal"
        eyebrow={<><Fingerprint size={13} /> Administração pessoal</>}
        title={<>Sua presença dentro do <span className="text-gradient">Biblion.</span></>}
        description="Ajuste sua identificação, a assinatura visual do workspace e as credenciais que protegem o seu acervo."
        action={
          <Badge variant="success" className="px-3 py-1.5">
            <ShieldCheck size={13} /> Conta protegida
          </Badge>
        }
        aside={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline"><AtSign size={12} /> {user.username}</Badge>
            <Badge variant="default"><Fingerprint size={12} /> {ROLE_LABELS[user.role]}</Badge>
          </div>
        }
      />

      <div className="administration-workspace grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
        <form id="profile-form" onSubmit={saveProfile} className="profile-form form-section form-section--accent space-y-7">
          <SectionHeading
            icon={UserRound}
            title="Perfil e apresentação"
            description="As informações abaixo identificam você dentro do seu acervo pessoal."
          />

          <div className="profile-preview">
            <span
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] border border-primary/25 bg-primary-soft bg-cover bg-center text-2xl font-semibold text-primary shadow-glow"
              style={profile.avatarUrl ? { backgroundImage: `url(${JSON.stringify(profile.avatarUrl)})` } : undefined}
            >
              {!profile.avatarUrl && userInitial(user)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-xl font-semibold tracking-tight text-foreground">{profile.displayName || user.username}</p>
                <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-subtle">A imagem é exibida localmente a partir de uma URL HTTPS. Se preferir, deixe o campo vazio para usar suas iniciais.</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Nome de exibição"
              value={profile.displayName}
              onChange={(event) => setProfile((value) => ({ ...value, displayName: event.target.value }))}
              required
              maxLength={80}
              icon={<UserRound size={16} />}
              placeholder="Como devemos chamar você?"
            />
            <Input
              label="Avatar por URL HTTPS"
              type="url"
              value={profile.avatarUrl}
              onChange={(event) => setProfile((value) => ({ ...value, avatarUrl: event.target.value }))}
              maxLength={500}
              icon={<AtSign size={16} />}
              placeholder="https://…"
            />
          </div>

          <Textarea
            label="Bio"
            value={profile.bio}
            onChange={(event) => setProfile((value) => ({ ...value, bio: event.target.value }))}
            maxLength={500}
            rows={5}
            placeholder="Conte um pouco sobre seu ministério, chamado ou área de estudo."
            hint={`${profile.bio.length}/500 caracteres`}
          />

          <fieldset className="rounded-2xl border border-hairline bg-background/30 p-4 sm:p-5">
            <legend className="px-2 text-sm font-medium text-foreground">
              <span className="flex items-center gap-2"><Palette size={16} className="text-primary" /> Cor de destaque</span>
            </legend>
            <p className="mb-4 text-xs leading-relaxed text-subtle">Sua escolha acompanha botões, foco e detalhes de navegação em todo o produto.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACCENT_OPTIONS.map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="accent"
                    value={option.value}
                    checked={profile.accentColor === option.value}
                    onChange={() => setProfile((value) => ({ ...value, accentColor: option.value }))}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-12 items-center gap-3 rounded-xl border border-hairline bg-surface/55 px-3 text-xs font-medium text-muted-foreground transition-all hover:border-hairline-strong hover:bg-elevated peer-checked:border-primary/40 peer-checked:bg-primary-soft peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
                    <span className="h-4 w-4 rounded-full ring-2 ring-white/10" style={{ backgroundColor: option.color }} />
                    {option.label}
                    {profile.accentColor === option.value && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-subtle">{profileDirty ? 'Você tem alterações ainda não salvas.' : 'Seu perfil está sincronizado.'}</p>
            <Button type="submit" loading={savingProfile} disabled={!profileDirty} className="w-full sm:w-auto">
              <Save size={16} /> Salvar alterações
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="administration-card surface overflow-hidden p-5 sm:p-6">
            <SectionHeading icon={Fingerprint} title="Identidade da conta" description="Informações administradas pelo sistema." />
            <dl className="divide-y divide-hairline text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-subtle">Usuário</dt>
                <dd className="truncate font-medium text-foreground">{user.username}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-subtle">Permissão</dt>
                <dd><Badge variant="default">{ROLE_LABELS[user.role]}</Badge></dd>
              </div>
              <div className="py-3">
                <dt className="text-subtle">Privacidade</dt>
                <dd className="mt-1.5 leading-relaxed text-muted-foreground">Seu acervo é isolado pelo identificador desta conta.</dd>
              </div>
            </dl>
          </section>

          <form onSubmit={changePassword} className="administration-card form-section space-y-4">
            <SectionHeading
              icon={KeyRound}
              title="Segurança e senha"
              description="A alteração encerra todas as outras sessões abertas."
            />
            <Input
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              value={password.currentPassword}
              onChange={(event) => setPassword((value) => ({ ...value, currentPassword: event.target.value }))}
              required
              maxLength={200}
              icon={<LockKeyhole size={16} />}
            />
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              value={password.newPassword}
              onChange={(event) => setPassword((value) => ({ ...value, newPassword: event.target.value }))}
              required
              minLength={8}
              maxLength={200}
              icon={<KeyRound size={16} />}
              hint="Use no mínimo 8 caracteres."
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              value={password.confirmation}
              onChange={(event) => setPassword((value) => ({ ...value, confirmation: event.target.value }))}
              required
              minLength={8}
              maxLength={200}
              icon={<ShieldCheck size={16} />}
              error={passwordMismatch ? 'A confirmação não coincide com a nova senha.' : undefined}
            />
            <Button type="submit" variant="secondary" loading={savingPassword} disabled={passwordMismatch} className="w-full">
              <KeyRound size={15} /> Atualizar senha
            </Button>
          </form>
        </div>
      </div>
    </WorkspacePage>
  )
}
