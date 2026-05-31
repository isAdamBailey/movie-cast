import type { MovieSearchResponse, MovieSearchResult } from '../../../types'

interface MovieReleaseDateEntry {
  certification: string
}

interface MovieReleaseDateCountryEntry {
  iso_3166_1: string
  release_dates: MovieReleaseDateEntry[]
}

interface MovieReleaseDatesResponse {
  results: MovieReleaseDateCountryEntry[]
}

const DISALLOWED_CERTIFICATIONS = new Set(['R', 'NC-17', 'X', 'TV-MA'])

const isMovieAllowed = async (
  movieId: number,
  baseApiUrl: string,
  apiKey: string
): Promise<boolean> => {
  try {
    const releaseDates = await $fetch<MovieReleaseDatesResponse>(`${baseApiUrl}/movie/${movieId}/release_dates`, {
      query: {
        api_key: apiKey
      }
    })

    const usReleaseInfo = releaseDates.results.find((entry) => entry.iso_3166_1 === 'US')

    if (!usReleaseInfo) {
      return true
    }

    const certifications = usReleaseInfo.release_dates
      .map((releaseDate) => releaseDate.certification.trim().toUpperCase())
      .filter(Boolean)

    if (!certifications.length) {
      return true
    }

    return !certifications.some((certification) => DISALLOWED_CERTIFICATIONS.has(certification))
  } catch {
    return true
  }
}

export default defineEventHandler(async (event): Promise<MovieSearchResult[]> => {
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

  const mappedResults = response.results.slice(0, 15).map((movie) => ({
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date,
    poster_path: movie.poster_path
  }))

  const allowChecks = await Promise.all(
    mappedResults.map(async (movie) => ({
      movie,
      allowed: await isMovieAllowed(movie.id, config.tmdbBaseApiUrl, config.tmdbApiKey)
    }))
  )

  return allowChecks
    .filter((entry) => entry.allowed)
    .map((entry) => entry.movie)
    .slice(0, 10)
})
