import React, { useState } from 'react'
import {
  Image,
  Play,
  Download,
  RefreshCw,
  Settings,
  Zap,
  Copy,
  Eye,
  Grid,
  Sliders
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, downloadFile } from '../lib/utils'

interface ImageGenerationSettings {
  model: string
  size: string
  quality: string
  style: string
  steps: number
  guidanceScale: number
  seed?: number
  batchSize: number
}

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  settings: ImageGenerationSettings
  timestamp: Date
}

const models = [
  { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI' },
  { id: 'dall-e-2', name: 'DALL-E 2', provider: 'OpenAI' },
  { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', provider: 'Stability AI' },
  { id: 'mock-model', name: 'Mock Model', provider: 'Demo' }
]

const sizes = [
  { id: '1024x1024', name: '1024×1024 (Square)' },
  { id: '1792x1024', name: '1792×1024 (Landscape)' },
  { id: '1024x1792', name: '1024×1792 (Portrait)' },
  { id: '512x512', name: '512×512 (Small)' }
]

const styles = [
  { id: 'natural', name: 'Natural' },
  { id: 'vivid', name: 'Vivid' },
  { id: 'artistic', name: 'Artistic' },
  { id: 'photographic', name: 'Photographic' },
  { id: 'anime', name: 'Anime' },
  { id: 'digital-art', name: 'Digital Art' }
]

const prompts = [
  "A serene mountain landscape at sunset with a crystal clear lake",
  "A futuristic city with flying cars and neon lights",
  "A cute robot watering plants in a greenhouse",
  "An astronaut painting a picture on the moon",
  "A magical forest with glowing mushrooms and fairy lights",
  "A steampunk airship flying through clouds",
  "A cozy coffee shop interior with warm lighting",
  "A dragon made of crystal perched on a mountain peak"
]

const ImageGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)

  const [settings, setSettings] = useState<ImageGenerationSettings>({
    model: 'mock-model',
    size: '1024x1024',
    quality: 'standard',
    style: 'natural',
    steps: 50,
    guidanceScale: 7.5,
    batchSize: 1
  })

  const { generateImage, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Image generation failed: ${err.message}`)
      setIsGenerating(false)
    }
  })

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter an image prompt')
      return
    }

    setIsGenerating(true)

    try {
      // For demo purposes, we'll generate mock images
      const newImages: GeneratedImage[] = []

      for (let i = 0; i < settings.batchSize; i++) {
        // In real implementation, this would call the actual AI image generation API
        const mockImageUrl = `https://picsum.photos/seed/${Date.now() + i}/512/512`

        const image: GeneratedImage = {
          id: `img_${Date.now()}_${i}`,
          url: mockImageUrl,
          prompt,
          settings: { ...settings },
          timestamp: new Date()
        }

        newImages.push(image)
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      setImages(prev => [...newImages, ...prev])
      toast.success(`Generated ${newImages.length} image(s)!`)
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `generated-image-${image.id}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Image downloaded!')
    } catch (err) {
      toast.error('Failed to download image')
    }
  }

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success('Prompt copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy prompt')
    }
  }

  const handleSettingChange = (key: keyof ImageGenerationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handlePromptSelect = (selectedPrompt: string) => {
    setPrompt(selectedPrompt)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Image className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Image Generation</h1>
            <p className="text-muted-foreground">Create images from text descriptions using AI</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn-outline"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Image Prompt</h3>
              <p className="card-description">Describe the image you want to generate</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A beautiful sunset over a calm ocean with gentle waves..."
                className="textarea min-h-[120px] resize-none"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="btn-primary"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Image
                    </>
                  )}
                </button>

                <div className="text-sm text-muted-foreground">
                  {prompt.length} characters
                </div>
              </div>
            </div>
          </div>

          {/* Example Prompts */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Example Prompts</h3>
            </div>
            <div className="card-content">
              <div className="grid md:grid-cols-2 gap-2">
                {prompts.map((examplePrompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptSelect(examplePrompt)}
                    disabled={isGenerating}
                    className="text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{examplePrompt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Images Grid */}
          {images.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Generated Images</h3>
                  <div className="flex items-center gap-2">
                    <Grid className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{images.length} images</span>
                  </div>
                </div>
              </div>
              <div className="card-content">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative rounded-lg overflow-hidden border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    >
                      <div className="aspect-square">
                        <img
                          src={image.url}
                          alt={image.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedImage(image)
                            }}
                            className="btn-secondary btn-sm"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadImage(image)
                            }}
                            className="btn-secondary btn-sm"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyPrompt(image.prompt)
                            }}
                            className="btn-secondary btn-sm"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white p-2">
                        <p className="text-xs truncate">{image.prompt}</p>
                        <p className="text-xs text-gray-300">{image.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          {showSettings && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Generation Settings</h3>
                </div>
                <div className="card-content space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model</label>
                    <select
                      value={settings.model}
                      onChange={(e) => handleSettingChange('model', e.target.value)}
                      className="input"
                    >
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Size</label>
                    <select
                      value={settings.size}
                      onChange={(e) => handleSettingChange('size', e.target.value)}
                      className="input"
                    >
                      {sizes.map(size => (
                        <option key={size.id} value={size.id}>{size.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Style</label>
                    <select
                      value={settings.style}
                      onChange={(e) => handleSettingChange('style', e.target.value)}
                      className="input"
                    >
                      {styles.map(style => (
                        <option key={style.id} value={style.id}>{style.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={(e) => handleSettingChange('quality', e.target.value)}
                      className="input"
                    >
                      <option value="standard">Standard</option>
                      <option value="hd">HD</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Steps: {settings.steps}</label>
                    <input
                      type="range"
                      value={settings.steps}
                      onChange={(e) => handleSettingChange('steps', parseInt(e.target.value))}
                      className="w-full"
                      min="20"
                      max="100"
                      step="10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Guidance Scale: {settings.guidanceScale}</label>
                    <input
                      type="range"
                      value={settings.guidanceScale}
                      onChange={(e) => handleSettingChange('guidanceScale', parseFloat(e.target.value))}
                      className="w-full"
                      min="1"
                      max="20"
                      step="0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Batch Size</label>
                    <select
                      value={settings.batchSize}
                      onChange={(e) => handleSettingChange('batchSize', parseInt(e.target.value))}
                      className="input"
                    >
                      <option value={1}>1 image</option>
                      <option value={2}>2 images</option>
                      <option value={4}>4 images</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seed (optional)</label>
                    <input
                      type="number"
                      value={settings.seed || ''}
                      onChange={(e) => handleSettingChange('seed', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Random seed"
                      className="input"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Image Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Statistics</h3>
            </div>
            <div className="card-content space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Images</span>
                <span className="font-medium">{images.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Model</span>
                <span className="font-medium">
                  {models.find(m => m.id === settings.model)?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Resolution</span>
                <span className="font-medium">{settings.size}</span>
              </div>
              {images.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Latest</span>
                  <span className="font-medium">
                    {images[0]?.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Generated Image</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="btn-ghost btn-sm"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.prompt}
                className="w-full h-auto max-h-[60vh] object-contain rounded-md"
              />
              <div className="mt-4 space-y-2">
                <p className="text-sm"><strong>Prompt:</strong> {selectedImage.prompt}</p>
                <p className="text-sm"><strong>Model:</strong> {selectedImage.settings.model}</p>
                <p className="text-sm"><strong>Size:</strong> {selectedImage.settings.size}</p>
                <p className="text-sm"><strong>Generated:</strong> {selectedImage.timestamp.toLocaleString()}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleDownloadImage(selectedImage)}
                  className="btn-primary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => handleCopyPrompt(selectedImage.prompt)}
                  className="btn-outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card border-destructive">
          <div className="card-content">
            <div className="flex items-center gap-2 text-destructive">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageGeneration