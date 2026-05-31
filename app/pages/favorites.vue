<script setup lang="ts">
import type { FavoriteMovie } from '~/types'

const runtimeConfig = useRuntimeConfig()
const { favorites, loadFavorites, removeFavorite } = useFavoriteMovies()
const baseImageUrl = runtimeConfig.public.tmdbBaseImageUrl
const isRemoveDialogOpen = ref(false)
const pendingRemoveMovie = ref<FavoriteMovie | null>(null)
const removeDialogMessage = computed(() => {
  if (!pendingRemoveMovie.value) {
    return 'Remove this movie from favorites?'
  }

  return `Remove ${pendingRemoveMovie.value.title} from favorites?`
})

const requestRemoveFavorite = (movie: FavoriteMovie) => {
  pendingRemoveMovie.value = movie
  isRemoveDialogOpen.value = true
}

const confirmRemoveFavorite = () => {
  if (!pendingRemoveMovie.value) {
    return
  }

  removeFavorite(pendingRemoveMovie.value.id)
  pendingRemoveMovie.value = null
}

const cancelRemoveFavorite = () => {
  pendingRemoveMovie.value = null
}

onMounted(() => {
  loadFavorites()
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
    <div class="mx-auto max-w-6xl space-y-6">
      <header class="space-y-3">
        <NuxtLink
          to="/"
          class="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2.5 text-base font-medium text-slate-700 transition duration-200 ease-out hover:bg-slate-100 active:scale-95"
        >
          Back to Search
        </NuxtLink>
        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
          Favorite Movies
        </h1>
      </header>

      <p v-if="favorites.length === 0" class="text-sm text-slate-600">
        No favorites yet. Add one from the movie page.
      </p>

      <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <article
          v-for="movie in favorites"
          :key="movie.id"
          class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
        >
          <NuxtLink :to="`/?movieId=${movie.id}`" class="block">
            <img
              v-if="movie.image_path"
              :src="`${baseImageUrl}${movie.image_path}`"
              :alt="movie.title"
              class="h-64 w-full object-cover"
              loading="lazy"
            >
            <div v-else class="h-64 w-full bg-slate-200" />
            <div class="p-3">
              <h2 class="text-sm font-semibold text-slate-900">
                {{ movie.title }}
              </h2>
            </div>
          </NuxtLink>
          <div class="px-3 pb-3">
            <AppButton
              type="button"
              color="rose"
              size="md"
              :full-width="true"
              text="Remove from Favorites"
              @click="requestRemoveFavorite(movie)"
            />
          </div>
        </article>
      </div>
    </div>
    <ConfirmDialog
      v-model="isRemoveDialogOpen"
      title="Remove Favorite"
      :message="removeDialogMessage"
      confirm-text="Remove"
      cancel-text="Cancel"
      :speak="true"
      @confirm="confirmRemoveFavorite"
      @cancel="cancelRemoveFavorite"
    />
  </main>
</template>
