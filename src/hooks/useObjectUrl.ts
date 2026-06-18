import { useMemo } from 'react'
import { photoToObjectUrl } from '../services/photoStorage'
import type { RecipePhoto } from '../types'

export function useObjectUrl(photo: RecipePhoto | undefined) {
  return useMemo(() => (photo ? photoToObjectUrl(photo) : undefined), [photo])
}
