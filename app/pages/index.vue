<script setup lang="ts">
import type { CastMember, MovieCreditsResponse } from '~/types'

interface SearchMovieResponse {
  id: number
  title: string
}

const runtimeConfig = useRuntimeConfig()
const searchQuery = ref('')
const movieTitle = ref('')
const castMembers = ref<CastMember[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const hasSearched = ref(false)

const baseImageUrl = runtimeConfig.public.tmdbBaseImageUrl

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

  try {
    const movie = await $fetch<SearchMovieResponse | null>('/api/movies/search', {
      query: { query }
    })

    if (!movie) {
      errorMessage.value = 'No matching movie was found.'
      return
    }

    const credits = await $fetch<MovieCreditsResponse>(`/api/movies/${movie.id}/credits`)
    movieTitle.value = movie.title
    castMembers.value = credits.cast
  } catch {
    errorMessage.value = 'Unable to fetch movie data right now.'
  } finally {
    isLoading.value = false
  }
}

const getProfileImageUrl = (profilePath: string) => `${baseImageUrl}${profilePath}`
</script>

<template>
  <main class="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
    <div class="mx-auto max-w-6xl space-y-8">
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
          type="submit"
          :disabled="isLoading"
          class="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {{ isLoading ? 'Searching...' : 'Search' }}
        </button>
      </form>

      <p v-if="errorMessage" class="text-center text-sm font-medium text-red-600">
        {{ errorMessage }}
      </p>

      <section v-if="movieTitle" class="space-y-4">
        <h2 class="text-xl font-semibold sm:text-2xl">
          Cast for {{ movieTitle }}
        </h2>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article
            v-for="member in castMembers"
            :key="member.id"
            class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <img
              v-if="member.profile_path"
              :src="getProfileImageUrl(member.profile_path)"
              :alt="member.name"
              class="h-72 w-full object-cover"
              loading="lazy"
            >
            <div
              v-else
              class="h-72 w-full bg-slate-200"
            />
            <div class="space-y-1 p-4">
              <h3 class="font-semibold">
                {{ member.name }}
              </h3>
              <p class="text-sm text-slate-600">
                {{ member.character }}
              </p>
            </div>
          </article>
        </div>
      </section>

      <p v-else-if="hasSearched && !isLoading && !errorMessage" class="text-center text-sm text-slate-600">
        No cast data is available for this movie.
      </p>
    </div>
  </main>
</template>
