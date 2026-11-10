import { computed } from 'vue'
import { useApi } from '@/composables/useApi'

export interface MovieNotification {
  id: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export function useNotifications() {
  const api = useApi()
  const items = useState<MovieNotification[]>('notifications', () => [])
  const unreadCount = computed(() => items.value.filter(item => !item.readAt).length)

  async function refresh() {
    if (!api.token.value) {
      items.value = []
      return
    }
    items.value = await api.request<MovieNotification[]>('/notifications')
  }

  async function markRead(id: string) {
    await api.request(`/notifications/${id}/read`, { method: 'PATCH' })
    items.value = items.value.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)
  }

  return { items, unreadCount, refresh, markRead }
}
