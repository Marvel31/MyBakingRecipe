import { photoToObjectUrl } from './photoStorage'
import type { Recipe, RecipePhoto } from '../types'

const WIDTH = 1080
const PADDING = 72
const CARD_RADIUS = 28

interface PreparedPhoto {
  image: HTMLImageElement
  url: string
}

export async function shareRecipeImage(recipe: Recipe): Promise<'shared' | 'downloaded'> {
  const file = await createRecipeImageFile(recipe)

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: recipe.title || 'My Baking Recipe',
      text: 'My baking recipe',
      files: [file],
    })
    return 'shared'
  }

  downloadFile(file)
  return 'downloaded'
}

export async function createRecipeImageFile(recipe: Recipe): Promise<File> {
  const coverPhotos = await preparePhotos(recipe.photos.slice(0, 2))
  const stepPhotos = await Promise.all(
    recipe.steps.map((step) => preparePhotos(step.photos.slice(0, 2))),
  )

  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not create recipe image.')
    }

    canvas.width = WIDTH
    canvas.height = 3600
    const renderer = new RecipeImageRenderer(context)
    const height = renderer.draw(recipe, coverPhotos, stepPhotos)
    canvas.height = Math.ceil(height)
    new RecipeImageRenderer(context).draw(recipe, coverPhotos, stepPhotos)

    const blob = await canvasToBlob(canvas)
    return new File([blob], `${slugify(recipe.title || 'recipe')}.png`, {
      type: 'image/png',
    })
  } finally {
    ;[...coverPhotos, ...stepPhotos.flat()].forEach((photo) => {
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url)
      }
    })
  }
}

class RecipeImageRenderer {
  private context: CanvasRenderingContext2D

  constructor(context: CanvasRenderingContext2D) {
    this.context = context
  }

  draw(recipe: Recipe, coverPhotos: PreparedPhoto[], stepPhotos: PreparedPhoto[][]) {
    const ctx = this.context
    let y = 0

    ctx.fillStyle = '#fbfaf7'
    ctx.fillRect(0, 0, WIDTH, ctx.canvas.height)

    y += PADDING
    y = this.text('MY BAKING RECIPE', PADDING, y, {
      color: '#2c7a7b',
      font: '700 28px system-ui, sans-serif',
      lineHeight: 38,
      maxWidth: WIDTH - PADDING * 2,
    })
    y += 12
    y = this.text(recipe.title || 'Untitled bake', PADDING, y, {
      color: '#24211d',
      font: '800 68px system-ui, sans-serif',
      lineHeight: 78,
      maxWidth: WIDTH - PADDING * 2,
    })
    y += 18
    y = this.text(formatDate(recipe.updatedAt), PADDING, y, {
      color: '#7c756a',
      font: '400 28px system-ui, sans-serif',
      lineHeight: 38,
      maxWidth: WIDTH - PADDING * 2,
    })
    y += 38

    if (coverPhotos.length > 0) {
      y = this.photoGrid(coverPhotos, PADDING, y, WIDTH - PADDING * 2, 420)
      y += 46
    }

    y = this.block('Notes', recipe.notes, y)
    y = this.block('Ingredients', recipe.ingredients, y)
    y = this.steps(recipe, stepPhotos, y)
    y = this.block('I learned', recipe.reflection, y)

    y += 30
    this.text('Made with My Baking Recipe', PADDING, y, {
      color: '#7c756a',
      font: '600 24px system-ui, sans-serif',
      lineHeight: 34,
      maxWidth: WIDTH - PADDING * 2,
    })

    return y + PADDING
  }

  private block(title: string, value: string, y: number) {
    if (!value.trim()) {
      return y
    }

    y = this.sectionTitle(title, y)
    y = this.text(value.trim(), PADDING, y, {
      color: '#514f4a',
      font: '400 32px system-ui, sans-serif',
      lineHeight: 46,
      maxWidth: WIDTH - PADDING * 2,
    })
    return y + 36
  }

  private steps(recipe: Recipe, stepPhotos: PreparedPhoto[][], y: number) {
    const visibleSteps = recipe.steps.filter(
      (step) => step.text.trim() || step.photos.length > 0,
    )

    if (visibleSteps.length === 0) {
      return y
    }

    y = this.sectionTitle('Steps', y)

    visibleSteps.forEach((step, index) => {
      const numberSize = 50
      this.circle(PADDING + numberSize / 2, y + numberSize / 2, numberSize / 2, '#2c7a7b')
      this.centerText(String(index + 1), PADDING, y + 9, numberSize, {
        color: '#ffffff',
        font: '800 28px system-ui, sans-serif',
        lineHeight: 34,
      })

      y = this.text(step.text.trim(), PADDING + 70, y, {
        color: '#514f4a',
        font: '400 32px system-ui, sans-serif',
        lineHeight: 46,
        maxWidth: WIDTH - PADDING * 2 - 70,
      })

      const photos = stepPhotos[recipe.steps.indexOf(step)] ?? []
      if (photos.length > 0) {
        y += 18
        y = this.photoGrid(photos, PADDING + 70, y, WIDTH - PADDING * 2 - 70, 260)
      }

      y += 34
    })

    return y + 4
  }

  private sectionTitle(title: string, y: number) {
    this.context.strokeStyle = '#ded8cc'
    this.context.lineWidth = 2
    this.context.beginPath()
    this.context.moveTo(PADDING, y)
    this.context.lineTo(WIDTH - PADDING, y)
    this.context.stroke()

    return (
      this.text(title, PADDING, y + 28, {
        color: '#24211d',
        font: '800 36px system-ui, sans-serif',
        lineHeight: 48,
        maxWidth: WIDTH - PADDING * 2,
      }) + 8
    )
  }

  private photoGrid(
    photos: PreparedPhoto[],
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const gap = 18
    const itemWidth = photos.length === 1 ? width : (width - gap) / 2

    photos.forEach((photo, index) => {
      this.roundedImage(
        photo.image,
        x + index * (itemWidth + gap),
        y,
        itemWidth,
        height,
        CARD_RADIUS,
      )
    })

    return y + height
  }

  private text(
    value: string,
    x: number,
    y: number,
    options: {
      color: string
      font: string
      lineHeight: number
      maxWidth: number
    },
  ) {
    const ctx = this.context
    ctx.fillStyle = options.color
    ctx.font = options.font
    ctx.textBaseline = 'top'

    const paragraphs = value.split('\n')
    paragraphs.forEach((paragraph) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean)
      if (words.length === 0) {
        y += options.lineHeight
        return
      }

      let line = ''
      words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word
        if (ctx.measureText(testLine).width > options.maxWidth && line) {
          ctx.fillText(line, x, y)
          y += options.lineHeight
          line = word
        } else {
          line = testLine
        }
      })
      ctx.fillText(line, x, y)
      y += options.lineHeight
    })

    return y
  }

  private centerText(
    value: string,
    x: number,
    y: number,
    width: number,
    options: {
      color: string
      font: string
      lineHeight: number
    },
  ) {
    const ctx = this.context
    ctx.fillStyle = options.color
    ctx.font = options.font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(value, x + width / 2, y)
    ctx.textAlign = 'start'
  }

  private circle(x: number, y: number, radius: number, color: string) {
    this.context.fillStyle = color
    this.context.beginPath()
    this.context.arc(x, y, radius, 0, Math.PI * 2)
    this.context.fill()
  }

  private roundedImage(
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    const ctx = this.context
    ctx.save()
    roundedRect(ctx, x, y, width, height, radius)
    ctx.clip()

    const imageRatio = image.width / image.height
    const targetRatio = width / height
    let drawWidth = width
    let drawHeight = height
    let drawX = x
    let drawY = y

    if (imageRatio > targetRatio) {
      drawWidth = height * imageRatio
      drawX = x - (drawWidth - width) / 2
    } else {
      drawHeight = width / imageRatio
      drawY = y - (drawHeight - height) / 2
    }

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
    ctx.restore()
  }
}

async function preparePhotos(photos: RecipePhoto[]): Promise<PreparedPhoto[]> {
  const prepared = await Promise.all(
    photos.map(async (photo) => {
      const url = photoToObjectUrl(photo)
      if (!url) {
        return undefined
      }

      return {
        url,
        image: await loadImage(url),
      }
    }),
  )

  return prepared.filter((photo): photo is PreparedPhoto => Boolean(photo))
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load recipe photo.'))
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Could not create recipe image.'))
      }
    }, 'image/png')
  })
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'recipe'
}
