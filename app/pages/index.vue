<script setup lang="ts">
import type { CastMember, FavoriteMovie, MovieCreditsResponse, MovieDetailsResponse, MovieSearchResult } from '~/types'

interface SpeechRecognitionResultItem {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionResultItem
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const searchQuery = ref('')
const searchResults = ref<MovieSearchResult[]>([])
const movieTitle = ref('')
const castMembers = ref<CastMember[]>([])
const movieDetails = ref<MovieDetailsResponse | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const hasSearched = ref(false)
const isVoiceSupported = ref(false)
const isListening = ref(false)
const isSpeechSynthesisSupported = ref(false)
const speakingMemberId = ref<number | null>(null)
const isSpeakingDescription = ref(false)
const isRemoveDialogOpen = ref(false)
const pendingRemoveMovie = ref<FavoriteMovie | null>(null)
const { loadFavorites, isFavorite, addFavorite, removeFavorite } = useFavoriteMovies()

let recognition: SpeechRecognitionLike | null = null

const baseImageUrl = runtimeConfig.public.tmdbBaseImageUrl
const currentYear = new Date().getFullYear()
const getReleaseYear = (releaseDate: string) => {
  return releaseDate ? releaseDate.slice(0, 4) : 'Unknown year'
}

const speakMovieTitle = (title: string) => {
  if (!import.meta.client || !title.trim()) {
    return
  }

  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    return
  }

  const utterance = new SpeechSynthesisUtterance(title)
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

const loadMovieById = async (movieId: number, preferredTitle?: string) => {
  isLoading.value = true
  hasSearched.value = true
  searchResults.value = []
  castMembers.value = []
  movieTitle.value = ''
  movieDetails.value = null
  errorMessage.value = ''

  try {
    const [credits, details] = await Promise.all([
      $fetch<MovieCreditsResponse>(`/api/movies/${movieId}/credits`),
      $fetch<MovieDetailsResponse>(`/api/movies/${movieId}/details`)
    ])

    movieTitle.value = preferredTitle || details.title
    castMembers.value = credits.cast
    movieDetails.value = details
    speakMovieTitle(movieTitle.value)
  } catch {
    errorMessage.value = 'Unable to fetch movie data right now.'
  } finally {
    isLoading.value = false
  }
}

const onSubmit = async () => {
  const query = searchQuery.value.trim()
  errorMessage.value = ''
  hasSearched.value = true
  isLoading.value = true
  searchResults.value = []
  castMembers.value = []
  movieTitle.value = ''
  movieDetails.value = null

  if (!query) {
    isLoading.value = false
    errorMessage.value = 'Enter a movie title to search.'
    return
  }

  try {
    const movies = await $fetch<MovieSearchResult[]>('/api/movies/search', {
      query: { query }
    })

    if (!movies.length) {
      errorMessage.value = 'No matching movie was found.'
      return
    }

    if (movies.length === 1) {
      await loadMovieById(movies[0].id, movies[0].title)
      return
    }

    searchResults.value = movies
  } catch {
    errorMessage.value = 'Unable to fetch movie data right now.'
  } finally {
    isLoading.value = false
  }
}

const onSelectSearchResult = async (movie: MovieSearchResult) => {
  await loadMovieById(movie.id, movie.title)
}

const getProfileImageUrl = (profilePath: string) => `${baseImageUrl}${profilePath}`
const getMovieImageUrl = (path: string) => `${baseImageUrl}${path}`
const trailerEmbedUrl = computed(() => {
  if (!movieDetails.value?.trailer_key) {
    return null
  }

  return `https://www.youtube-nocookie.com/embed/${movieDetails.value.trailer_key}`
})
const currentFavoriteMovie = computed<FavoriteMovie | null>(() => {
  if (!movieDetails.value) {
    return null
  }

  return {
    id: movieDetails.value.id,
    title: movieDetails.value.title,
    image_path: movieDetails.value.poster_path || movieDetails.value.backdrop_path
  }
})
const isCurrentMovieFavorite = computed(() => {
  if (!movieDetails.value) {
    return false
  }

  return isFavorite(movieDetails.value.id)
})
const removeDialogMessage = computed(() => {
  if (!pendingRemoveMovie.value) {
    return 'Remove this movie from favorites?'
  }

  return `Remove ${pendingRemoveMovie.value.title} from favorites?`
})

const onFavoriteButtonClick = () => {
  if (!currentFavoriteMovie.value) {
    return
  }

  if (isCurrentMovieFavorite.value) {
    pendingRemoveMovie.value = currentFavoriteMovie.value
    isRemoveDialogOpen.value = true
    return
  }

  addFavorite(currentFavoriteMovie.value)
}

const confirmRemoveCurrentMovie = () => {
  if (!pendingRemoveMovie.value) {
    return
  }

  removeFavorite(pendingRemoveMovie.value.id)
  pendingRemoveMovie.value = null
}

const cancelRemoveCurrentMovie = () => {
  pendingRemoveMovie.value = null
}

onMounted(() => {
  loadFavorites()
  isSpeechSynthesisSupported.value = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const speechWindow = window as WindowWithSpeechRecognition
  const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

  if (!Recognition) {
    isVoiceSupported.value = false
    return
  }

  isVoiceSupported.value = true
  recognition = new Recognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onresult = (event) => {
    const finalResult = Array.from(event.results).find((result) => result.isFinal) ?? event.results[0]
    const transcript = finalResult?.[0]?.transcript?.trim() ?? ''

    if (!transcript) {
      return
    }

    searchQuery.value = transcript
    void onSubmit()
  }

  recognition.onerror = () => {
    isListening.value = false
    errorMessage.value = 'Voice search failed. Try again or type your search.'
  }

  recognition.onend = () => {
    isListening.value = false
  }
})

const toggleVoiceSearch = () => {
  if (!recognition || isLoading.value) {
    return
  }

  errorMessage.value = ''

  if (isListening.value) {
    recognition.stop()
    isListening.value = false
    return
  }

  isListening.value = true
  recognition.start()
}

const speakCharacter = (member: CastMember) => {
  if (!isSpeechSynthesisSupported.value) {
    return
  }

  if (speakingMemberId.value === member.id) {
    window.speechSynthesis.cancel()
    speakingMemberId.value = null
    return
  }

  const characterName = member.character?.trim() || 'Unknown character'
  const utterance = new SpeechSynthesisUtterance(characterName)
  utterance.lang = 'en-US'

  utterance.onend = () => {
    speakingMemberId.value = null
  }

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    speakingMemberId.value = null

    if (event.error === 'canceled' || event.error === 'interrupted') {
      return
    }

    errorMessage.value = 'Speech synthesis failed. Please try again.'
  }

  window.speechSynthesis.cancel()
  speakingMemberId.value = member.id
  window.speechSynthesis.speak(utterance)
}

const speakMovieDescription = () => {
  if (!isSpeechSynthesisSupported.value || !movieDetails.value) {
    return
  }

  if (isSpeakingDescription.value) {
    window.speechSynthesis.cancel()
    isSpeakingDescription.value = false
    return
  }

  const description = movieDetails.value.overview?.trim()
  if (!description) {
    errorMessage.value = 'No movie description is available to speak.'
    return
  }

  const utterance = new SpeechSynthesisUtterance(description)
  utterance.lang = 'en-US'
  utterance.onend = () => {
    isSpeakingDescription.value = false
  }
  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    isSpeakingDescription.value = false

    if (event.error === 'canceled' || event.error === 'interrupted') {
      return
    }

    errorMessage.value = 'Speech synthesis failed. Please try again.'
  }

  window.speechSynthesis.cancel()
  isSpeakingDescription.value = true
  window.speechSynthesis.speak(utterance)
}

onBeforeUnmount(() => {
  if (recognition && isListening.value) {
    recognition.stop()
  }
  if (isSpeechSynthesisSupported.value) {
    window.speechSynthesis.cancel()
  }
})

watch(
  () => route.query.movieId,
  (movieId) => {
    if (typeof movieId === 'string' && /^\d+$/.test(movieId)) {
      void loadMovieById(Number(movieId))
    }
  },
  { immediate: true }
)
</script>

<template>
  <main class="flex min-h-screen flex-col bg-slate-100 text-slate-900">
    <div class="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-10">
      <header class="space-y-2 text-center">
        <div class="flex justify-end">
          <NuxtLink
            to="/favorites"
            class="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            Favorites
          </NuxtLink>
        </div>
        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
          Movie Cast Lookup
        </h1>
        <p class="text-sm text-slate-600 sm:text-base">
          Search by movie title to view cast members and character names.
        </p>
      </header>

      <form class="mx-auto flex max-w-2xl gap-3" @submit.prevent="onSubmit">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search a movie title"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-slate-500"
        >
        <button
          v-if="isVoiceSupported"
          type="button"
          :disabled="isLoading"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          @click="toggleVoiceSearch"
        >
          {{ isListening ? 'Stop' : 'Voice' }}
        </button>
        <button
          type="submit"
          :disabled="isLoading"
          class="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {{ isLoading ? 'Searching...' : 'Search' }}
        </button>
      </form>

      <p v-if="isListening" class="text-center text-xs font-medium text-slate-600">
        Listening...
      </p>

      <p v-if="errorMessage" class="text-center text-sm font-medium text-red-600">
        {{ errorMessage }}
      </p>

      <section v-if="searchResults.length > 1 && !movieTitle" class="mx-auto max-w-3xl space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">
          Multiple movies found. Choose one:
        </h2>
        <div class="space-y-2">
          <button
            v-for="movie in searchResults"
            :key="movie.id"
            type="button"
            class="w-full rounded-lg border border-slate-300 bg-white p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
            @click="onSelectSearchResult(movie)"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="movie.poster_path"
                :src="getMovieImageUrl(movie.poster_path)"
                :alt="movie.title"
                class="h-16 w-12 rounded object-cover"
                loading="lazy"
              >
              <div v-else class="h-16 w-12 rounded bg-slate-200" />
              <div>
                <span class="block font-medium text-slate-900">{{ movie.title }}</span>
                <span class="text-sm text-slate-600">({{ getReleaseYear(movie.release_date) }})</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      <section v-if="movieTitle" class="space-y-4">
        <div v-if="movieDetails" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="grid gap-4 p-4 md:grid-cols-2">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-2xl font-bold">
                  {{ movieDetails.title }}
                </h2>
                <button
                  type="button"
                  :class="[
                    'rounded-md px-3 py-1.5 text-xs font-medium text-white transition',
                    isCurrentMovieFavorite ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  ]"
                  @click="onFavoriteButtonClick"
                >
                  {{ isCurrentMovieFavorite ? 'Remove from Favorites' : 'Set as Favorite' }}
                </button>
              </div>
              <p v-if="movieDetails.release_date" class="text-sm text-slate-600">
                Released: {{ movieDetails.release_date }}
              </p>
              <p class="text-sm leading-6 text-slate-700">
                {{ movieDetails.overview || 'No description available.' }}
              </p>
              <button
                v-if="isSpeechSynthesisSupported"
                type="button"
                class="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                @click="speakMovieDescription"
              >
                {{ isSpeakingDescription ? 'Stop Description' : 'Speak Description' }}
              </button>
            </div>

            <div class="overflow-hidden rounded-lg bg-slate-200">
              <iframe
                v-if="trailerEmbedUrl"
                :src="trailerEmbedUrl"
                title="Movie trailer"
                class="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              />
              <img
                v-else-if="movieDetails.backdrop_path || movieDetails.poster_path"
                :src="getMovieImageUrl(movieDetails.backdrop_path || movieDetails.poster_path || '')"
                :alt="movieDetails.title"
                class="h-full min-h-56 w-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="flex min-h-56 items-center justify-center text-sm text-slate-500"
              >
                No trailer or movie image available.
              </div>
            </div>
          </div>
        </div>

        <h2 class="text-xl font-semibold sm:text-2xl">
          Cast for {{ movieTitle }}
        </h2>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <article
            v-for="member in castMembers"
            :key="member.id"
            class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <img
              v-if="member.profile_path"
              :src="getProfileImageUrl(member.profile_path)"
              :alt="member.name"
              class="h-52 w-full object-cover"
              loading="lazy"
            >
            <div
              v-else
              class="h-52 w-full bg-slate-200"
            />
            <div class="space-y-1 p-3">
              <h3 class="text-lg font-bold leading-tight text-slate-900">
                {{ member.character || 'Unknown Character' }}
              </h3>
              <p class="text-xs text-slate-600">
                Played by {{ member.name }}
              </p>
              <button
                v-if="isSpeechSynthesisSupported"
                type="button"
                class="mt-2 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                @click="speakCharacter(member)"
              >
                {{ speakingMemberId === member.id ? 'Stop' : 'Speak' }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <p v-else-if="hasSearched && !isLoading && !errorMessage" class="text-center text-sm text-slate-600">
        No cast data is available for this movie.
      </p>

    </div>
    <ConfirmDialog
      v-model="isRemoveDialogOpen"
      title="Remove Favorite"
      :message="removeDialogMessage"
      confirm-text="Remove"
      cancel-text="Cancel"
      :speak="true"
      @confirm="confirmRemoveCurrentMovie"
      @cancel="cancelRemoveCurrentMovie"
    />
    <footer class="mt-auto border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
      Copyright {{ currentYear }}
      <a
        href="https://adambailey.io"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-slate-800 underline transition hover:text-slate-600"
      >
        Adam Bailey
      </a>
    </footer>
  </main>
</template>
