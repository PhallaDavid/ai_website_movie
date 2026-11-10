import { ref, computed } from 'vue'
import { moviesDatabase, type Movie } from '@/data/movies'

const watchlist = ref<number[]>([1, 2, 5]) // pre-saved Interstellar, Dune, Inception
const selectedMovie = ref<Movie | null>(null)
const isDetailOpen = ref(false)

export const useMovies = () => {
  const openMovieDetail = (movie: Movie) => {
    selectedMovie.value = movie
    isDetailOpen.value = true
  }

  const closeMovieDetail = () => {
    isDetailOpen.value = false
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

  const watchlistMovies = computed(() => {
    return moviesDatabase.filter((m) => watchlist.value.includes(m.id))
  })

  return {
    movies: moviesDatabase,
    watchlist,
    watchlistMovies,
    selectedMovie,
    isDetailOpen,
    openMovieDetail,
    closeMovieDetail,
    toggleWatchlist,
    isInWatchlist,
  }
}

