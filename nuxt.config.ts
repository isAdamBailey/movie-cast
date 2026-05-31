export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    tmdbApiKey: process.env.TMDB_API_KEY,
    tmdbBaseApiUrl: process.env.TMDB_BASE_API_URL || 'https://api.themoviedb.org/3',
    public: {
      tmdbBaseImageUrl: process.env.TMDB_BASE_IMAGE_URL || 'https://image.tmdb.org/t/p/w200'
    }
  }
})
