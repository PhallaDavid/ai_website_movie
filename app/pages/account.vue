<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bell, Film, ShoppingBag } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNotifications } from '@/composables/useNotifications'
import { useTheme } from '@/composables/useTheme'
import { useApi, type ApiOrder } from '@/composables/useApi'
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase.client'

const api = useApi()
const { items: notifications, refresh: refreshNotifications, markRead } = useNotifications()
const { initTheme } = useTheme()
const orders = ref<ApiOrder[]>([])
const name = ref('')
const bio = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('error')
const apiOnline = ref<boolean | null>(null)
const signingIn = ref(false)
const firebaseConfig = useRuntimeConfig().public
const firebaseReady = Boolean(firebaseConfig.firebaseApiKey && firebaseConfig.firebaseAuthDomain && firebaseConfig.firebaseProjectId && firebaseConfig.firebaseAppId)
async function load() {
  if (!api.token.value) return
  await api.refresh()
  name.value = api.user.value?.name || ''
  bio.value = api.user.value?.bio || ''
  orders.value = await api.request<ApiOrder[]>('/orders/me')
  await refreshNotifications()
}
async function save() {
  try { api.user.value = await api.request('/users/me', { method: 'PATCH', body: { name: name.value, bio: bio.value } }); messageType.value = 'success'; message.value = 'Profile saved.' }
  catch (error: any) { messageType.value = 'error'; message.value = error?.data?.message || 'Could not save profile.' }
}
async function read(id: string) {
  try { await markRead(id) }
  catch { messageType.value = 'error'; message.value = 'Could not mark notification as read.' }
}
async function pay(id: string) {
  try {
    const checkout = await api.request<{ url: string }>(`/orders/${id}/checkout`, { method: 'POST' })
    if (checkout.url) window.location.assign(checkout.url)
  } catch (error: any) { messageType.value = 'error'; message.value = error?.data?.message || 'Online checkout is unavailable.' }
}
async function signOut() {
  try { if (firebaseReady) await firebaseSignOut(getFirebaseAuth()) } catch { /* Local session still ends. */ }
  api.logout()
  orders.value = []
  message.value = ''
}
async function signIn() {
  message.value = ''
  messageType.value = 'error'
  signingIn.value = true
  try {
    await api.request('/health')
    apiOnline.value = true
  } catch {
    apiOnline.value = false
    message.value = 'The account service is unavailable. Please try again shortly.'
    signingIn.value = false
    return
  }
  try {
    const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
    await api.firebaseLogin(await result.user.getIdToken())
    await load()
  } catch (error: any) {
    message.value = error?.data?.message || error?.message || 'Google sign-in failed.'
  } finally { signingIn.value = false }
}
onMounted(() => {
  initTheme()
  api.restore()
  load().catch(() => {})
  api.request('/health').then(() => { apiOnline.value = true }).catch(() => { apiOnline.value = false })
})
</script>
<template>
  <main class="min-h-screen bg-background text-foreground">
    <header class="border-b border-border/70"><div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"><NuxtLink to="/" class="flex items-center gap-2 text-lg font-bold"><span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Film class="size-5" /></span>MerlRg KH</NuxtLink><div class="flex items-center gap-2"><NotificationMenu v-if="api.user.value" /><Button v-if="api.user.value" variant="outline" size="sm" @click="signOut">Sign out</Button><NuxtLink v-else to="/" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft class="size-4" /> Movies</NuxtLink></div></div></header>
    <div class="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8">
    <div v-if="api.user.value"><NuxtLink to="/" class="text-sm text-muted-foreground hover:text-foreground">← Back to movies</NuxtLink><h1 class="mt-3 text-3xl font-bold">My account</h1></div>
    <p v-if="message" :role="messageType === 'error' ? 'alert' : 'status'" :class="['text-sm', messageType === 'error' ? 'text-destructive' : 'text-foreground']">{{ message }}</p>
    <div v-if="!api.user.value" class="grid min-h-[calc(100vh-10rem)] items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-20">
      <section class="max-w-xl">
        <Badge variant="secondary" class="mb-5 rounded-full px-3 py-1 text-xs">Your movie account</Badge>
        <h1 class="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Your movies, ready when you are<span class="text-primary">.</span></h1>
        <p class="mt-5 max-w-md text-base leading-7 text-muted-foreground">Sign in to keep your purchases, watch access, and account updates together in one place.</p>
        <div class="mt-9 grid max-w-md gap-5 sm:grid-cols-2">
          <div class="flex items-start gap-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShoppingBag class="size-4" /></span><div><p class="text-sm font-semibold">Your orders</p><p class="mt-1 text-xs leading-5 text-muted-foreground">Find purchases and watch your movies.</p></div></div>
          <div class="flex items-start gap-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bell class="size-4" /></span><div><p class="text-sm font-semibold">Updates for you</p><p class="mt-1 text-xs leading-5 text-muted-foreground">See order and account notifications.</p></div></div>
        </div>
      </section>
      <Card class="w-full border-border/80 shadow-xl shadow-black/5"><CardHeader class="space-y-3 p-6 pb-3 sm:p-8 sm:pb-3"><span class="flex size-11 items-center justify-center rounded-xl border border-border bg-muted/50 text-primary"><Film class="size-5" /></span><CardTitle class="text-2xl">Welcome back</CardTitle><CardDescription class="text-sm leading-6">Continue with your Google account to access your profile, orders, and notifications.</CardDescription></CardHeader><CardContent class="p-6 pt-4 sm:p-8 sm:pt-4"><Button v-if="firebaseReady" :disabled="signingIn" class="h-11 w-full gap-3 text-sm font-semibold" @click="signIn"><svg class="size-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 5.38 6.51 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.91 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.51 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>{{ signingIn ? 'Connecting...' : 'Continue with Google' }}</Button><p v-else class="text-sm text-muted-foreground">Add Firebase web configuration to enable sign-in.</p><p v-if="apiOnline === false" class="mt-3 text-sm text-destructive">The account service is currently unavailable.</p><p class="mt-5 text-center text-xs text-muted-foreground">Your account is created when you sign in for the first time.</p></CardContent></Card>
    </div>
    <template v-else>
      <Card><CardHeader><div class="flex items-center gap-4"><img v-if="api.user.value.avatarUrl" :src="api.user.value.avatarUrl" :alt="api.user.value.name" class="size-14 rounded-full object-cover" /><div><CardTitle>{{ api.user.value.name }}</CardTitle><CardDescription>{{ api.user.value.email }}</CardDescription></div></div></CardHeader><CardContent class="flex flex-col gap-4"><label class="flex flex-col gap-2 text-sm">Display name <Input v-model="name" maxlength="80" /></label><label class="flex flex-col gap-2 text-sm">Bio <Input v-model="bio" maxlength="500" /></label><Button class="w-fit" @click="save">Save profile</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>My orders</CardTitle></CardHeader><CardContent class="flex flex-col gap-3"><p v-if="!orders.length" class="text-sm text-muted-foreground">No orders yet.</p><div v-for="order in orders" :key="order.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"><div><p class="font-medium">{{ order.movie?.title }}</p><p class="text-xs text-muted-foreground">{{ new Date(order.createdAt).toLocaleDateString() }} Â· ${{ (order.amountCents / 100).toFixed(2) }}</p></div><div class="flex items-center gap-2"><Badge variant="secondary">{{ order.status }}</Badge><Button v-if="order.status === 'PENDING'" size="sm" @click="pay(order.id)">Pay now</Button><NuxtLink v-if="order.status === 'PAID'" :to="`/watch/${order.movieId}`" class="text-sm underline">Watch</NuxtLink></div></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Notifications</CardTitle></CardHeader><CardContent class="flex flex-col gap-3"><p v-if="!notifications.length" class="text-sm text-muted-foreground">No notifications yet.</p><div v-for="notice in notifications" :key="notice.id" class="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"><div><p class="font-medium">{{ notice.title }}</p><p class="text-sm text-muted-foreground">{{ notice.message }}</p></div><Button v-if="!notice.readAt" variant="outline" size="sm" @click="read(notice.id)">Mark read</Button></div></CardContent></Card>
      <NuxtLink v-if="api.user.value.role === 'ADMIN'" to="/dashboard" class="text-sm underline">Open dashboard â†’</NuxtLink>
    </template>
  </div></main>
</template>

