import React, { useState } from 'react'
import {
  Settings,
  MessageSquare,
  Code,
  Image,
  Mic,
  Volume2,
  Brain,
  Sparkles,
  BarChart3,
  Zap,
  GitBranch,
  Heart,
  Search,
  FileText,
  Tag,
  Menu,
  X
} from 'lucide-react'
import { cn } from './lib/utils'

// Import demo components
import SettingsPanel from './components/SettingsPanel'
import TextGeneration from './components/TextGeneration'
import CodeGeneration from './components/CodeGeneration'
import ImageGeneration from './components/ImageGeneration'
import AudioTranscription from './components/AudioTranscription'
import SpeechGeneration from './components/SpeechGeneration'
import Embeddings from './components/Embeddings'
import TextClassification from './components/TextClassification'
import Summarization from './components/Summarization'
import SentimentAnalysis from './components/SentimentAnalysis'
import Analytics from './components/Analytics'
import ChatDemo from './components/ChatDemo'

interface DemoItem {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
  description: string
  category: 'text' | 'code' | 'media' | 'analysis' | 'monitoring' | 'other'
}

const demoItems: DemoItem[] = [
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    component: SettingsPanel,
    description: 'Configure API keys and provider settings',
    category: 'other'
  },
  {
    id: 'chat',
    name: 'Chat Demo',
    icon: MessageSquare,
    component: ChatDemo,
    description: 'Interactive chat with AI assistants',
    category: 'text'
  },
  {
    id: 'text-generation',
    name: 'Text Generation',
    icon: FileText,
    component: TextGeneration,
    description: 'Generate text with various AI models',
    category: 'text'
  },
  {
    id: 'code-generation',
    name: 'Code Generation',
    icon: Code,
    component: CodeGeneration,
    description: 'Generate and explain code in multiple languages',
    category: 'code'
  },
  {
    id: 'image-generation',
    name: 'Image Generation',
    icon: Image,
    component: ImageGeneration,
    description: 'Create images from text descriptions',
    category: 'media'
  },
  {
    id: 'audio-transcription',
    name: 'Audio Transcription',
    icon: Mic,
    component: AudioTranscription,
    description: 'Convert speech to text',
    category: 'media'
  },
  {
    id: 'speech-generation',
    name: 'Speech Generation',
    icon: Volume2,
    component: SpeechGeneration,
    description: 'Convert text to speech',
    category: 'media'
  },
  {
    id: 'embeddings',
    name: 'Embeddings',
    icon: Brain,
    component: Embeddings,
    description: 'Generate and search with text embeddings',
    category: 'analysis'
  },
  {
    id: 'classification',
    name: 'Text Classification',
    icon: Tag,
    component: TextClassification,
    description: 'Classify text into categories',
    category: 'analysis'
  },
  {
    id: 'summarization',
    name: 'Summarization',
    icon: Sparkles,
    component: Summarization,
    description: 'Summarize long texts in different styles',
    category: 'analysis'
  },
  {
    id: 'sentiment',
    name: 'Sentiment Analysis',
    icon: Heart,
    component: SentimentAnalysis,
    description: 'Analyze emotional tone of text',
    category: 'analysis'
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: BarChart3,
    component: Analytics,
    description: 'Monitor usage, performance, and costs',
    category: 'monitoring'
  }
]

const categories = {
  text: { name: 'Text & Language', icon: FileText },
  code: { name: 'Code Generation', icon: Code },
  media: { name: 'Media Processing', icon: Image },
  analysis: { name: 'Analysis & Understanding', icon: Brain },
  monitoring: { name: 'Monitoring & Analytics', icon: BarChart3 },
  other: { name: 'Configuration', icon: Settings }
}

function App() {
  const [activeDemo, setActiveDemo] = useState('settings')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDemos = demoItems.filter(demo =>
    demo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    demo.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ActiveComponent = demoItems.find(item => item.id === activeDemo)?.component || SettingsPanel

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "relative flex flex-col border-r bg-muted/50 transition-all duration-300",
        sidebarOpen ? "w-80" : "w-16"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <h1 className="font-semibold text-lg">AI Toolkit</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost btn-sm"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Search */}
        {sidebarOpen && (
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search demos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(categories).map(([categoryKey, category]) => {
            const categoryDemos = filteredDemos.filter(demo => demo.category === categoryKey)
            if (categoryDemos.length === 0) return null

            return (
              <div key={categoryKey} className="mb-6">
                {sidebarOpen && (
                  <h3 className="px-2 mb-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <category.icon className="h-4 w-4" />
                    {category.name}
                  </h3>
                )}
                <div className="space-y-1">
                  {categoryDemos.map((demo) => (
                    <button
                      key={demo.id}
                      onClick={() => setActiveDemo(demo.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        activeDemo === demo.id && "bg-accent text-accent-foreground"
                      )}
                      title={sidebarOpen ? undefined : demo.name}
                    >
                      <demo.icon className="h-4 w-4 flex-shrink-0" />
                      {sidebarOpen && (
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{demo.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {demo.description}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t text-center">
            <div className="text-xs text-muted-foreground">
              AI Toolkit Playground
            </div>
            <div className="text-xs text-muted-foreground">
              v2.0.0
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-2xl font-bold">
                {demoItems.find(item => item.id === activeDemo)?.name || 'Settings'}
              </h2>
              <p className="text-muted-foreground">
                {demoItems.find(item => item.id === activeDemo)?.description || 'Configure your AI providers'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Local Development</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App