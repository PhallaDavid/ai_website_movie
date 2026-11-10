<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useApi, type ApiMovie } from '@/composables/useApi'
const api = useApi()
const route = useRoute()
const movie = ref<ApiMovie | null>(null)
const videoUrl = ref('')
const error = ref('')
onMounted(async () => {
  api.restore()
  try {
    movie.value = await api.request<ApiMovie>(`/movies/${route.params.id}`)
    const access = await api.request<{ token: string }>(`/movies/${route.params.id}/play-token`)
    videoUrl.value = `${api.base}/api/movies/${route.params.id}/watch?token=${encodeURIComponent(access.token)}`
  } catch (e: any) { error.value = e?.data?.message || 'Sign in and purchase this movie to watch.' }
})
</script>
<template><main class="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8"><div class="mx-auto max-w-5xl"><NuxtLink to="/account" class="text-sm text-muted-foreground">← My account</NuxtLink><h1 class="my-6 text-3xl font-bold">{{ movie?.title || 'Movie player' }}</h1><p v-if="error" role="alert">{{ error }}</p><video v-if="videoUrl" :src="videoUrl" controls class="aspect-video w-full bg-black" /></div></main></template>
