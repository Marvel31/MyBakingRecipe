import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { MemoryRecipeRepository } from './test/memoryRecipeRepository'
import type { Recipe } from './types'

const now = '2026-06-16T00:00:00.000Z'

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe_1',
    title: 'Lemon Pound Cake',
    notes: 'I baked this with my family.',
    ingredients: 'Flour\nSugar\nLemon',
    steps: [{ id: 'step_1', text: 'Mix and bake.', photos: [] }],
    reflection: 'I learned lemon smells fresh.',
    photos: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('App', () => {
  it('creates a recipe through the repository contract', async () => {
    const user = userEvent.setup()
    const repository = new MemoryRecipeRepository()
    render(<App repository={repository} />)

    await user.click(await screen.findByRole('button', { name: /new recipe/i }))
    await user.type(screen.getByLabelText(/title/i), 'Blueberry Muffins')
    await user.type(screen.getByLabelText(/ingredients/i), 'Blueberries')
    await user.type(
      screen.getByPlaceholderText(/first, mix the butter and sugar/i),
      'Mix and bake.',
    )
    await user.click(screen.getByRole('button', { name: /save recipe/i }))

    expect(await screen.findByRole('heading', { name: /blueberry muffins/i })).toBeInTheDocument()
    expect(screen.getByText(/blueberries/i)).toBeInTheDocument()
  })

  it('updates and deletes an existing recipe', async () => {
    const user = userEvent.setup()
    const repository = new MemoryRecipeRepository([makeRecipe()])
    render(<App repository={repository} />)

    await user.click(await screen.findByRole('heading', { name: /lemon pound cake/i }))
    await user.click(screen.getByRole('button', { name: /edit recipe/i }))
    await user.clear(screen.getByLabelText(/title/i))
    await user.type(screen.getByLabelText(/title/i), 'Strawberry Tart')
    await user.click(screen.getByRole('button', { name: /save recipe/i }))

    expect(await screen.findByRole('heading', { name: /strawberry tart/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /delete recipe/i }))

    await waitFor(() => {
      expect(screen.getByText(/start your first bake/i)).toBeInTheDocument()
    })
  })
})
