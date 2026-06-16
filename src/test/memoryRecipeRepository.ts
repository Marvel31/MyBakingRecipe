import type { Recipe, RecipeDraft, RecipeId } from '../types'
import { normalizeRecipe } from '../services/recipeNormalization'
import type { RecipeRepository } from '../repositories/recipeRepository'

export class MemoryRecipeRepository implements RecipeRepository {
  private recipes: Recipe[] = []

  constructor(initialRecipes: Recipe[] = []) {
    this.recipes = initialRecipes
  }

  async list() {
    return [...this.recipes].map(normalizeRecipe).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  async get(id: RecipeId) {
    const recipe = this.recipes.find((item) => item.id === id)
    return recipe ? normalizeRecipe(recipe) : undefined
  }

  async create(draft: RecipeDraft) {
    const now = new Date().toISOString()
    const recipe: Recipe = {
      ...draft,
      id: `recipe_${this.recipes.length + 1}`,
      createdAt: now,
      updatedAt: now,
    }
    this.recipes = [recipe, ...this.recipes]
    return recipe
  }

  async update(id: RecipeId, draft: RecipeDraft) {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error('Recipe not found')
    }
    const recipe = {
      ...existing,
      ...draft,
      updatedAt: new Date().toISOString(),
    }
    this.recipes = this.recipes.map((item) => (item.id === id ? recipe : item))
    return recipe
  }

  async delete(id: RecipeId) {
    this.recipes = this.recipes.filter((recipe) => recipe.id !== id)
  }
}
