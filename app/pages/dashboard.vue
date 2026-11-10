<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useApi, type ApiMovie, type ApiOrder } from '@/composables/useApi'

const api = useApi()
const tab = ref<'overview' | 'movies' | 'orders' | 'users'>('overview')
const stats = ref({ users: 0, movies: 0, pendingOrders: 0, paidOrders: 0, revenueCents: 0 })
const users = ref<any[]>([])
const movies = ref<ApiMovie[]>([])
const orders = ref<ApiOrder[]>([])
const form = ref({ title: '', description: '', genre: '', posterUrl: '', priceCents: 0 })
const uploadFiles = ref<Record<string, File>>({})
const error = ref('')
const busy = ref(false)
async function load() {
  try {
    await api.refresh()
    if (api.user.value?.role !== 'ADMIN') return
    ;[stats.value, users.value, movies.value, orders.value] = await Promise.all([
      api.request('/dashboard/stats'), api.request('/dashboard/users'), api.request('/movies/admin/all'), api.request('/orders'),
    ]) as any
  } catch (e: any) { error.value = e?.data?.message || 'Could not load dashboard.' }
}
async function createMovie() {
  busy.value = true; error.value = ''
  try { await api.request('/movies', { method: 'POST', body: form.value }); form.value = { title: '', description: '', genre: '', posterUrl: '', priceCents: 0 }; await load() }
  catch (e: any) { error.value = e?.data?.message || 'Could not create movie.' }
  finally { busy.value = false }
}
async function upload(id: string) {
  const file = uploadFiles.value[id]
  if (!file) return
  busy.value = true; error.value = ''
  try { const body = new FormData(); body.append('file', file); await api.request(`/movies/${id}/upload`, { method: 'POST', body }); await load() }
  catch (e: any) { error.value = e?.data?.message || 'Upload failed.' }
  finally { busy.value = false }
}
async function setMovieStatus(id: string, status: string) {
  try { await api.request(`/movies/${id}`, { method: 'PATCH', body: { status } }); await load() }
  catch (e: any) { error.value = e?.data?.message || 'Could not update movie.' }
}
async function setOrderStatus(id: string, status: string) {
  try { await api.request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }); await load() }
  catch (e: any) { error.value = e?.data?.message || 'Could not update order.' }
}
async function setUserStatus(id: string, status: string) {
  try { await api.request(`/dashboard/users/${id}/status`, { method: 'PATCH', body: { status } }); await load() }
  catch (e: any) { error.value = e?.data?.message || 'Could not update user.' }
}
onMounted(() => { api.restore(); load() })
</script>
<template>
  <div class="min-h-screen bg-background text-foreground lg:flex">
    <aside class="border-b border-border p-5 lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r"><NuxtLink to="/" class="text-xl font-black text-primary">MerlRg KH</NuxtLink><p class="mt-1 text-xs text-muted-foreground">Studio dashboard</p><nav class="mt-8 flex flex-wrap gap-2 lg:flex-col"><Button v-for="item in (['overview','movies','orders','users'] as const)" :key="item" :variant="tab === item ? 'secondary' : 'ghost'" class="justify-start capitalize" @click="tab = item">{{ item }}</Button></nav><NuxtLink to="/account" class="mt-8 block text-sm text-muted-foreground hover:text-foreground">← My account</NuxtLink></aside>
    <main class="min-w-0 flex-1 p-5 sm:p-8"><div class="mx-auto max-w-6xl"><header class="mb-8 flex flex-wrap items-end justify-between gap-3"><div><h1 class="text-3xl font-bold capitalize">{{ tab }}</h1><p class="mt-1 text-sm text-muted-foreground">Manage the movie catalog and customer activity.</p></div><Badge variant="secondary">{{ api.user.value?.name || 'Admin' }}</Badge></header>
      <p v-if="error" role="alert" class="mb-5 text-sm text-destructive">{{ error }}</p>
      <Card v-if="api.user.value?.role !== 'ADMIN'"><CardHeader><CardTitle>Admin access required</CardTitle><CardDescription>Sign in with an approved admin Google account.</CardDescription></CardHeader><CardContent><NuxtLink to="/account" class="underline">Go to sign in</NuxtLink></CardContent></Card>
      <template v-else>
        <div v-if="tab === 'overview'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Card v-for="metric in [{ label: 'Users', value: stats.users }, { label: 'Movies', value: stats.movies }, { label: 'Pending orders', value: stats.pendingOrders }, { label: 'Paid orders', value: stats.paidOrders }, { label: 'Revenue', value: '$' + (stats.revenueCents / 100).toFixed(2) }]" :key="metric.label"><CardHeader><CardDescription>{{ metric.label }}</CardDescription><CardTitle class="text-3xl">{{ metric.value }}</CardTitle></CardHeader></Card></div>
        <div v-if="tab === 'movies'" class="flex flex-col gap-6"><Card><CardHeader><CardTitle>Add a movie</CardTitle><CardDescription>Create a draft, upload its MP4, then publish it.</CardDescription></CardHeader><CardContent><form class="grid gap-3 md:grid-cols-2" @submit.prevent="createMovie"><Input v-model="form.title" placeholder="Title" required /><Input v-model="form.genre" placeholder="Genre" required /><Input v-model="form.posterUrl" placeholder="Poster URL" /><Input v-model.number="form.priceCents" type="number" min="0" placeholder="Price in cents" required /><textarea v-model="form.description" required placeholder="Description" class="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" /><Button :disabled="busy" class="w-fit">Create draft</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Catalog</CardTitle></CardHeader><CardContent class="flex flex-col gap-3"><p v-if="!movies.length" class="text-sm text-muted-foreground">No uploaded movies yet.</p><div v-for="movie in movies" :key="movie.id" class="flex flex-wrap items-center justify-between gap-4 border-b border-border py-3 last:border-0"><div><p class="font-semibold">{{ movie.title }}</p><p class="text-sm text-muted-foreground">{{ movie.genre }} · ${{ (movie.priceCents / 100).toFixed(2) }}</p></div><div class="flex flex-wrap items-center gap-2"><Badge variant="secondary">{{ movie.status }}</Badge><input type="file" accept="video/mp4" class="max-w-44 text-xs" @change="uploadFiles[movie.id] = ($event.target as HTMLInputElement).files?.[0]!" /><Button size="sm" variant="outline" :disabled="busy || !uploadFiles[movie.id]" @click="upload(movie.id)">Upload MP4</Button><Button size="sm" :variant="movie.status === 'PUBLISHED' ? 'outline' : 'default'" @click="setMovieStatus(movie.id, movie.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED')">{{ movie.status === 'PUBLISHED' ? 'Archive' : 'Publish' }}</Button></div></div></CardContent></Card></div>
        <Card v-if="tab === 'orders'"><CardHeader><CardTitle>Orders</CardTitle><CardDescription>Confirm paid orders only after payment is verified.</CardDescription></CardHeader><CardContent><p v-if="!orders.length" class="text-sm text-muted-foreground">No orders yet.</p><div v-for="order in orders" :key="order.id" class="flex flex-wrap items-center justify-between gap-4 border-b border-border py-3 last:border-0"><div><p class="font-medium">{{ order.movie?.title }}</p><p class="text-xs text-muted-foreground">{{ order.user?.email }} · ${{ (order.amountCents / 100).toFixed(2) }} · {{ new Date(order.createdAt).toLocaleDateString() }}</p></div><div class="flex items-center gap-2"><Badge variant="secondary">{{ order.status }}</Badge><template v-if="order.status === 'PENDING'"><Button size="sm" @click="setOrderStatus(order.id, 'PAID')">Mark paid</Button><Button size="sm" variant="outline" @click="setOrderStatus(order.id, 'CANCELLED')">Cancel</Button></template></div></div></CardContent></Card>
        <Card v-if="tab === 'users'"><CardHeader><CardTitle>Users</CardTitle><CardDescription>Accounts, status, and order counts</CardDescription></CardHeader><CardContent><p v-if="!users.length" class="text-sm text-muted-foreground">No users yet.</p><div v-for="user in users" :key="user.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"><div><p class="font-medium">{{ user.name }}</p><p class="text-sm text-muted-foreground">{{ user.email }}</p></div><div class="flex items-center gap-2"><Badge variant="outline">{{ user.role }}</Badge><Badge variant="secondary">{{ user.status }}</Badge><span class="text-xs text-muted-foreground">{{ user._count.orders }} orders</span><Button v-if="user.id !== api.user.value?.id" size="sm" variant="outline" @click="setUserStatus(user.id, user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')">{{ user.status === 'ACTIVE' ? 'Suspend' : 'Activate' }}</Button></div></div></CardContent></Card>
      </template>
    </div></main>
  </div>
</template>
