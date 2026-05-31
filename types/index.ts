export interface MovieSearchResult {
  id: number
  title: string
  release_date: string
}

export interface MovieSummary {
  id: number
  title: string
}

export interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

export interface MovieSearchResponse {
  results: MovieSearchResult[]
}

export interface MovieCreditsResponse {
  cast: CastMember[]
}

export interface MovieVideoResult {
  key: string
  site: string
  type: string
  official: boolean
}

export interface MovieDetailsResponse {
  id: number
  title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  trailer_key: string | null
}

export interface FavoriteMovie {
  id: number
  title: string
  image_path: string | null
}
