import {
  ArrowLeft,
  BookOpen,
  Camera,
  Edit3,
  Images,
  Share2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { PhotoImage } from './components/PhotoImage'
import { recipeRepository as defaultRecipeRepository } from './repositories/indexedDbRecipeRepository'
import type { RecipeRepository } from './repositories/recipeRepository'
import { fileToRecipePhoto } from './services/photoStorage'
import { createStep, stepsToSearchText } from './services/recipeNormalization'
import { shareRecipeImage } from './services/shareImage'
import type { Recipe, RecipeDraft, RecipePhoto, RecipeStep } from './types'

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'form'; id?: string }

const emptyDraft: RecipeDraft = {
  title: '',
  notes: '',
  ingredients: '',
  steps: [createStep()],
  reflection: '',
  photos: [],
}

interface AppProps {
  repository?: RecipeRepository
}

function App({ repository = defaultRecipeRepository }: AppProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [view, setView] = useState<View>({ name: 'list' })
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshRecipes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setRecipes(await repository.list())
    } catch {
      setError('Could not load your recipes.')
    } finally {
      setIsLoading(false)
    }
  }, [repository])

  useEffect(() => {
    let isActive = true

    repository
      .list()
      .then((nextRecipes) => {
        if (isActive) {
          setRecipes(nextRecipes)
          setError(null)
        }
      })
      .catch(() => {
        if (isActive) {
          setError('Could not load your recipes.')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [repository])

  const selectedRecipe = useMemo(() => {
    if (view.name === 'detail' || view.name === 'form') {
      return recipes.find((recipe) => recipe.id === view.id)
    }
    return undefined
  }, [recipes, view])

  const visibleRecipes = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) {
      return recipes
    }

    return recipes.filter((recipe) =>
      [
        recipe.title,
        recipe.notes,
        recipe.ingredients,
        stepsToSearchText(recipe.steps),
        recipe.reflection,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  }, [query, recipes])

  const saveRecipe = async (draft: RecipeDraft) => {
    setError(null)
    try {
      const saved =
        view.name === 'form' && view.id
          ? await repository.update(view.id, draft)
          : await repository.create(draft)
      await refreshRecipes()
      setView({ name: 'detail', id: saved.id })
    } catch (error) {
      console.error('Could not save this recipe.', error)
      setError(`Could not save this recipe. ${getErrorMessage(error)}`)
    }
  }

  const deleteRecipe = async (id: string) => {
    setError(null)
    try {
      await repository.delete(id)
      await refreshRecipes()
      setView({ name: 'list' })
    } catch (error) {
      console.error('Could not delete this recipe.', error)
      setError(`Could not delete this recipe. ${getErrorMessage(error)}`)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button
          className="icon-button"
          type="button"
          aria-label="Back to recipes"
          title="Back to recipes"
          onClick={() => setView({ name: 'list' })}
          disabled={view.name === 'list'}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">My Baking Recipe</p>
          <h1>English baking journal</h1>
        </div>
        <button
          className="icon-button primary"
          type="button"
          aria-label="New recipe"
          title="New recipe"
          onClick={() => setView({ name: 'form' })}
        >
          <Plus size={22} aria-hidden="true" />
        </button>
      </header>

      {error && <p className="notice">{error}</p>}

      {view.name === 'list' && (
        <RecipeList
          isLoading={isLoading}
          query={query}
          recipes={visibleRecipes}
          totalCount={recipes.length}
          onQueryChange={setQuery}
          onNewRecipe={() => setView({ name: 'form' })}
          onOpenRecipe={(id) => setView({ name: 'detail', id })}
        />
      )}

      {view.name === 'detail' && selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onEdit={() => setView({ name: 'form', id: selectedRecipe.id })}
          onDelete={() => void deleteRecipe(selectedRecipe.id)}
        />
      )}

      {view.name === 'form' && (
        <RecipeForm
          recipe={selectedRecipe}
          onCancel={() =>
            selectedRecipe
              ? setView({ name: 'detail', id: selectedRecipe.id })
              : setView({ name: 'list' })
          }
          onSave={saveRecipe}
        />
      )}
    </main>
  )
}

interface RecipeListProps {
  isLoading: boolean
  query: string
  recipes: Recipe[]
  totalCount: number
  onQueryChange: (query: string) => void
  onNewRecipe: () => void
  onOpenRecipe: (id: string) => void
}

function RecipeList({
  isLoading,
  query,
  recipes,
  totalCount,
  onQueryChange,
  onNewRecipe,
  onOpenRecipe,
}: RecipeListProps) {
  return (
    <section className="screen">
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search recipes</span>
          <input
            value={query}
            placeholder="Search recipes"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>

      {isLoading && <p className="empty-message">Loading recipes...</p>}

      {!isLoading && totalCount === 0 && (
        <div className="empty-state">
          <div className="empty-visual" aria-hidden="true">
            <BookOpen size={42} />
          </div>
          <h2>Start your first bake</h2>
          <p>Add a photo, write what you made, and keep your recipe in English.</p>
          <button className="text-button" type="button" onClick={onNewRecipe}>
            <Plus size={18} aria-hidden="true" />
            New recipe
          </button>
        </div>
      )}

      {!isLoading && totalCount > 0 && recipes.length === 0 && (
        <p className="empty-message">No recipes match your search.</p>
      )}

      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onOpen={() => onOpenRecipe(recipe.id)}
          />
        ))}
      </div>
    </section>
  )
}

function RecipeCard({
  recipe,
  onOpen,
}: {
  recipe: Recipe
  onOpen: () => void
}) {
  const coverPhoto = recipe.photos[0]

  return (
    <button className="recipe-card" type="button" onClick={onOpen}>
      <div className="card-photo">
        <PhotoImage
          key={coverPhoto?.id ?? 'empty-cover'}
          photo={coverPhoto}
          alt=""
          fallbackClassName="photo-fallback"
          fallbackSize={28}
        />
      </div>
      <div className="card-body">
        <h2>{recipe.title || 'Untitled bake'}</h2>
        <p>{recipe.notes || recipe.reflection || 'Tap to add your notes.'}</p>
        <time dateTime={recipe.updatedAt}>{formatDate(recipe.updatedAt)}</time>
      </div>
    </button>
  )
}

function RecipeDetail({
  recipe,
  onEdit,
  onDelete,
}: {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
}) {
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)

  const shareRecipe = async () => {
    setIsSharing(true)
    setShareStatus(null)

    try {
      const result = await shareRecipeImage(recipe)
      setShareStatus(
        result === 'shared'
          ? 'Recipe image is ready to share.'
          : 'Recipe image was downloaded. Send it in KakaoTalk.',
      )
    } catch {
      setShareStatus('Could not create the recipe image.')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <section className="screen detail-screen">
      <div className="detail-actions">
        <button
          className="icon-button"
          type="button"
          onClick={() => void shareRecipe()}
          aria-label="Share recipe image"
          title="Share recipe image"
          disabled={isSharing}
        >
          <Share2 size={19} aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" onClick={onEdit} aria-label="Edit recipe" title="Edit recipe">
          <Edit3 size={19} aria-hidden="true" />
        </button>
        <button className="icon-button danger" type="button" onClick={onDelete} aria-label="Delete recipe" title="Delete recipe">
          <Trash2 size={19} aria-hidden="true" />
        </button>
      </div>
      {shareStatus && <p className="share-status">{shareStatus}</p>}

      <div className="photo-strip">
        {recipe.photos.length > 0 ? (
          recipe.photos.map((photo, index) => (
            <PhotoImage
              key={photo.id}
              photo={photo}
              alt={`${recipe.title} photo ${index + 1}`}
              fallbackClassName="photo-placeholder"
              fallbackSize={32}
            />
          ))
        ) : (
          <div className="photo-placeholder">
            <Camera size={32} aria-hidden="true" />
          </div>
        )}
      </div>

      <article className="recipe-detail">
        <p className="eyebrow">{formatDate(recipe.updatedAt)}</p>
        <h2>{recipe.title || 'Untitled bake'}</h2>
        <DetailBlock title="Notes" value={recipe.notes} />
        <DetailBlock title="Ingredients" value={recipe.ingredients} />
        <StepDetail steps={recipe.steps} />
        <DetailBlock title="I learned" value={recipe.reflection} />
      </article>
    </section>
  )
}

function DetailBlock({ title, value }: { title: string; value: string }) {
  if (!value.trim()) {
    return null
  }

  return (
    <section className="detail-block">
      <h3>{title}</h3>
      <p>{value}</p>
    </section>
  )
}

function StepDetail({ steps }: { steps: RecipeStep[] }) {
  const hasSteps = steps.some((step) => step.text.trim() || step.photos.length > 0)

  if (!hasSteps) {
    return null
  }

  return (
    <section className="detail-block">
      <h3>Steps</h3>
      <div className="step-detail-list">
        {steps.map((step, index) => (
          <StepDetailItem key={step.id} index={index} step={step} />
        ))}
      </div>
    </section>
  )
}

function StepDetailItem({
  index,
  step,
}: {
  index: number
  step: RecipeStep
}) {
  if (!step.text.trim() && step.photos.length === 0) {
    return null
  }

  return (
    <div className="step-detail-item">
      <div className="step-number">{index + 1}</div>
      <div>
        {step.text.trim() && <p>{step.text}</p>}
        {step.photos.length > 0 && (
          <div className="inline-photo-grid">
            {step.photos.map((photo, photoIndex) => (
              <PhotoImage
                key={photo.id}
                photo={photo}
                alt={`Step ${index + 1} photo ${photoIndex + 1}`}
                fallbackClassName="inline-photo-fallback"
                fallbackSize={24}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecipeForm({
  recipe,
  onCancel,
  onSave,
}: {
  recipe?: Recipe
  onCancel: () => void
  onSave: (draft: RecipeDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<RecipeDraft>(
    recipe
      ? {
          title: recipe.title,
          notes: recipe.notes,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          reflection: recipe.reflection,
          photos: recipe.photos,
        }
      : emptyDraft,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const updateField = (field: keyof RecipeDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const updateStepText = (id: string, text: string) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === id ? { ...step, text } : step,
      ),
    }))
  }

  const addStep = () => {
    setDraft((current) => ({
      ...current,
      steps: [...current.steps, createStep()],
    }))
  }

  const removeStep = (id: string) => {
    setDraft((current) => ({
      ...current,
      steps:
        current.steps.length === 1
          ? [createStep()]
          : current.steps.filter((step) => step.id !== id),
    }))
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) {
      return
    }

    setPhotoError(null)
    try {
      const photos = await Promise.all(
        Array.from(files).map((file) => fileToRecipePhoto(file)),
      )
      setDraft((current) => ({
        ...current,
        photos: [...current.photos, ...photos],
      }))
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Could not add this photo.',
      )
    }
  }

  const removePhoto = (photo: RecipePhoto) => {
    setDraft((current) => ({
      ...current,
      photos: current.photos.filter((item) => item.id !== photo.id),
    }))
  }

  const addStepPhotos = async (stepId: string, files: FileList | null) => {
    if (!files?.length) {
      return
    }

    setPhotoError(null)
    try {
      const photos = await Promise.all(
        Array.from(files).map((file) => fileToRecipePhoto(file)),
      )
      setDraft((current) => ({
        ...current,
        steps: current.steps.map((step) =>
          step.id === stepId
            ? { ...step, photos: [...step.photos, ...photos] }
            : step,
        ),
      }))
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Could not add this photo.',
      )
    }
  }

  const removeStepPhoto = (stepId: string, photoId: string) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              photos: step.photos.filter((photo) => photo.id !== photoId),
            }
          : step,
      ),
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      return
    }

    setIsSaving(true)
    await onSave({ ...draft, title: draft.title.trim() })
    setIsSaving(false)
  }

  return (
    <section className="screen">
      <form className="recipe-form" onSubmit={submit}>
        <div className="form-heading">
          <div>
            <p className="eyebrow">{recipe ? 'Edit recipe' : 'New recipe'}</p>
            <h2>{recipe ? 'Update your bake' : 'Write a baking recipe'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Cancel" title="Cancel">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="photo-picker">
          <p className="photo-picker-title">Add photos</p>
          <div className="photo-picker-actions">
            <label className="photo-picker-button">
              <Images size={18} aria-hidden="true" />
              Gallery
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => void addPhotos(event.target.files)}
              />
            </label>
            <label className="photo-picker-button">
              <Camera size={18} aria-hidden="true" />
              Camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void addPhotos(event.target.files)}
              />
            </label>
          </div>
        </div>
        {photoError && <p className="field-error">{photoError}</p>}

        {draft.photos.length > 0 && (
          <div className="photo-preview-grid">
            {draft.photos.map((photo, index) => (
              <div className="photo-preview" key={photo.id}>
                <PhotoImage photo={photo} alt={`Recipe photo ${index + 1}`} />
                <button
                  type="button"
                  className="mini-button"
                  aria-label="Remove photo"
                  title="Remove photo"
                  onClick={() => removePhoto(photo)}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="field">
          <span>Title</span>
          <input
            required
            value={draft.title}
            placeholder="Chocolate chip cookies"
            onChange={(event) => updateField('title', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea
            value={draft.notes}
            placeholder="Today I baked..."
            onChange={(event) => updateField('notes', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Ingredients</span>
          <textarea
            value={draft.ingredients}
            placeholder="Flour, sugar, butter..."
            onChange={(event) => updateField('ingredients', event.target.value)}
          />
        </label>

        <div className="step-editor">
          <div className="section-heading-row">
            <span>Steps</span>
            <button className="small-text-button" type="button" onClick={addStep}>
              <Plus size={16} aria-hidden="true" />
              Add step
            </button>
          </div>
          {draft.steps.map((step, index) => (
            <StepEditor
              key={step.id}
              index={index}
              step={step}
              onTextChange={(text) => updateStepText(step.id, text)}
              onAddPhotos={(files) => void addStepPhotos(step.id, files)}
              onRemovePhoto={(photoId) => removeStepPhoto(step.id, photoId)}
              onRemoveStep={() => removeStep(step.id)}
            />
          ))}
        </div>

        <label className="field">
          <span>I learned</span>
          <textarea
            value={draft.reflection}
            placeholder="I learned that..."
            onChange={(event) => updateField('reflection', event.target.value)}
          />
        </label>

        <button className="save-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save recipe'}
        </button>
      </form>
    </section>
  )
}

function StepEditor({
  index,
  step,
  onTextChange,
  onAddPhotos,
  onRemovePhoto,
  onRemoveStep,
}: {
  index: number
  step: RecipeStep
  onTextChange: (text: string) => void
  onAddPhotos: (files: FileList | null) => void
  onRemovePhoto: (photoId: string) => void
  onRemoveStep: () => void
}) {
  return (
    <div className="step-editor-card">
      <div className="step-editor-header">
        <span>Step {index + 1}</span>
        <button
          type="button"
          className="mini-button static"
          aria-label={`Remove step ${index + 1}`}
          title="Remove step"
          onClick={onRemoveStep}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      <label className="field nested-field">
        <span className="sr-only">Step {index + 1}</span>
        <textarea
          value={step.text}
          placeholder="First, mix the butter and sugar."
          onChange={(event) => onTextChange(event.target.value)}
        />
      </label>
      <div className="step-photo-actions">
        <label className="step-photo-button">
          <Images size={16} aria-hidden="true" />
          Gallery
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => onAddPhotos(event.target.files)}
          />
        </label>
        <label className="step-photo-button">
          <Camera size={16} aria-hidden="true" />
          Camera
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => onAddPhotos(event.target.files)}
          />
        </label>
      </div>
      {step.photos.length > 0 && (
        <div className="photo-preview-grid compact">
          {step.photos.map((photo, photoIndex) => (
            <div className="photo-preview" key={photo.id}>
              <PhotoImage
                photo={photo}
                alt={`Step ${index + 1} photo ${photoIndex + 1}`}
              />
              <button
                type="button"
                className="mini-button"
                aria-label="Remove step photo"
                title="Remove photo"
                onClick={() => onRemovePhoto(photo.id)}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Please check the console for details.'
}

export default App
