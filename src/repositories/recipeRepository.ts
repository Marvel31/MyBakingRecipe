import type { Recipe, RecipeDraft, RecipeId } from '../types'

export interface RecipeRepository {
  list(): Promise<Recipe[]>
  get(id: RecipeId): Promise<Recipe | undefined>
  create(draft: RecipeDraft): Promise<Recipe>
  update(id: RecipeId, draft: RecipeDraft): Promise<Recipe>
  delete(id: RecipeId): Promise<void>
}
