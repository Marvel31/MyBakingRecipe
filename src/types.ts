export type RecipeId = string
export type PhotoId = string

export interface RecipePhoto {
  id: PhotoId
  storageKey: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
  blob?: Blob
  url?: string
}

export interface RecipeStep {
  id: string
  text: string
  photos: RecipePhoto[]
}

export interface Recipe {
  id: RecipeId
  title: string
  notes: string
  ingredients: string
  steps: RecipeStep[]
  reflection: string
  photos: RecipePhoto[]
  createdAt: string
  updatedAt: string
}

export interface RecipeDraft {
  title: string
  notes: string
  ingredients: string
  steps: RecipeStep[]
  reflection: string
  photos: RecipePhoto[]
}
