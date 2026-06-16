import type { Recipe, RecipeDraft, RecipeId } from '../types'
import { normalizeRecipe } from '../services/recipeNormalization'
import type { RecipeRepository } from './recipeRepository'

const DB_NAME = 'my-baking-recipe'
const DB_VERSION = 1
const RECIPE_STORE = 'recipes'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(RECIPE_STORE)) {
        const store = db.createObjectStore(RECIPE_STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function createId(prefix: string) {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export class IndexedDbRecipeRepository implements RecipeRepository {
  async list(): Promise<Recipe[]> {
    const db = await openDatabase()
    const transaction = db.transaction(RECIPE_STORE, 'readonly')
    const store = transaction.objectStore(RECIPE_STORE)
    const recipes = await requestToPromise<Recipe[]>(store.getAll())

    return recipes.map(normalizeRecipe).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  async get(id: RecipeId): Promise<Recipe | undefined> {
    const db = await openDatabase()
    const transaction = db.transaction(RECIPE_STORE, 'readonly')
    const store = transaction.objectStore(RECIPE_STORE)

    const recipe = await requestToPromise<Recipe | undefined>(store.get(id))
    return recipe ? normalizeRecipe(recipe) : undefined
  }

  async create(draft: RecipeDraft): Promise<Recipe> {
    const now = new Date().toISOString()
    const recipe: Recipe = {
      ...draft,
      id: createId('recipe'),
      createdAt: now,
      updatedAt: now,
    }

    const db = await openDatabase()
    const transaction = db.transaction(RECIPE_STORE, 'readwrite')
    const store = transaction.objectStore(RECIPE_STORE)
    await requestToPromise(store.add(recipe))

    return recipe
  }

  async update(id: RecipeId, draft: RecipeDraft): Promise<Recipe> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error('Recipe not found')
    }

    const recipe: Recipe = {
      ...existing,
      ...draft,
      updatedAt: new Date().toISOString(),
    }

    const db = await openDatabase()
    const transaction = db.transaction(RECIPE_STORE, 'readwrite')
    const store = transaction.objectStore(RECIPE_STORE)
    await requestToPromise(store.put(recipe))

    return recipe
  }

  async delete(id: RecipeId): Promise<void> {
    const db = await openDatabase()
    const transaction = db.transaction(RECIPE_STORE, 'readwrite')
    const store = transaction.objectStore(RECIPE_STORE)
    await requestToPromise(store.delete(id))
  }
}

export const recipeRepository = new IndexedDbRecipeRepository()
