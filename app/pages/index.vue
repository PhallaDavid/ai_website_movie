<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ChevronRight,
  ChevronLeft,
  Play,
  RotateCcw,
  Star,
  Clock,
  Bookmark,
  BookmarkCheck,
  Trash2,
  X,
  History,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'
import { useApi, type ApiMovie } from '@/composables/useApi'
import { highPopularityShows, mostAnticipatedShows, type ShowItem } from '@/data/iqiyi_shows'

const { isDark, initTheme } = useTheme()
const { t, initLocale } = useLocale()
const api = useApi()
const catalog = ref<ApiMovie[]>([])
const orderMessage = ref('')
const buying = ref<string | null>(null)

async function buy(movie: ApiMovie) {
  api.restore()
  if (!api.token.value) { await navigateTo('/account'); return }
  buying.value = movie.id
  try {
    const order = await api.request<{ id: string; status: string }>(`/orders`, { method: 'POST', body: { movieId: movie.id } })
    if (order.status === 'PAID') { orderMessage.value = `${movie.title} is in your library.`; return }
    try {
      const checkout = await api.request<{ url: string }>(`/orders/${order.id}/checkout`, { method: 'POST' })
      if (checkout.url) { window.location.assign(checkout.url); return }
    } catch { /* Manual payment confirmation remains available. */ }
    orderMessage.value = `Order placed for ${movie.title}. Awaiting payment confirmation.`
  } catch (error: any) { orderMessage.value = error?.data?.message || 'Could not create order.' }
  finally { buying.value = null }
}

onMounted(() => {
  initTheme()
  initLocale()
  api.restore()
  api.request<ApiMovie[]>('/movies').then(data => { catalog.value = data }).catch(() => {})
})

// Carousel refs
const popularityContainer = ref<HTMLElement | null>(null)
const anticipatedContainer = ref<HTMLElement | null>(null)

const scrollContainer = (el: HTMLElement | null, direction: 'left' | 'right') => {
  if (!el) return
  const offset = direction === 'left' ? -650 : 650
  el.scrollBy({ left: offset, behavior: 'smooth' })
}

// Show selection & modal state
const selectedShow = ref<ShowItem | null>(null)
const isDetailOpen = ref(false)
const isPlayingTrailer = ref(false)
const currentEpisode = ref(1)
const isHistoryOpen = ref(false)
const watchlist = ref<number[]>([101, 103, 202])

// Mock watch history items
const watchHistory = ref([
  { id: 101, title: 'When I Meet the Moon', episode: 3, totalEpisodes: 36, progress: 75, poster: highPopularityShows[0].poster },
  { id: 102, title: 'Small Town Remedy', episode: 12, totalEpisodes: 29, progress: 40, poster: highPopularityShows[1].poster },
  { id: 103, title: 'Spring of The Blade', episode: 8, totalEpisodes: 30, progress: 90, poster: highPopularityShows[2].poster },
])

const handleOpenShow = (show: ShowItem) => {
  selectedShow.value = show
  isPlayingTrailer.value = false
  currentEpisode.value = 1
  isDetailOpen.value = true
}

const toggleWatchlist = (id: number) => {
  if (watchlist.value.includes(id)) {
    watchlist.value = watchlist.value.filter((item) => item !== id)
  } else {
    watchlist.value.push(id)
  }
}

const isInWatchlist = (id: number) => {
  return watchlist.value.includes(id)
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-[#00dc58] selection:text-black transition-colors duration-200">
    <!-- iQIYI Full-Width Header with Dark/Light mode and #00dc58 theme -->
    <AppHeader
      @select-show="handleOpenShow"
      @open-history="isHistoryOpen = true"
    />

    <!-- Main Content Streamed in Exact iQIYI Visual Structure -->
    <main class="w-full px-4 sm:px-8 py-8 space-y-10 max-w-[1920px] mx-auto">
      <section v-if="catalog.length" class="flex flex-col gap-4">
        <div class="flex items-center justify-between"><h2 class="text-xl font-bold sm:text-2xl">Movies to own</h2><NuxtLink to="/account" class="text-sm text-muted-foreground hover:text-foreground">My orders →</NuxtLink></div>
        <p v-if="orderMessage" role="status" class="text-sm text-muted-foreground">{{ orderMessage }}</p>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <article v-for="movie in catalog" :key="movie.id" class="overflow-hidden rounded-lg border border-border bg-card">
            <div class="aspect-[2/3] bg-muted"><img v-if="movie.posterUrl" :src="movie.posterUrl" :alt="movie.title" class="size-full object-cover" /></div>
            <div class="flex flex-col gap-2 p-3"><h3 class="font-semibold">{{ movie.title }}</h3><p class="line-clamp-2 text-xs text-muted-foreground">{{ movie.description }}</p><Button size="sm" :disabled="buying === movie.id" @click="buy(movie)">{{ movie.priceCents ? `Buy · $${(movie.priceCents / 100).toFixed(2)}` : 'Add free movie' }}</Button></div>
          </article>
        </div>
      </section>
      <!-- Section 1: High Popularity -->
      <section class="space-y-4 relative">
        <!-- Section Header -->
        <div class="flex items-center justify-between">
          <button
            type="button"
            class="flex items-center gap-1.5 text-xl sm:text-2xl font-black text-foreground hover:text-[#00dc58] transition-colors group cursor-pointer"
          >
            <span>{{ t('highPopularity') }}</span>
            <ChevronRight class="size-6 text-muted-foreground group-hover:text-[#00dc58] transition-colors" />
          </button>
        </div>

        <!-- Horizontal Scrollable Row of 8 Cards (Clone of Screenshot) -->
        <div class="relative group/carousel">
          <!-- Left Arrow Button -->
          <button
            type="button"
            @click="scrollContainer(popularityContainer, 'left')"
            class="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/80 border border-white/20 text-white hover:bg-[#00dc58] hover:text-black hover:border-[#00dc58] transition-colors cursor-pointer hidden md:flex"
            title="Previous"
          >
            <ChevronLeft class="size-5" />
          </button>

          <!-- Cards Row Container -->
          <div
            ref="popularityContainer"
            class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4 overflow-x-auto scroll-smooth no-scrollbar py-1"
          >
            <div
              v-for="show in highPopularityShows"
              :key="show.id"
              @click="handleOpenShow(show)"
              class="group relative overflow-hidden rounded-md border border-border/40 bg-card text-card-foreground aspect-[9/13.5] cursor-pointer transition-transform duration-200 hover:scale-102 select-none shrink-0"
            >
              <!-- Poster Image -->
              <img
                :src="show.poster"
                :alt="show.title"
                class="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
              />

              <!-- "Original" Badge (Top-Right Green Badge as in Screenshot) -->
              <span
                class="absolute top-2 right-2 rounded-xs bg-[#00dc58] text-black font-extrabold text-[10px] px-1.5 py-0.5 tracking-tight uppercase leading-none shadow-xs"
              >
                {{ show.tag || 'Original' }}
              </span>

              <!-- Bottom Gradient Overlay with Rank, Title, and Subtitle -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent flex flex-col justify-end p-2.5 sm:p-3 text-left"
              >
                <!-- TOP Rank (e.g. TOP 1, TOP 2 ...) -->
                <div class="text-base sm:text-lg font-black text-white tracking-wider leading-none drop-shadow-xs">
                  TOP {{ show.rank }}
                </div>

                <!-- Show Title -->
                <div class="text-xs sm:text-sm font-bold text-white truncate mt-1 leading-tight group-hover:text-[#00dc58] transition-colors">
                  {{ show.title }}
                </div>

                <!-- Subtitle (e.g. New Episode, 29 Episodes ...) -->
                <div class="text-[11px] text-neutral-400 truncate mt-0.5">
                  {{ show.subtitle }}
                </div>
              </div>
            </div>
          </div>

          <!-- Right Arrow Button -->
          <button
            type="button"
            @click="scrollContainer(popularityContainer, 'right')"
            class="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/80 border border-white/20 text-white hover:bg-[#00dc58] hover:text-black hover:border-[#00dc58] transition-colors cursor-pointer hidden md:flex"
            title="Next"
          >
            <ChevronRight class="size-5" />
          </button>
        </div>
      </section>

      <!-- Section 2: Most Anticipated -->
      <section class="space-y-4 relative pt-2">
        <!-- Section Header -->
        <div class="flex items-center justify-between">
          <button
            type="button"
            class="flex items-center gap-1.5 text-xl sm:text-2xl font-black text-foreground hover:text-[#00dc58] transition-colors group cursor-pointer"
          >
            <span>{{ t('mostAnticipated') }}</span>
            <ChevronRight class="size-6 text-muted-foreground group-hover:text-[#00dc58] transition-colors" />
          </button>
        </div>

        <!-- Horizontal Scrollable Row of 8 Cards -->
        <div class="relative group/carousel">
          <!-- Left Arrow Button -->
          <button
            type="button"
            @click="scrollContainer(anticipatedContainer, 'left')"
            class="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/80 border border-white/20 text-white hover:bg-[#00dc58] hover:text-black hover:border-[#00dc58] transition-colors cursor-pointer hidden md:flex"
            title="Previous"
          >
            <ChevronLeft class="size-5" />
          </button>

          <!-- Cards Row Container -->
          <div
            ref="anticipatedContainer"
            class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4 overflow-x-auto scroll-smooth no-scrollbar py-1"
          >
            <div
              v-for="(show, idx) in mostAnticipatedShows"
              :key="show.id"
              @click="handleOpenShow(show)"
              class="group relative overflow-hidden rounded-md border border-border/40 bg-card text-card-foreground aspect-[9/13.5] cursor-pointer transition-transform duration-200 hover:scale-102 select-none shrink-0"
            >
              <!-- Poster Image -->
              <img
                :src="show.poster"
                :alt="show.title"
                class="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
              />

              <!-- Top Left iQIYI Original Badge (for card 7 like screenshot) -->
              <span
                v-if="idx === 6"
                class="absolute top-2 left-2 rounded-xs bg-[#00dc58] text-black font-extrabold text-[8px] px-1 py-0.5 tracking-tight uppercase leading-none"
              >
                iQIYI ORIGINAL
              </span>

              <!-- "Original" Badge (Top-Right Green Badge) -->
              <span
                class="absolute top-2 right-2 rounded-xs bg-[#00dc58] text-black font-extrabold text-[10px] px-1.5 py-0.5 tracking-tight uppercase leading-none shadow-xs"
              >
                {{ show.tag || 'Original' }}
              </span>

              <!-- Bottom Gradient Overlay -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent flex flex-col justify-end p-2.5 sm:p-3 text-left"
              >
                <div class="text-xs sm:text-sm font-bold text-white truncate leading-tight group-hover:text-[#00dc58] transition-colors">
                  {{ show.title }}
                </div>
                <div class="text-[11px] text-neutral-400 truncate mt-0.5">
                  {{ show.subtitle }}
                </div>
              </div>
            </div>
          </div>

          <!-- Right Arrow Button -->
          <button
            type="button"
            @click="scrollContainer(anticipatedContainer, 'right')"
            class="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/80 border border-white/20 text-white hover:bg-[#00dc58] hover:text-black hover:border-[#00dc58] transition-colors cursor-pointer hidden md:flex"
            title="Next"
          >
            <ChevronRight class="size-5" />
          </button>
        </div>
      </section>
    </main>

    <!-- Full-Width Minimalist Footer -->
    <footer class="w-full border-t border-border/40 bg-background py-8 px-4 sm:px-8 text-xs text-muted-foreground mt-16">
      <div class="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="font-black text-[#00dc58] text-sm tracking-tight">MerlRg KH</span>
          <span class="text-border">•</span>
          <span>{{ t('asianDramasTagline') }}</span>
        </div>

        <div class="flex items-center gap-4">
          <a href="#" class="hover:text-[#00dc58] transition-colors">Terms of Service</a>
          <a href="#" class="hover:text-[#00dc58] transition-colors">Privacy Policy</a>
          <a href="#" class="hover:text-[#00dc58] transition-colors">Help Center</a>
          <span class="text-border">•</span>
          <span>© 2026 MerlRg KH. {{ t('allRightsReserved') }}</span>
        </div>
      </div>
    </footer>

    <!-- History & Watchlist Dialog Modal (Rounded-MD, Flat) -->
    <Dialog v-model:open="isHistoryOpen">
      <DialogContent class="sm:max-w-xl p-5 rounded-md border border-border bg-background">
        <DialogHeader class="border-b border-border pb-3 flex flex-row items-center justify-between">
          <div>
            <DialogTitle class="text-base font-bold text-foreground flex items-center gap-2">
              <History class="size-4 text-[#00dc58]" />
              Watch History & List
            </DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground">
              Continue watching where you left off
            </DialogDescription>
          </div>
        </DialogHeader>

        <div class="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
          <div
            v-for="item in watchHistory"
            :key="item.id"
            class="flex items-center gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:bg-muted/50 transition-colors"
          >
            <img :src="item.poster" :alt="item.title" class="w-12 h-16 rounded-sm object-cover bg-muted shrink-0" />
            <div class="flex-1 min-w-0 space-y-1">
              <div class="text-xs font-bold text-foreground truncate">{{ item.title }}</div>
              <div class="text-[11px] text-muted-foreground">Episode {{ item.episode }} of {{ item.totalEpisodes }}</div>
              <!-- Progress bar -->
              <div class="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                <div class="bg-[#00dc58] h-full" :style="{ width: `${item.progress}%` }" />
              </div>
            </div>
            <Button
              size="sm"
              class="rounded-md bg-[#00dc58] text-black hover:bg-[#00dc58]/90 text-xs px-3 font-semibold shrink-0 cursor-pointer"
            >
              Resume
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Show Detail & Episode Player Modal (Rounded-MD, Flat, Clean Borders) -->
    <Dialog v-model:open="isDetailOpen">
      <DialogContent v-if="selectedShow" class="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-md border border-border bg-background text-foreground">
        <!-- Video Player or Backdrop -->
        <div v-if="isPlayingTrailer" class="relative aspect-video w-full bg-black">
          <iframe
            :src="`https://www.youtube-nocookie.com/embed/${selectedShow.youtubeId}?autoplay=1`"
            class="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
        </div>
        <div v-else class="relative h-48 sm:h-60 w-full overflow-hidden bg-muted">
          <img
            :src="selectedShow.backdrop"
            :alt="selectedShow.title"
            class="h-full w-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div class="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div class="space-y-0.5">
              <span class="text-[11px] text-[#00dc58] font-bold uppercase tracking-wider">
                {{ selectedShow.genres.join(' · ') }}
              </span>
              <h2 class="text-xl sm:text-2xl font-black text-foreground leading-tight">
                {{ selectedShow.title }}
              </h2>
            </div>
            <span class="rounded-xs bg-[#00dc58] text-black font-extrabold text-xs px-2 py-0.5 uppercase">
              {{ selectedShow.tag || 'Original' }}
            </span>
          </div>
        </div>

        <!-- Modal Details Body -->
        <div class="p-5 space-y-4">
          <!-- Meta Specs -->
          <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-b border-border pb-3">
            <span class="text-foreground font-semibold">{{ selectedShow.subtitle }}</span>
            <span>•</span>
            <span>Directed by {{ selectedShow.director }}</span>
            <span>•</span>
            <span class="flex items-center gap-1 text-[#00dc58] font-semibold">
              <Star class="size-3 text-[#00dc58]" />
              {{ selectedShow.rating }} Rating
            </span>
          </div>

          <!-- Description -->
          <div class="space-y-1">
            <h4 class="text-xs font-semibold text-foreground">Overview</h4>
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ selectedShow.description }}
            </p>
          </div>

          <!-- Episode Selector (Rounded-MD) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-foreground">Episodes</span>
              <span class="text-[11px] text-muted-foreground">Full HD 1080P</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="ep in 10"
                :key="ep"
                type="button"
                @click="currentEpisode = ep; isPlayingTrailer = true"
                :class="[
                  'px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer',
                  currentEpisode === ep && isPlayingTrailer
                    ? 'border-[#00dc58] bg-[#00dc58] text-black'
                    : 'border-border bg-muted/30 text-foreground hover:border-[#00dc58]/50 hover:bg-muted',
                ]"
              >
                EP {{ ep }}
              </button>
            </div>
          </div>

          <!-- Starring Cast -->
          <div class="space-y-1">
            <h4 class="text-xs font-semibold text-foreground">Starring Cast</h4>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="actor in selectedShow.cast"
                :key="actor"
                class="rounded-md border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {{ actor }}
              </span>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 bg-muted/20 border-t border-border flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <Button
              v-if="!isPlayingTrailer"
              size="sm"
              @click="isPlayingTrailer = true"
              class="rounded-md bg-[#00dc58] text-black hover:bg-[#00dc58]/90 text-xs px-4 border border-[#00dc58] font-bold gap-1.5 cursor-pointer"
            >
              <Play class="size-3.5 fill-current" />
              Watch Episode {{ currentEpisode }}
            </Button>
            <Button
              v-else
              variant="outline"
              size="sm"
              @click="isPlayingTrailer = false"
              class="rounded-md border-border text-xs gap-1.5 cursor-pointer"
            >
              <RotateCcw class="size-3" />
              Back to Overview
            </Button>

            <Button
              variant="outline"
              size="sm"
              @click="toggleWatchlist(selectedShow.id)"
              class="rounded-md border-border text-xs gap-1.5 cursor-pointer"
            >
              <component :is="isInWatchlist(selectedShow.id) ? BookmarkCheck : Bookmark" class="size-3.5" />
              {{ isInWatchlist(selectedShow.id) ? 'Saved' : 'Add to Watchlist' }}
            </Button>
          </div>

          <Button
            size="sm"
            @click="isDetailOpen = false"
            class="rounded-md bg-muted text-foreground hover:bg-muted/80 text-xs px-4 border border-border cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
