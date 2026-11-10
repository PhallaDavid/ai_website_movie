export interface Account { id: string; email: string; name: string; avatarUrl?: string | null; bio?: string | null; role: 'USER' | 'ADMIN' }
export interface ApiMovie { id: string; title: string; description: string; genre: string; posterUrl?: string | null; priceCents: number; status?: string; createdAt?: string }
export interface ApiOrder { id: string; movieId: string; amountCents: number; status: string; createdAt: string; movie?: { id: string; title: string; posterUrl?: string | null }; user?: { name: string; email: string } }

export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase as string
  const token = useState<string | null>('auth-token', () => null)
  const user = useState<Account | null>('auth-user', () => null)
  const ready = useState('auth-ready', () => false)
  function restore() {
    if (import.meta.client && !ready.value) {
      token.value = sessionStorage.getItem('movie-token')
      ready.value = true
      if (token.value) refresh().catch(() => logout())
    }
  }
  async function request<T>(path: string, options: Record<string, any> = {}) {
    return $fetch<T>(`${base}/api${path}`, { ...options, headers: { ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}), ...(options.headers || {}) } })
  }
  async function refresh() { user.value = await request<Account>('/users/me') }
  async function firebaseLogin(idToken: string) {
    const result = await request<{ token: string; user: Account }>('/auth/firebase', { method: 'POST', body: { idToken } })
    token.value = result.token
    user.value = result.user
    sessionStorage.setItem('movie-token', result.token)
  }
  function logout() { token.value = null; user.value = null; useState<any[]>('notifications', () => []).value = []; if (import.meta.client) sessionStorage.removeItem('movie-token') }
  return { base, token, user, restore, request, refresh, firebaseLogin, logout }
}
