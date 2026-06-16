import type { Recipe, RecipeStep } from '../types'

export function createStep(text = ''): RecipeStep {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`

  return {
    id: `step_${id}`,
    text,
    photos: [],
  }
}

export function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    steps: normalizeSteps(recipe.steps),
  }
}

export function normalizeSteps(steps: Recipe['steps'] | string): RecipeStep[] {
  if (Array.isArray(steps)) {
    return steps.length > 0
      ? steps.map((step) => ({
          ...step,
          photos: Array.isArray(step.photos) ? step.photos : [],
        }))
      : [createStep()]
  }

  return [createStep(steps)]
}

export function stepsToSearchText(steps: RecipeStep[]) {
  return steps.map((step) => step.text).join(' ')
}
