import { useEffect, useMemo } from 'react'
import { photoToObjectUrl } from '../services/photoStorage'
import type { RecipePhoto } from '../types'

export function useObjectUrls(photos: RecipePhoto[]) {
  const urls = useMemo(
    () =>
      photos
      .map((photo) => photoToObjectUrl(photo))
        .filter((url): url is string => Boolean(url)),
    [photos],
  )

  useEffect(() => {
    return () => {
      urls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [urls])

  return urls
}
