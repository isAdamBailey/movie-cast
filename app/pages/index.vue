<script setup lang="ts">
import type { CastMember, MovieCreditsResponse, MovieDetailsResponse, MovieSummary } from '~/types'

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
const searchQuery = ref('')
const movieTitle = ref('')
const castMembers = ref<CastMember[]>([])
const movieDetails = ref<MovieDetailsResponse | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const hasSearched = ref(false)
const isVoiceSupported = ref(false)
const isListening = ref(false)

let recognition: SpeechRecognitionLike | null = null

const baseImageUrl = runtimeConfig.public.tmdbBaseImageUrl
const currentYear = new Date().getFullYear()

const onSubmit = async () => {
  const query = searchQuery.value.trim()
  errorMessage.value = ''

  if (!query) {
    errorMessage.value = 'Enter a movie title to search.'
    return
  }

  isLoading.value = true
  hasSearched.value = true
  castMembers.value = []
  movieTitle.value = ''
  movieDetails.value = null

  try {
    const movie = await $fetch<MovieSummary | null>('/api/movies/search', {
      query: { query }
    })

    if (!movie) {
      errorMessage.value = 'No matching movie was found.'
      return
    }

    const [credits, details] = await Promise.all([
      $fetch<MovieCreditsResponse>(`/api/movies/${movie.id}/credits`),
      $fetch<MovieDetailsResponse>(`/api/movies/${movie.id}/details`)
    ])
    movieTitle.value = movie.title
    castMembers.value = credits.cast
    movieDetails.value = details
  } catch {
    errorMessage.value = 'Unable to fetch movie data right now.'
  } finally {
    isLoading.value = false
  }
}

const getProfileImageUrl = (profilePath: string) => `${baseImageUrl}${profilePath}`
const getMovieImageUrl = (path: string) => `${baseImageUrl}${path}`
const trailerEmbedUrl = computed(() => {
  if (!movieDetails.value?.trailer_key) {
    return null
  }

  return `https://www.youtube-nocookie.com/embed/${movieDetails.value.trailer_key}`
})

onMounted(() => {
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
</script>

<template>
  <main class="flex min-h-screen flex-col bg-slate-100 text-slate-900">
    <div class="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-10">
      <header class="space-y-2 text-center">
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

      <section v-if="movieTitle" class="space-y-4">
        <div v-if="movieDetails" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="grid gap-4 p-4 md:grid-cols-2">
            <div class="space-y-3">
              <h2 class="text-2xl font-bold">
                {{ movieDetails.title }}
              </h2>
              <p v-if="movieDetails.release_date" class="text-sm text-slate-600">
                Released: {{ movieDetails.release_date }}
              </p>
              <p class="text-sm leading-6 text-slate-700">
                {{ movieDetails.overview || 'No description available.' }}
              </p>
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
            </div>
          </article>
        </div>
      </section>

      <p v-else-if="hasSearched && !isLoading && !errorMessage" class="text-center text-sm text-slate-600">
        No cast data is available for this movie.
      </p>

    </div>
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
