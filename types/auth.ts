export type UserRoleName = 'OWNER' | 'ADMIN' | 'MEMBER'
export type UserAccent = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose'

export interface CurrentUserView {
  id: string
  username: string
  role: UserRoleName
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  accentColor: string
  locale: string
}

export const ROLE_LABELS: Record<UserRoleName, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
}

export const ACCENT_OPTIONS: Array<{ value: UserAccent; label: string; color: string; hover: string }> = [
  { value: 'violet', label: 'Violeta', color: '#7c6cf6', hover: '#8f81ff' },
  { value: 'blue', label: 'Azul', color: '#4f8ef7', hover: '#6da1ff' },
  { value: 'emerald', label: 'Esmeralda', color: '#36b984', hover: '#4ccb96' },
  { value: 'amber', label: 'Âmbar', color: '#d8a33f', hover: '#e7b556' },
  { value: 'rose', label: 'Rosa', color: '#e2637c', hover: '#ed7f94' },
]

export function accentFor(value: string) {
  return ACCENT_OPTIONS.find((option) => option.value === value) ?? ACCENT_OPTIONS[0]
}

export function userInitial(user: Pick<CurrentUserView, 'displayName' | 'username'>) {
  return (user.displayName || user.username).trim().charAt(0).toLocaleUpperCase('pt-BR') || 'U'
}
