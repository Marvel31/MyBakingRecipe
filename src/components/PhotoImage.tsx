import { Camera } from 'lucide-react'
import { useState } from 'react'
import { useObjectUrl } from '../hooks/useObjectUrl'
import type { RecipePhoto } from '../types'

interface PhotoImageProps {
  photo?: RecipePhoto
  alt: string
  className?: string
  fallbackClassName?: string
  fallbackSize?: number
}

export function PhotoImage({
  photo,
  alt,
  className,
  fallbackClassName,
  fallbackSize = 28,
}: PhotoImageProps) {
  const url = useObjectUrl(photo)
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined)
  const hasError = Boolean(url && failedUrl === url)

  if (!url || hasError) {
    return (
      <div className={fallbackClassName} aria-label={alt || 'Recipe photo'}>
        <Camera size={fallbackSize} aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      className={className}
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailedUrl(url)}
    />
  )
}
