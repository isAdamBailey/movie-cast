export interface MovieSearchResult {
  id: number
  title: string
  release_date: string
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
