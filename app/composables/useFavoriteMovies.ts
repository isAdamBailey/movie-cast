import type { FavoriteMovie } from '~/types'

const FAVORITES_STORAGE_KEY = 'movie-cast:favorites'

export const useFavoriteMovies = () => {
  const favorites = useState<FavoriteMovie[]>('favorite-movies', () => [])
  const isLoaded = useState<boolean>('favorite-movies-loaded', () => false)

  const loadFavorites = () => {
    if (!import.meta.client || isLoaded.value) {
      return
    }

    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!storedFavorites) {
      isLoaded.value = true
      return
    }

    try {
      const parsedFavorites = JSON.parse(storedFavorites) as FavoriteMovie[]
      favorites.value = Array.isArray(parsedFavorites) ? parsedFavorites : []
    } catch {
      favorites.value = []
    }

    isLoaded.value = true
  }

  const saveFavorites = () => {
    if (!import.meta.client) {
      return
    }

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites.value))
  }

  const isFavorite = (movieId: number) => {
    return favorites.value.some((movie) => movie.id === movieId)
  }

  const addFavorite = (movie: FavoriteMovie) => {
    if (isFavorite(movie.id)) {
      return
    }

    favorites.value = [movie, ...favorites.value]
    saveFavorites()
  }

  const removeFavorite = (movieId: number) => {
    favorites.value = favorites.value.filter((favoriteMovie) => favoriteMovie.id !== movieId)
    saveFavorites()
  }

  return {
    favorites,
    loadFavorites,
    isFavorite,
    addFavorite,
    removeFavorite
  }
}
