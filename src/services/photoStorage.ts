import type { RecipePhoto } from '../types'
import { compressImageFile } from './imageCompression'

function createPhotoId() {
  if (crypto.randomUUID) {
    return `photo_${crypto.randomUUID()}`
  }

  return `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export async function fileToRecipePhoto(file: File): Promise<RecipePhoto> {
  const blob = await compressImageFile(file)
  const id = createPhotoId()

  return {
    id,
    storageKey: `local/${id}`,
    fileName: file.name,
    mimeType: blob.type || file.type || 'image/jpeg',
    size: blob.size,
    createdAt: new Date().toISOString(),
    blob,
  }
}

export function photoToObjectUrl(photo: RecipePhoto): string | undefined {
  if (photo.url) {
    return photo.url
  }

  if (photo.blob) {
    return URL.createObjectURL(photo.blob)
  }

  return undefined
}
