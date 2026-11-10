<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Bell } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApi } from '@/composables/useApi'
import { useNotifications } from '@/composables/useNotifications'

const api = useApi()
const { items, unreadCount, refresh, markRead } = useNotifications()
const open = ref(false)
const error = ref('')

onMounted(() => api.restore())
watch(() => api.user.value?.id, (id) => {
  if (id) refresh().catch(() => { error.value = 'Could not load notifications.' })
  else items.value = []
}, { immediate: true })

function onOpen(value: boolean) {
  open.value = value
  if (value) refresh().catch(() => { error.value = 'Could not load notifications.' })
}

async function read(id: string) {
  try {
    error.value = ''
    await markRead(id)
  } catch { error.value = 'Could not mark notification as read.' }
}
</script>

<template>
  <DropdownMenu :open="open" @update:open="onOpen">
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-lg" class="relative rounded-full" aria-label="Notifications" :title="unreadCount ? `${unreadCount} unread notifications` : 'Notifications'">
        <Bell />
        <span v-if="unreadCount" class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-80 max-w-[calc(100vw-1rem)] p-2">
      <DropdownMenuLabel class="flex items-center justify-between gap-2 px-2 py-2">
        <span>Notifications</span>
        <span class="text-xs font-normal text-muted-foreground">{{ unreadCount ? `${unreadCount} unread` : 'All caught up' }}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <p v-if="error" role="alert" class="px-2 py-2 text-xs text-destructive">{{ error }}</p>
      <p v-if="!items.length" class="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
      <DropdownMenuGroup v-else class="max-h-80 overflow-y-auto">
        <DropdownMenuItem v-for="item in items.slice(0, 8)" :key="item.id" class="flex cursor-pointer items-start gap-3 px-2 py-3" @click="read(item.id)">
          <span class="mt-1.5 size-2 shrink-0 rounded-full" :class="item.readAt ? 'bg-transparent' : 'bg-primary'" />
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">{{ item.title }}</span>
            <span class="mt-0.5 block text-xs text-muted-foreground">{{ item.message }}</span>
            <span class="mt-1 block text-[11px] text-muted-foreground">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem class="justify-center text-xs font-semibold" @click="navigateTo('/account')">View account & orders</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
