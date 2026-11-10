import { ref } from 'vue'

export type LocaleCode = 'km' | 'en' | 'zh-CN'

const currentLocale = ref<LocaleCode>('en')

const translations: Record<LocaleCode, Record<string, string>> = {
  en: {
    forYou: 'For You',
    trending: 'Trending',
    drama: 'Drama',
    kDrama: 'K-Drama',
    anime: 'Anime',
    movies: 'Movies',
    more: 'More',
    highPopularity: 'High Popularity',
    mostAnticipated: 'Most Anticipated',
    original: 'Original',
    history: 'History',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    me: 'Me',
    searchPlaceholder: 'Search dramas, anime, movies...',
    watchNow: 'Watch Now',
    newEpisode: 'New Episode',
    episodes: 'Episodes',
    comingSoon: 'Coming Soon',
    starringCast: 'Starring Cast',
    director: 'Director',
    addToWatchlist: 'Add to Watchlist',
    saved: 'Saved',
    watchHistory: 'Watch History & List',
    resume: 'Resume',
    close: 'Close',
    allRightsReserved: 'All Rights Reserved.',
    asianDramasTagline: 'Asian Dramas, Anime & Blockbusters Worldwide',
  },
  km: {
    forYou: 'សម្រាប់អ្នក',
    trending: 'កំពុងពេញនិយម',
    drama: 'រឿងភាគ',
    kDrama: 'រឿងកូរ៉េ',
    anime: 'អានីមេ',
    movies: 'ភាពយន្ត',
    more: 'បន្ថែមទៀត',
    highPopularity: 'ការពេញនិយមខ្ពស់',
    mostAnticipated: 'រង់ចាំទស្សនាបំផុត',
    original: 'រឿងដើម',
    history: 'ប្រវត្តិ',
    language: 'ភាសា',
    light: 'ពន្លឺ',
    dark: 'ងងឹត',
    me: 'គណនី',
    searchPlaceholder: 'ស្វែងរក រឿងភាគ អានីមេ ភាពយន្ត...',
    watchNow: 'ទស្សនាឥឡូវ',
    newEpisode: 'ភាគថ្មី',
    episodes: 'ភាគ',
    comingSoon: 'នឹងមកដល់ឆាប់ៗ',
    starringCast: 'តួសម្តែងសំខាន់ៗ',
    director: 'អ្នកដឹកនាំរឿង',
    addToWatchlist: 'រក្សាទុកក្នុងបញ្ជី',
    saved: 'បានរក្សាទុក',
    watchHistory: 'ប្រវត្តិនៃការទស្សនា',
    resume: 'បន្តទស្សនា',
    close: 'បិទ',
    allRightsReserved: 'រក្សាសិទ្ធិគ្រប់យ៉ាង។',
    asianDramasTagline: 'រឿងភាគអាស៊ី អានីមេ និងភាពយន្តល្បីៗជុំវិញពិភពលោក',
  },
  'zh-CN': {
    forYou: '推荐',
    trending: '热播榜',
    drama: '电视剧',
    kDrama: '韩剧',
    anime: '动漫',
    movies: '电影',
    more: '更多',
    highPopularity: '高人气',
    mostAnticipated: '最受期待',
    original: '独播',
    history: '历史',
    language: '语言',
    light: '浅色',
    dark: '深色',
    me: '我的',
    searchPlaceholder: '搜索电视剧、动漫、电影...',
    watchNow: '立即播放',
    newEpisode: '更新中',
    episodes: '集全',
    comingSoon: '即将上映',
    starringCast: '主演阵容',
    director: '导演',
    addToWatchlist: '追剧',
    saved: '已追剧',
    watchHistory: '播放历史与追剧列表',
    resume: '继续观看',
    close: '关闭',
    allRightsReserved: '版权所有。',
    asianDramasTagline: '亚洲精彩剧集、动漫与院线大片',
  },
}

export const useLocale = () => {
  const setLocale = (code: LocaleCode) => {
    currentLocale.value = code
    if (import.meta.client) {
      localStorage.setItem('locale', code)
    }
  }

  const initLocale = () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('locale') as LocaleCode | null
      if (saved && translations[saved]) {
        currentLocale.value = saved
      }
    }
  }

  const t = (key: string): string => {
    return translations[currentLocale.value]?.[key] || translations.en[key] || key
  }

  return {
    currentLocale,
    setLocale,
    initLocale,
    t,
  }
}

