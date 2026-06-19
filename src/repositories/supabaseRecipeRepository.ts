import type { SupabaseClient } from '@supabase/supabase-js'
import type { Recipe, RecipeDraft, RecipeId, RecipePhoto } from '../types'
import { normalizeRecipe } from '../services/recipeNormalization'
import type { RecipeRepository } from './recipeRepository'

const PHOTO_BUCKET = 'recipe-photos'

interface RecipeRow {
  id: string
  user_id: string
  title: string
  notes: string
  ingredients: string
  steps: unknown
  reflection: string
  photos: unknown
  created_at: string
  updated_at: string
}

export class SupabaseRecipeRepository implements RecipeRepository {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(): Promise<Recipe[]> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Could not load recipes: ${error.message}`)
    }

    return Promise.all((data ?? []).map((row) => this.rowToRecipe(row as RecipeRow)))
  }

  async get(id: RecipeId): Promise<Recipe | undefined> {
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Could not load recipe: ${error.message}`)
    }

    return data ? this.rowToRecipe(data as RecipeRow) : undefined
  }

  async create(draft: RecipeDraft): Promise<Recipe> {
    const userId = await this.getUserId()
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const recipe = await this.prepareDraft(id, draft)

    const { data, error } = await this.client
      .from('recipes')
      .insert({
        id,
        user_id: userId,
        title: recipe.title,
        notes: recipe.notes,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        reflection: recipe.reflection,
        photos: recipe.photos,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Could not create recipe: ${error.message}`)
    }

    return this.rowToRecipe(data as RecipeRow)
  }

  async update(id: RecipeId, draft: RecipeDraft): Promise<Recipe> {
    const recipe = await this.prepareDraft(id, draft)

    const { data, error } = await this.client
      .from('recipes')
      .update({
        title: recipe.title,
        notes: recipe.notes,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        reflection: recipe.reflection,
        photos: recipe.photos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Could not update recipe: ${error.message}`)
    }

    return this.rowToRecipe(data as RecipeRow)
  }

  async delete(id: RecipeId): Promise<void> {
    const { error } = await this.client.from('recipes').delete().eq('id', id)

    if (error) {
      throw new Error(`Could not delete recipe: ${error.message}`)
    }
  }

  private async prepareDraft(recipeId: string, draft: RecipeDraft) {
    return {
      ...draft,
      photos: await this.uploadPhotos(recipeId, draft.photos),
      steps: await Promise.all(
        draft.steps.map(async (step) => ({
          ...step,
          photos: await this.uploadPhotos(recipeId, step.photos),
        })),
      ),
    }
  }

  private async uploadPhotos(recipeId: string, photos: RecipePhoto[]) {
    const userId = await this.getUserId()

    return Promise.all(
      photos.map(async (photo) => {
        if (!photo.blob) {
          return photoForDatabase(photo)
        }

        const extension = extensionFromMimeType(photo.mimeType)
        const path = `${userId}/${recipeId}/${photo.id}.${extension}`
        const { error } = await this.client.storage
          .from(PHOTO_BUCKET)
          .upload(path, photo.blob, {
            cacheControl: '3600',
            contentType: photo.mimeType,
            upsert: true,
          })

        if (error) {
          throw new Error(`Could not upload photo: ${error.message}`)
        }

        return photoForDatabase({
          ...photo,
          storageKey: path,
          url: undefined,
          blob: undefined,
        })
      }),
    )
  }

  private async getUserId() {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser()

    if (error || !user) {
      throw error ?? new Error('You must be signed in.')
    }

    return user.id
  }

  private async rowToRecipe(row: RecipeRow): Promise<Recipe> {
    const recipe = normalizeRecipe({
      id: row.id,
      title: row.title,
      notes: row.notes,
      ingredients: row.ingredients,
      steps: row.steps as Recipe['steps'],
      reflection: row.reflection,
      photos: row.photos as RecipePhoto[],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })

    return {
      ...recipe,
      photos: await this.signPhotos(recipe.photos),
      steps: await Promise.all(
        recipe.steps.map(async (step) => ({
          ...step,
          photos: await this.signPhotos(step.photos),
        })),
      ),
    }
  }

  private async signPhotos(photos: RecipePhoto[]): Promise<RecipePhoto[]> {
    return Promise.all(
      photos.map(async (photo) => {
        if (!photo.storageKey || photo.blob || photo.url) {
          return photo
        }

        const { data, error } = await this.client.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(photo.storageKey, 60 * 60)

        if (error) {
          return photo
        }

        return {
          ...photo,
          url: data.signedUrl,
        }
      }),
    )
  }
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png'
  }

  if (mimeType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

function photoForDatabase(photo: RecipePhoto): RecipePhoto {
  return {
    ...photo,
    blob: undefined,
    url: undefined,
  }
}
