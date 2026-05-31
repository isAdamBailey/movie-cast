import type { MovieDetailsResponse, MovieVideoResult } from '../../../../types'

interface TmdbMovieDetailsResponse {
  id: number
  title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  videos?: {
    results: MovieVideoResult[]
  }
}

export default defineEventHandler(async (event): Promise<MovieDetailsResponse> => {
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

  const response = await $fetch<TmdbMovieDetailsResponse>(`${config.tmdbBaseApiUrl}/movie/${id}`, {
    query: {
      api_key: config.tmdbApiKey,
      append_to_response: 'videos'
    }
  })

  const trailer = response.videos?.results.find((video) => {
    return video.site === 'YouTube' && video.type === 'Trailer' && video.official
  }) ?? response.videos?.results.find((video) => {
    return video.site === 'YouTube' && video.type === 'Trailer'
  }) ?? null

  return {
    id: response.id,
    title: response.title,
    overview: response.overview,
    release_date: response.release_date,
    poster_path: response.poster_path,
    backdrop_path: response.backdrop_path,
    trailer_key: trailer?.key ?? null
  }
})
