import React, { useState, useRef } from 'react'
import {
  Volume2,
  Play,
  Pause,
  Square,
  Download,
  Copy,
  RefreshCw,
  Settings,
  Zap,
  FileText,
  Clock,
  Sliders,
  VolumeX,
  SkipBack,
  SkipForward
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatDuration } from '../lib/utils'

interface SpeechSettings {
  model: string
  voice: string
  speed: number
  pitch: number
  volume: number
  format: 'mp3' | 'wav' | 'ogg'
  quality: 'low' | 'standard' | 'high'
  ssml: boolean
}

interface GeneratedSpeech {
  id: string
  text: string
  audioUrl: string
  voice: string
  duration: number
  settings: SpeechSettings
  timestamp: Date
}

const models = [
  { id: 'tts-1', name: 'TTS v1', provider: 'OpenAI' },
  { id: 'tts-1-hd', name: 'TTS v1 HD', provider: 'OpenAI' },
  { id: 'eleven-labs', name: 'ElevenLabs', provider: 'ElevenLabs' },
  { id: 'azure-tts', name: 'Azure TTS', provider: 'Microsoft' },
  { id: 'google-tts', name: 'Google TTS', provider: 'Google' },
  { id: 'mock-model', name: 'Mock Model', provider: 'Demo' }
]

const voices = {
  'tts-1': [
    { id: 'alloy', name: 'Alloy', gender: 'neutral' },
    { id: 'echo', name: 'Echo', gender: 'male' },
    { id: 'fable', name: 'Fable', gender: 'male' },
    { id: 'onyx', name: 'Onyx', gender: 'male' },
    { id: 'nova', name: 'Nova', gender: 'female' },
    { id: 'shimmer', name: 'Shimmer', gender: 'female' }
  ],
  'eleven-labs': [
    { id: 'adam', name: 'Adam', gender: 'male' },
    { id: 'bella', name: 'Bella', gender: 'female' },
    { id: 'charlie', name: 'Charlie', gender: 'male' },
    { id: 'dorothy', name: 'Dorothy', gender: 'female' }
  ],
  'azure-tts': [
    { id: 'jenny', name: 'Jenny (EN-US)', gender: 'female' },
    { id: 'guy', name: 'Guy (EN-US)', gender: 'male' },
    { id: 'aria', name: 'Aria (EN-US)', gender: 'female' }
  ]
}

const sampleTexts = [
  "Hello! This is a test of the text-to-speech functionality. The quality and naturalness of AI-generated speech has improved dramatically in recent years.",
  "Welcome to our AI playground. Here you can experiment with different voices, speeds, and settings to create natural-sounding speech from any text.",
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for testing purposes.",
  "Artificial intelligence is transforming how we interact with technology. Voice synthesis is just one of many exciting applications.",
  "Good morning! I hope you're having a wonderful day. This text demonstrates how expressive and natural AI-generated speech can sound.",
  "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat.",
  "Space: the final frontier. These are the voyages of the starship Enterprise. Its continuing mission: to explore strange new worlds, to seek out new life and new civilizations.",
  "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles."
]

const SpeechGeneration: React.FC = () => {
  const [text, setText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speeches, setSpeeches] = useState<GeneratedSpeech[]>([])
  const [selectedSpeech, setSelectedSpeech] = useState<GeneratedSpeech | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [settings, setSettings] = useState<SpeechSettings>({
    model: 'mock-model',
    voice: 'alloy',
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
    format: 'mp3',
    quality: 'standard',
    ssml: false
  })

  const { generateSpeech, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Speech generation failed: ${err.message}`)
      setIsGenerating(false)
    }
  })

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to convert to speech')
      return
    }

    setIsGenerating(true)

    try {
      // For demo purposes, we'll create a mock audio
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create a mock audio blob with a simple tone
      const audioContext = new AudioContext()
      const sampleRate = audioContext.sampleRate
      const textLength = text.length
      const estimatedDuration = Math.max(2, textLength * 0.1) // Estimate based on text length
      const length = sampleRate * estimatedDuration
      const buffer = audioContext.createBuffer(1, length, sampleRate)
      const data = buffer.getChannelData(0)

      // Generate a simple tone sequence to simulate speech
      for (let i = 0; i < length; i++) {
        const freq = 200 + Math.sin(i / 1000) * 100 // Varying frequency
        data[i] = Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.1
      }

      // Convert to blob
      const audioBlob = await bufferToWav(buffer)
      const audioUrl = URL.createObjectURL(audioBlob)

      const speech: GeneratedSpeech = {
        id: `speech_${Date.now()}`,
        text,
        audioUrl,
        voice: settings.voice,
        duration: estimatedDuration,
        settings: { ...settings },
        timestamp: new Date()
      }

      setSpeeches(prev => [speech, ...prev])
      setSelectedSpeech(speech)
      toast.success('Speech generated successfully!')
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsGenerating(false)
    }
  }

  // Helper function to convert AudioBuffer to WAV blob
  const bufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
    const length = buffer.length
    const result = new Float32Array(length)
    buffer.copyFromChannel(result, 0)

    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, buffer.sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)

    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, result[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  const handlePlay = (speech?: GeneratedSpeech) => {
    const target = speech || selectedSpeech
    if (!target) return

    if (audioRef.current) {
      if (audioRef.current.src !== target.audioUrl) {
        audioRef.current.src = target.audioUrl
      }

      if (isPlaying && selectedSpeech?.id === target.id) {
        audioRef.current.pause()
      } else {
        setSelectedSpeech(target)
        audioRef.current.play()
      }
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const handleDownload = async (speech: GeneratedSpeech) => {
    try {
      const response = await fetch(speech.audioUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `speech-${speech.id}.${settings.format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Speech audio downloaded!')
    } catch (err) {
      toast.error('Failed to download audio')
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text)
      toast.success('Text copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy text')
    }
  }

  const handleSettingChange = (key: keyof SpeechSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleTextSelect = (selectedText: string) => {
    setText(selectedText)
  }

  const currentVoices = voices[settings.model as keyof typeof voices] || voices['tts-1']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Volume2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Speech Generation</h1>
            <p className="text-muted-foreground">Convert text to natural-sounding speech using AI</p>
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Text Input</h3>
              <p className="card-description">Enter the text you want to convert to speech</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your text here..."
                className="textarea min-h-[150px] resize-none"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className="btn-primary"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Generate Speech
                    </>
                  )}
                </button>

                <div className="text-sm text-muted-foreground">
                  {text.length} characters • Est. {Math.max(2, Math.ceil(text.length * 0.1))}s
                </div>
              </div>
            </div>
          </div>

          {/* Sample Texts */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Sample Texts</h3>
              <p className="card-description">Click to use these example texts</p>
            </div>
            <div className="card-content">
              <div className="grid gap-2">
                {sampleTexts.map((sampleText, index) => (
                  <button
                    key={index}
                    onClick={() => handleTextSelect(sampleText)}
                    disabled={isGenerating}
                    className="text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm line-clamp-2">{sampleText}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Player */}
          {selectedSpeech && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Audio Player</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(selectedSpeech.text)}
                      className="btn-outline btn-sm"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(selectedSpeech)}
                      className="btn-outline btn-sm"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-content space-y-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm">{selectedSpeech.text}</p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                    className="btn-outline btn-sm"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handlePlay()}
                    className="btn-primary"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={handleStop}
                    className="btn-outline btn-sm"
                  >
                    <Square className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                    className="btn-outline btn-sm"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(currentTime * 1000)}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2 relative">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={(e) => handleSeek(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(duration * 1000)}
                    </span>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Speech History */}
          {speeches.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Generated Speeches</h3>
                <p className="card-description">{speeches.length} speeches generated</p>
              </div>
              <div className="card-content space-y-2">
                {speeches.map((speech) => (
                  <div
                    key={speech.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg transition-colors",
                      selectedSpeech?.id === speech.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{speech.voice}</span>
                        <span className="text-xs text-muted-foreground">
                          {speech.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {speech.text}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePlay(speech)}
                        className="btn-ghost btn-sm"
                      >
                        {isPlaying && selectedSpeech?.id === speech.id ?
                          <Pause className="h-4 w-4" /> :
                          <Play className="h-4 w-4" />
                        }
                      </button>
                      <button
                        onClick={() => handleDownload(speech)}
                        className="btn-ghost btn-sm"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          {showSettings && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Voice Settings</h3>
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
                  <label className="text-sm font-medium">Voice</label>
                  <select
                    value={settings.voice}
                    onChange={(e) => handleSettingChange('voice', e.target.value)}
                    className="input"
                  >
                    {currentVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.gender})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Speed: {settings.speed}x</label>
                  <input
                    type="range"
                    value={settings.speed}
                    onChange={(e) => handleSettingChange('speed', parseFloat(e.target.value))}
                    className="w-full"
                    min="0.25"
                    max="4.0"
                    step="0.25"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pitch: {settings.pitch}x</label>
                  <input
                    type="range"
                    value={settings.pitch}
                    onChange={(e) => handleSettingChange('pitch', parseFloat(e.target.value))}
                    className="w-full"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quality</label>
                  <select
                    value={settings.quality}
                    onChange={(e) => handleSettingChange('quality', e.target.value)}
                    className="input"
                  >
                    <option value="low">Low (Fast)</option>
                    <option value="standard">Standard</option>
                    <option value="high">High (Slow)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Format</label>
                  <select
                    value={settings.format}
                    onChange={(e) => handleSettingChange('format', e.target.value)}
                    className="input"
                  >
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="ogg">OGG</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">SSML Support</label>
                  <button
                    onClick={() => handleSettingChange('ssml', !settings.ssml)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.ssml ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.ssml ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Voice Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Current Settings</h3>
            </div>
            <div className="card-content space-y-2">
              <div className="flex justify-between text-sm">
                <span>Model</span>
                <span className="font-medium">
                  {models.find(m => m.id === settings.model)?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Voice</span>
                <span className="font-medium">
                  {currentVoices.find(v => v.id === settings.voice)?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Speed</span>
                <span className="font-medium">{settings.speed}x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Format</span>
                <span className="font-medium">{settings.format.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quality</span>
                <span className="font-medium capitalize">{settings.quality}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default SpeechGeneration