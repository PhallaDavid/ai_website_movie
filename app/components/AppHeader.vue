<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Search,
  User,
  Clock,
  Globe,
  Sun,
  Moon,
  ChevronDown,
  X,
  Check,
} from '@lucide/vue'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/composables/useTheme'
import { useLocale, type LocaleCode } from '@/composables/useLocale'
import { highPopularityShows, mostAnticipatedShows, type ShowItem } from '@/data/iqiyi_shows'
import { useApi } from '@/composables/useApi'
import { getFirebaseAuth } from '@/lib/firebase.client'
import { signOut as firebaseSignOut } from 'firebase/auth'

const { isDark, toggleTheme, initTheme } = useTheme()
const { currentLocale, setLocale, initLocale, t } = useLocale()
const api = useApi()

onMounted(() => {
  initTheme()
  initLocale()
  api.restore()
})

async function signOut() {
  try { await firebaseSignOut(getFirebaseAuth()) } catch { /* The app session still ends. */ }
  api.logout()
}

const emit = defineEmits<{
  (e: 'select-show', show: ShowItem): void
  (e: 'open-history'): void
  (e: 'select-category', category: string): void
}>()

// Active category tab
const activeCategory = ref('trending')

const setCategory = (cat: string) => {
  activeCategory.value = cat
  emit('select-category', cat)
}

// Search state
const isSearchOpen = ref(false)
const searchQuery = ref('')

// Language modal state
const isLanguageOpen = ref(false)
const selectedLanguage = ref('English')
const languages = [
  { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'th', name: 'Thai', native: 'ภาษาไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
]

const allShows = [...highPopularityShows, ...mostAnticipatedShows]

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return allShows.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.genres.some((g) => g.toLowerCase().includes(q)) ||
      s.cast.some((c) => c.toLowerCase().includes(q)) ||
      s.director.toLowerCase().includes(q),
  )
})

const handleSelect = (show: ShowItem) => {
  isSearchOpen.value = false
  emit('select-show', show)
}

const handleSelectLanguage = (lang: typeof languages[0]) => {
  selectedLanguage.value = lang.name
  if (['km', 'en', 'zh-CN'].includes(lang.code)) {
    setLocale(lang.code as LocaleCode)
  }
  isLanguageOpen.value = false
}
</script>

<template>
  <!-- Full-Width Header Bar with Increased Height, Larger Modern Fonts and Bigger Crisp Icons -->
  <header class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-colors">
    <div class="flex h-18 sm:h-20 w-full items-center justify-between gap-3 sm:gap-6">
      <!-- Left: Logo & Navigation Links (NO ICONS) -->
      <div class="flex items-center gap-6 lg:gap-9 min-w-0">
        <!-- MerlRg KH Logo (Larger Font) -->
        <NuxtLink to="/" class="flex items-center gap-1.5 shrink-0 group">
          <span class="text-2xl sm:text-3xl font-black tracking-tight text-[#00dc58] flex items-center select-none">
            MerlRg<span class="ml-1.5 text-xs font-black uppercase px-2 py-0.5 rounded-sm bg-[#00dc58] text-black leading-none tracking-normal">KH</span>
          </span>
        </NuxtLink>

        <!-- Navigation Links (Larger Text, NO ICONS, Interactive Tabs) -->
        <nav class="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 text-[15px] sm:text-base font-medium">
          <button
            type="button"
            @click="setCategory('foryou')"
            :class="[
              'transition-colors cursor-pointer pb-1',
              activeCategory === 'foryou'
                ? 'text-foreground font-bold border-b-[3px] border-[#00dc58]'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ t('forYou') }}
          </button>
          <button
            type="button"
            @click="setCategory('trending')"
            :class="[
              'transition-colors cursor-pointer pb-1',
              activeCategory === 'trending'
                ? 'text-foreground font-bold border-b-[3px] border-[#00dc58]'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ t('trending') }}
          </button>
          <button
            type="button"
            @click="setCategory('drama')"
            :class="[
              'transition-colors cursor-pointer pb-1',
              activeCategory === 'drama'
                ? 'text-foreground font-bold border-b-[3px] border-[#00dc58]'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ t('drama') }}
          </button>
          <button
            type="button"
            @click="setCategory('kdrama')"
            :class="[
              'transition-colors cursor-pointer pb-1',
              activeCategory === 'kdrama'
                ? 'text-foreground font-bold border-b-[3px] border-[#00dc58]'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ t('kDrama') }}
          </button>

          <!-- More Dropdown -->
          <DropdownMenu>
            <DropdownMenuTrigger
              :class="[
                'flex items-center gap-1 outline-none cursor-pointer pb-1 transition-colors',
                ['anime', 'movies'].includes(activeCategory)
                  ? 'text-foreground font-bold border-b-[3px] border-[#00dc58]'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
            >
              <span>{{ ['anime', 'movies'].includes(activeCategory) ? (activeCategory === 'anime' ? t('anime') : t('movies')) : t('more') }}</span>
              <ChevronDown class="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent class="rounded-md border border-border bg-popover text-popover-foreground">
              <DropdownMenuItem @click="setCategory('anime')" class="text-sm cursor-pointer rounded-sm">{{ t('anime') }}</DropdownMenuItem>
              <DropdownMenuItem @click="setCategory('movies')" class="text-sm cursor-pointer rounded-sm">{{ t('movies') }}</DropdownMenuItem>
              <DropdownMenuItem @click="setCategory('trending')" class="text-sm cursor-pointer rounded-sm">Variety Shows</DropdownMenuItem>
              <DropdownMenuItem @click="setCategory('trending')" class="text-sm cursor-pointer rounded-sm">Documentary</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      <!-- Right: Search Bar & Actions with Bigger Icons, Larger Fonts & Compact Tight Gaps -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <!-- Search bar (Larger Height & Text) -->
        <button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground sm:hidden" aria-label="Search movies" @click="isSearchOpen = true"><Search class="size-5" /></button>
        <div class="relative hidden w-40 sm:block sm:w-52 md:w-64 lg:w-72">
          <input
            v-model="searchQuery"
            @focus="isSearchOpen = true"
            type="text"
            placeholder="BORUTO-NARUTO NEX..."
            class="w-full h-10 rounded-md border border-border/80 bg-muted/60 pl-3.5 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[#00dc58] transition-colors"
          />
          <button
            @click="isSearchOpen = true"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Search class="size-4.5" />
          </button>
        </div>

        <!-- History Button (Bigger Icon & Font) -->
        <button
          type="button"
          @click="emit('open-history')"
          class="hidden flex-col items-center justify-center min-w-[48px] sm:min-w-[54px] px-2 py-1.5 text-muted-foreground hover:text-[#00dc58] transition-colors cursor-pointer rounded-md hover:bg-muted/40 sm:flex"
        >
          <Clock class="size-5 sm:size-5.5 stroke-[2]" />
          <span class="text-xs sm:text-[13px] font-medium leading-none mt-1.5">{{ t('history') }}</span>
        </button>

        <!-- Language Button (Bigger Icon & Font) -->
        <button
          type="button"
          @click="isLanguageOpen = true"
          class="hidden flex-col items-center justify-center min-w-[48px] sm:min-w-[54px] px-2 py-1.5 text-muted-foreground hover:text-[#00dc58] transition-colors cursor-pointer rounded-md hover:bg-muted/40 sm:flex"
        >
          <Globe class="size-5 sm:size-5.5 stroke-[2]" />
          <span class="text-xs sm:text-[13px] font-medium leading-none mt-1.5">{{ t('language') }}</span>
        </button>

        <NotificationMenu v-if="api.user.value" />

        <!-- Theme Toggle (Light / Dark, Bigger Icon & Font) -->
        <button
          type="button"
          @click="toggleTheme"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          class="flex size-9 flex-col items-center justify-center sm:size-auto sm:min-w-[54px] sm:px-2 sm:py-1.5 text-muted-foreground hover:text-[#00dc58] transition-colors cursor-pointer rounded-md hover:bg-muted/40"
        >
          <Sun v-if="isDark" class="size-5 sm:size-5.5 stroke-[2]" />
          <Moon v-else class="size-5 sm:size-5.5 stroke-[2]" />
          <span class="hidden text-xs sm:mt-1.5 sm:block sm:text-[13px] font-medium leading-none">{{ isDark ? t('light') : t('dark') }}</span>
        </button>

        <!-- Me (Profile, Bigger Icon & Font) -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button class="flex size-9 flex-col items-center justify-center sm:size-auto sm:min-w-[54px] sm:px-2 sm:py-1.5 text-muted-foreground hover:text-[#00dc58] transition-colors cursor-pointer outline-none rounded-md hover:bg-muted/40" aria-label="Account menu">
              <Avatar v-if="api.user.value" size="sm" class="size-6"><AvatarImage v-if="api.user.value.avatarUrl" :src="api.user.value.avatarUrl" :alt="api.user.value.name" /><AvatarFallback>{{ api.user.value.name.slice(0, 1).toUpperCase() }}</AvatarFallback></Avatar>
              <User v-else class="size-5 sm:size-5.5 stroke-[2]" />
              <span class="hidden text-xs sm:mt-1.5 sm:block sm:text-[13px] font-medium leading-none">{{ api.user.value ? 'Account' : t('me') }}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-52 p-2 rounded-md border border-border bg-popover text-popover-foreground">
            <DropdownMenuLabel class="p-2 text-sm font-semibold">{{ api.user.value?.name || 'Welcome' }}</DropdownMenuLabel>
            <DropdownMenuSeparator class="my-1 border-border" />
            <DropdownMenuGroup>
              <DropdownMenuItem @click="navigateTo('/account')" class="text-sm cursor-pointer py-1.5 rounded-sm">{{ api.user.value ? 'My profile & orders' : 'Sign in with Google' }}</DropdownMenuItem>
              <DropdownMenuItem v-if="api.user.value" @click="emit('open-history')" class="text-sm cursor-pointer py-1.5 rounded-sm">My Watchlist & History</DropdownMenuItem>
              <DropdownMenuItem v-if="api.user.value?.role === 'ADMIN'" @click="navigateTo('/dashboard')" class="text-sm cursor-pointer py-1.5 rounded-sm">Dashboard</DropdownMenuItem>
              <DropdownMenuItem @click="isLanguageOpen = true" class="text-sm cursor-pointer py-1.5 rounded-sm">Language ({{ selectedLanguage }})</DropdownMenuItem>
            </DropdownMenuGroup>
            <template v-if="api.user.value"><DropdownMenuSeparator class="my-1 border-border" /><DropdownMenuGroup><DropdownMenuItem @click="signOut" class="text-sm cursor-pointer py-1.5 rounded-sm">Sign out</DropdownMenuItem></DropdownMenuGroup></template>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Search Modal Dialog (Rounded-MD, Flat) -->
    <Dialog v-model:open="isSearchOpen">
      <DialogContent class="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-md border border-border bg-background">
        <DialogHeader class="p-4 border-b border-border">
          <div class="flex items-center gap-3">
            <div class="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-foreground">
              <Search class="size-3.5" />
            </div>
            <div class="flex-1">
              <DialogTitle class="text-sm font-semibold text-foreground">Search MerlRg KH</DialogTitle>
              <DialogDescription class="text-xs text-muted-foreground">
                Search dramas, anime, movies, actors, and originals
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Input -->
          <div class="relative">
            <Search class="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="e.g. When I Meet the Moon, Pursuit of Jade, Wuxia..."
              class="pl-10 pr-10 rounded-md h-10 text-xs bg-muted/40 border-border focus-visible:ring-[#00dc58]"
              autofocus
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X class="size-3.5" />
            </button>
          </div>

          <!-- Suggested searches -->
          <div>
            <div class="text-xs font-medium text-muted-foreground mb-2">
              Trending Searches
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="term in ['When I Meet the Moon', 'Pursuit of Jade', 'Spring of The Blade', 'New Life Begins', 'Wuxia']"
                :key="term"
                type="button"
                @click="searchQuery = term"
                class="rounded-md border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted hover:border-[#00dc58]/50 transition-colors"
              >
                {{ term }}
              </button>
            </div>
          </div>

          <!-- Results -->
          <div v-if="searchQuery && searchResults.length > 0" class="space-y-1.5 pt-1">
            <div class="text-[11px] font-medium text-muted-foreground">
              {{ searchResults.length }} matching results
            </div>
            <div
              v-for="show in searchResults"
              :key="show.id"
              @click="handleSelect(show)"
              class="flex items-center gap-3 p-2 rounded-md border border-border bg-muted/20 hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <img :src="show.poster" :alt="show.title" class="size-11 rounded-md object-cover bg-muted" />
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-foreground truncate">{{ show.title }}</div>
                <div class="text-[11px] text-muted-foreground truncate">{{ show.genres.join(', ') }} • {{ show.subtitle }}</div>
              </div>
              <Badge variant="outline" class="rounded-md text-[10px] px-2 py-0 border-[#00dc58]/40 text-[#00dc58] bg-[#00dc58]/10 shrink-0">
                ★ {{ show.rating }}
              </Badge>
            </div>
          </div>
          <div v-else-if="searchQuery && searchResults.length === 0" class="text-center py-6 text-xs text-muted-foreground">
            No shows found matching "{{ searchQuery }}".
          </div>
        </div>

        <DialogFooter class="p-3 bg-muted/20 border-t border-border flex items-center justify-between">
          <span class="text-[11px] text-muted-foreground">Press Esc to close</span>
          <Button
            size="sm"
            class="rounded-md bg-[#00dc58] text-black hover:bg-[#00dc58]/90 text-xs px-4 border border-[#00dc58] cursor-pointer font-medium"
            @click="isSearchOpen = false"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Language Selector Modal (Rounded-MD, Flat) -->
    <Dialog v-model:open="isLanguageOpen">
      <DialogContent class="sm:max-w-md p-5 rounded-md border border-border bg-background">
        <DialogHeader class="border-b border-border pb-3">
          <DialogTitle class="text-base font-bold text-foreground">Select Display Language</DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Choose your preferred language for subtitles, audio, and UI
          </DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-2 py-3">
          <button
            v-for="lang in languages"
            :key="lang.code"
            type="button"
            @click="handleSelectLanguage(lang)"
            :class="[
              'flex items-center justify-between p-2.5 rounded-md border text-left text-xs transition-colors cursor-pointer',
              selectedLanguage === lang.name
                ? 'border-[#00dc58] bg-[#00dc58]/10 text-foreground font-semibold'
                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
          >
            <div>
              <div class="font-medium text-foreground">{{ lang.native }}</div>
              <div class="text-[10px] text-muted-foreground">{{ lang.name }}</div>
            </div>
            <Check v-if="selectedLanguage === lang.name" class="size-4 text-[#00dc58]" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </header>
</template>
