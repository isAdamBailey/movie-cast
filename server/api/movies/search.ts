import type { MovieSearchResponse } from '~/types'

interface SearchMovieResponse {
  id: number
  title: string
}

export default defineEventHandler(async (event): Promise<SearchMovieResponse | null> => {
  const query = getQuery(event).query

  if (typeof query !== 'string' || !query.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Query parameter is required.'
    })
  }

  const config = useRuntimeConfig(event)

  if (!config.tmdbApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'TMDB API key is not configured.'
    })
  }

  const response = await $fetch<MovieSearchResponse>(`${config.tmdbBaseApiUrl}/search/movie`, {
    query: {
      api_key: config.tmdbApiKey,
      query: query.trim()
    }
  })

  const firstMovie = response.results[0]

  if (!firstMovie) {
    return null
  }

  return {
    id: firstMovie.id,
    title: firstMovie.title
  }
})
