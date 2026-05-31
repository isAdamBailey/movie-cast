import type { MovieCreditsResponse } from '~/types'

export default defineEventHandler(async (event): Promise<MovieCreditsResponse> => {
  const id = getRouterParam(event, 'id')

  if (!id || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Movie id must be a numeric value.'
    })
  }

  const config = useRuntimeConfig(event)

  if (!config.tmdbApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'TMDB API key is not configured.'
    })
  }

  const response = await $fetch<MovieCreditsResponse>(`${config.tmdbBaseApiUrl}/movie/${id}/credits`, {
    query: {
      api_key: config.tmdbApiKey
    }
  })

  return {
    cast: response.cast
  }
})
