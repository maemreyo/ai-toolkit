import React, { useState, useRef } from 'react'
import {
  Code,
  Play,
  Copy,
  Download,
  RefreshCw,
  Lightbulb,
  FileText,
  CheckSquare,
  MessageSquare,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn, copyToClipboard, downloadFile } from '../lib/utils'

interface CodeGenerationSettings {
  language: string
  framework: string
  style: 'concise' | 'verbose' | 'documented'
  includeTests: boolean
  includeComments: boolean
}

const languages = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby',
  'swift', 'kotlin', 'dart', 'scala', 'r', 'matlab', 'html', 'css', 'sql', 'bash'
]

const frameworks = {
  javascript: ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js', 'Svelte'],
  typescript: ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js', 'Nest.js'],
  python: ['Django', 'Flask', 'FastAPI', 'PyTorch', 'TensorFlow', 'Pandas', 'NumPy'],
  java: ['Spring', 'Spring Boot', 'Hibernate', 'Maven', 'Gradle'],
  cpp: ['Qt', 'Boost', 'OpenCV', 'CMake'],
  csharp: ['.NET', 'ASP.NET', 'Entity Framework', 'Xamarin', 'Unity'],
  go: ['Gin', 'Echo', 'Fiber', 'Gorilla'],
  rust: ['Actix', 'Rocket', 'Tokio', 'Serde'],
  php: ['Laravel', 'Symfony', 'CodeIgniter', 'WordPress'],
  swift: ['SwiftUI', 'UIKit', 'Vapor'],
  kotlin: ['Spring', 'Ktor', 'Android'],
}

const codeExamples = [
  "Create a REST API endpoint for user authentication",
  "Build a React component for a todo list with add/delete functionality",
  "Write a Python function to calculate fibonacci numbers",
  "Create a responsive navigation bar with dropdown menu",
  "Implement a binary search algorithm",
  "Build a simple chat application",
  "Create a data validation function",
  "Write a SQL query to find top selling products",
  "Implement a caching mechanism",
  "Create a unit test for a calculator function"
]

const CodeGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<any>(null)
  const [explanation, setExplanation] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExplaining, setIsExplaining] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'tests' | 'explanation'>('code')

  const [settings, setSettings] = useState<CodeGenerationSettings>({
    language: 'javascript',
    framework: 'React',
    style: 'documented',
    includeTests: true,
    includeComments: true
  })

  const { generateText, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Code generation failed: ${err.message}`)
      setIsGenerating(false)
      setIsExplaining(false)
    }
  })

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a code generation prompt')
      return
    }

    setIsGenerating(true)
    setResult(null)
    setExplanation('')

    try {
      const response = await generateText(
        `Generate ${settings.language} code for: ${prompt}

Requirements:
- Language: ${settings.language}
- Framework: ${settings.framework}
- Style: ${settings.style}
- Include comments: ${settings.includeComments}
- Include tests: ${settings.includeTests}

Please respond with a JSON object containing:
{
  "code": "the main code",
  "language": "${settings.language}",
  "explanation": "brief explanation of what the code does",
  ${settings.includeTests ? '"tests": "unit test code",' : ''}
  "dependencies": ["list", "of", "required", "dependencies"]
}`,
        {
          temperature: 0.2,
          maxTokens: 2000,
          systemPrompt: 'You are an expert programmer. Generate clean, efficient, and well-documented code. Always respond with valid JSON.'
        }
      )

      try {
        const parsedResult = JSON.parse(response)
        setResult(parsedResult)
        setActiveTab('code')
        toast.success('Code generated successfully!')
      } catch (parseError) {
        // Fallback if JSON parsing fails
        setResult({
          code: response,
          language: settings.language,
          explanation: 'Generated code (parsing failed)',
          dependencies: []
        })
        toast.success('Code generated (with parsing issues)')
      }
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExplain = async () => {
    if (!result?.code) {
      toast.error('No code to explain')
      return
    }

    setIsExplaining(true)

    try {
      const response = await generateText(
        `Explain this ${result.language} code in detail:

\`\`\`${result.language}
${result.code}
\`\`\`

Please provide:
1. What the code does (overview)
2. How it works (step by step)
3. Key concepts and patterns used
4. Potential improvements or optimizations
5. Common use cases`,
        {
          temperature: 0.3,
          maxTokens: 1500,
          systemPrompt: 'You are a programming teacher. Explain code clearly and comprehensively.'
        }
      )

      setExplanation(response)
      setActiveTab('explanation')
      toast.success('Code explanation generated!')
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsExplaining(false)
    }
  }

  const handleCopy = async (content: string) => {
    try {
      await copyToClipboard(content)
      toast.success('Copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy content')
    }
  }

  const handleDownload = (content: string, filename: string) => {
    const extension = settings.language === 'javascript' ? 'js' :
                     settings.language === 'typescript' ? 'ts' :
                     settings.language === 'python' ? 'py' :
                     settings.language === 'java' ? 'java' :
                     settings.language === 'cpp' ? 'cpp' :
                     settings.language === 'csharp' ? 'cs' : 'txt'

    downloadFile(content, `${filename}.${extension}`)
    toast.success(`${filename} downloaded!`)
  }

  const handleSettingChange = (key: keyof CodeGenerationSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value }

      // Update framework when language changes
      if (key === 'language') {
        const availableFrameworks = frameworks[value as keyof typeof frameworks] || ['None']
        newSettings.framework = availableFrameworks[0]
      }

      return newSettings
    })
  }

  const getDisplayContent = () => {
    switch (activeTab) {
      case 'code':
        return result?.code || ''
      case 'tests':
        return result?.tests || 'No tests generated'
      case 'explanation':
        return explanation || result?.explanation || 'No explanation available'
      default:
        return ''
    }
  }

  const getLanguageForHighlighter = () => {
    const langMap: { [key: string]: string } = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'csharp': 'csharp',
      'go': 'go',
      'rust': 'rust',
      'php': 'php',
      'ruby': 'ruby',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'sql': 'sql',
      'html': 'html',
      'css': 'css',
      'bash': 'bash'
    }

    return langMap[settings.language] || 'text'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Code className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Code Generation</h1>
          <p className="text-muted-foreground">Generate and explain code in multiple programming languages</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Code Prompt</h3>
              <p className="card-description">Describe what code you want to generate</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your code generation prompt here..."
                className="textarea min-h-[120px] resize-none font-mono"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
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
                        Generate Code
                      </>
                    )}
                  </button>

                  {result && (
                    <button
                      onClick={handleExplain}
                      disabled={isExplaining}
                      className="btn-outline"
                    >
                      {isExplaining ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Lightbulb className="h-4 w-4 mr-2" />
                      )}
                      Explain Code
                    </button>
                  )}
                </div>

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
              <div className="grid gap-2">
                {codeExamples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    disabled={isGenerating}
                    className="text-left p-2 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Generation Settings</h3>
            </div>
            <div className="card-content space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="input"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Framework</label>
                <select
                  value={settings.framework}
                  onChange={(e) => handleSettingChange('framework', e.target.value)}
                  className="input"
                >
                  {(frameworks[settings.language as keyof typeof frameworks] || ['None']).map(fw => (
                    <option key={fw} value={fw}>{fw}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Code Style</label>
                <select
                  value={settings.style}
                  onChange={(e) => handleSettingChange('style', e.target.value)}
                  className="input"
                >
                  <option value="concise">Concise</option>
                  <option value="verbose">Verbose</option>
                  <option value="documented">Well Documented</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Include Comments</label>
                  <button
                    onClick={() => handleSettingChange('includeComments', !settings.includeComments)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.includeComments ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.includeComments ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Include Tests</label>
                  <button
                    onClick={() => handleSettingChange('includeTests', !settings.includeTests)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.includeTests ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.includeTests ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dependencies */}
          {result?.dependencies && result.dependencies.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Dependencies</h3>
              </div>
              <div className="card-content">
                <div className="space-y-1">
                  {result.dependencies.map((dep: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Code className="h-3 w-3 text-muted-foreground" />
                      <code className="bg-muted px-1 rounded text-xs">{dep}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Section */}
      {result && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="card-title">Generated Code</h3>
                <div className="flex border rounded-md">
                  <button
                    onClick={() => setActiveTab('code')}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-l-md transition-colors",
                      activeTab === 'code'
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <FileText className="h-4 w-4 mr-2 inline" />
                    Code
                  </button>
                  {result.tests && (
                    <button
                      onClick={() => setActiveTab('tests')}
                      className={cn(
                        "px-3 py-1 text-sm font-medium border-x transition-colors",
                        activeTab === 'tests'
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <CheckSquare className="h-4 w-4 mr-2 inline" />
                      Tests
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('explanation')}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-r-md transition-colors",
                      activeTab === 'explanation'
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 inline" />
                    Explanation
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(getDisplayContent())}
                  className="btn-outline btn-sm"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownload(getDisplayContent(), activeTab === 'code' ? 'generated-code' :
                                              activeTab === 'tests' ? 'generated-tests' : 'explanation')}
                  className="btn-outline btn-sm"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="card-content p-0">
            <div className="relative">
              {activeTab === 'explanation' ? (
                <div className="p-4 whitespace-pre-wrap text-sm">
                  {getDisplayContent()}
                </div>
              ) : (
                <SyntaxHighlighter
                  language={getLanguageForHighlighter()}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    background: 'hsl(var(--muted))',
                  }}
                  wrapLongLines
                >
                  {getDisplayContent()}
                </SyntaxHighlighter>
              )}
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

export default CodeGeneration