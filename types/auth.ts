export type UserRoleName = 'OWNER' | 'ADMIN' | 'MEMBER'
export type UserAccent = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose'

export type ProfileVisibility = 'PRIVATE' | 'FRIENDS' | 'PUBLIC'

export interface CurrentUserView {
  id: string
  username: string
  role: UserRoleName
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  accentColor: string
  locale: string
  publicId: string | null
  isSearchable: boolean
  profileVisibility: ProfileVisibility
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

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value.trim())
}

/** Clareia um hex misturando-o com branco — usado para o estado :hover do tema. */
export function lightenHex(hex: string, amount = 0.16): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!match) return hex
  const int = parseInt(match[1], 16)
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255]
  const mixed = channels.map((c) => Math.round(c + (255 - c) * amount))
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export interface AccentTheme {
  value: string
  label: string
  color: string
  hover: string
}

export function accentFor(value: string): AccentTheme {
  const trimmed = value.trim()
  if (isHexColor(trimmed)) {
    return { value: trimmed, label: 'Personalizada', color: trimmed, hover: lightenHex(trimmed) }
  }
  return ACCENT_OPTIONS.find((option) => option.value === value) ?? ACCENT_OPTIONS[0]
}

export function userInitial(user: Pick<CurrentUserView, 'displayName' | 'username'>) {
  return (user.displayName || user.username).trim().charAt(0).toLocaleUpperCase('pt-BR') || 'U'
}
