import React, { useState, useRef, useEffect } from 'react'
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Download,
  Copy,
  RefreshCw,
  Settings,
  Zap,
  Volume2,
  FileAudio,
  Clock,
  Languages,
  Type
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatDuration } from '../lib/utils'

interface TranscriptionSettings {
  model: string
  language: string
  format: 'json' | 'text' | 'srt' | 'vtt'
  includeTimestamps: boolean
  includeSpeakerLabels: boolean
  enhanceAudio: boolean
  filterProfanity: boolean
}

interface TranscriptionResult {
  id: string
  text: string
  language: string
  duration: number
  confidence: number
  segments?: Array<{
    start: number
    end: number
    text: string
    confidence: number
  }>
  audioUrl?: string
  timestamp: Date
}

const models = [
  { id: 'whisper-1', name: 'Whisper v1', provider: 'OpenAI' },
  { id: 'whisper-large', name: 'Whisper Large', provider: 'OpenAI' },
  { id: 'deepgram', name: 'Deepgram Nova', provider: 'Deepgram' },
  { id: 'assemblyai', name: 'AssemblyAI', provider: 'AssemblyAI' },
  { id: 'mock-model', name: 'Mock Model', provider: 'Demo' }
]

const languages = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' }
]

const AudioTranscription: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([])
  const [selectedTranscription, setSelectedTranscription] = useState<TranscriptionResult | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [settings, setSettings] = useState<TranscriptionSettings>({
    model: 'mock-model',
    language: 'auto',
    format: 'json',
    includeTimestamps: true,
    includeSpeakerLabels: false,
    enhanceAudio: true,
    filterProfanity: false
  })

  const { transcribeAudio, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Transcription failed: ${err.message}`)
      setIsTranscribing(false)
    }
  })

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      toast.success('Recording started')
    } catch (error) {
      toast.error('Failed to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }

      toast.success('Recording stopped')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file')
      return
    }

    setAudioBlob(file)
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    toast.success('Audio file loaded')
  }

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const handleTranscribe = async () => {
    if (!audioBlob) {
      toast.error('No audio to transcribe')
      return
    }

    setIsTranscribing(true)

    try {
      // For demo purposes, we'll create a mock transcription
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockTranscription: TranscriptionResult = {
        id: `trans_${Date.now()}`,
        text: "This is a mock transcription of your audio. In a real implementation, this would be the actual transcribed text from your audio file using the selected AI model and settings.",
        language: settings.language === 'auto' ? 'en' : settings.language,
        duration: recordingDuration || 10,
        confidence: 0.95,
        segments: settings.includeTimestamps ? [
          { start: 0, end: 3, text: "This is a mock transcription", confidence: 0.98 },
          { start: 3, end: 6, text: "of your audio.", confidence: 0.92 },
          { start: 6, end: 10, text: "In a real implementation, this would be actual text.", confidence: 0.95 }
        ] : undefined,
        audioUrl,
        timestamp: new Date()
      }

      setTranscriptions(prev => [mockTranscription, ...prev])
      setSelectedTranscription(mockTranscription)
      toast.success('Transcription completed!')
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text)
      toast.success('Transcription copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy transcription')
    }
  }

  const handleDownload = (transcription: TranscriptionResult) => {
    let content = ''
    let filename = ''

    switch (settings.format) {
      case 'text':
        content = transcription.text
        filename = `transcription-${transcription.id}.txt`
        break
      case 'json':
        content = JSON.stringify(transcription, null, 2)
        filename = `transcription-${transcription.id}.json`
        break
      case 'srt':
        content = generateSRT(transcription)
        filename = `transcription-${transcription.id}.srt`
        break
      case 'vtt':
        content = generateVTT(transcription)
        filename = `transcription-${transcription.id}.vtt`
        break
    }

    downloadFile(content, filename)
    toast.success('Transcription downloaded!')
  }

  const generateSRT = (transcription: TranscriptionResult): string => {
    if (!transcription.segments) return transcription.text

    return transcription.segments.map((segment, index) => {
      const start = formatTime(segment.start)
      const end = formatTime(segment.end)
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`
    }).join('\n')
  }

  const generateVTT = (transcription: TranscriptionResult): string => {
    if (!transcription.segments) return `WEBVTT\n\n${transcription.text}`

    const segments = transcription.segments.map(segment => {
      const start = formatTime(segment.start)
      const end = formatTime(segment.end)
      return `${start} --> ${end}\n${segment.text}`
    }).join('\n\n')

    return `WEBVTT\n\n${segments}`
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  const handleSettingChange = (key: keyof TranscriptionSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mic className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audio Transcription</h1>
            <p className="text-muted-foreground">Convert speech to text using AI</p>
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
        {/* Recording/Upload Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Audio Input</h3>
              <p className="card-description">Record audio or upload an audio file</p>
            </div>
            <div className="card-content space-y-4">
              {/* Recording Controls */}
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing}
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                        isRecording
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      )}
                    >
                      {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>

                    <div className="text-center">
                      <div className="text-2xl font-mono">
                        {formatDuration(recordingDuration * 1000)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isRecording ? 'Recording...' : 'Ready to record'}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {isRecording ? 'Click to stop recording' : 'Click to start recording'}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Or upload an audio file:</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isTranscribing}
                      className="btn-outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Audio File
                    </button>
                  </div>
                </div>
              </div>

              {/* Audio Player */}
              {audioUrl && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Audio Preview</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={playAudio}
                        className="btn-outline btn-sm"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={handleTranscribe}
                        disabled={isTranscribing}
                        className="btn-primary"
                      >
                        {isTranscribing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <Type className="h-4 w-4 mr-2" />
                            Transcribe
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    className="w-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Transcriptions History */}
          {transcriptions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Transcription History</h3>
                <p className="card-description">{transcriptions.length} transcriptions</p>
              </div>
              <div className="card-content space-y-3">
                {transcriptions.map((transcription) => (
                  <div
                    key={transcription.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-colors",
                      selectedTranscription?.id === transcription.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedTranscription(transcription)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {transcription.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(transcription.text)
                          }}
                          className="btn-ghost btn-sm"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(transcription)
                          }}
                          className="btn-ghost btn-sm"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm line-clamp-2">{transcription.text}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Language: {transcription.language}</span>
                      <span>Duration: {formatDuration(transcription.duration * 1000)}</span>
                      <span>Confidence: {(transcription.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings & Details Panel */}
        <div className="space-y-4">
          {showSettings && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Transcription Settings</h3>
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
                  <label className="text-sm font-medium">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="input"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Format</label>
                  <select
                    value={settings.format}
                    onChange={(e) => handleSettingChange('format', e.target.value)}
                    className="input"
                  >
                    <option value="text">Plain Text</option>
                    <option value="json">JSON</option>
                    <option value="srt">SRT (Subtitles)</option>
                    <option value="vtt">VTT (WebVTT)</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Include Timestamps</label>
                    <button
                      onClick={() => handleSettingChange('includeTimestamps', !settings.includeTimestamps)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.includeTimestamps ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.includeTimestamps ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Speaker Labels</label>
                    <button
                      onClick={() => handleSettingChange('includeSpeakerLabels', !settings.includeSpeakerLabels)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.includeSpeakerLabels ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.includeSpeakerLabels ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Enhance Audio</label>
                    <button
                      onClick={() => handleSettingChange('enhanceAudio', !settings.enhanceAudio)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.enhanceAudio ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.enhanceAudio ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected Transcription Details */}
          {selectedTranscription && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Transcription Details</h3>
              </div>
              <div className="card-content space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Full Text</h4>
                  <div className="bg-muted/50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                    {selectedTranscription.text}
                  </div>
                </div>

                {selectedTranscription.segments && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Timestamps</h4>
                    <div className="bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto">
                      {selectedTranscription.segments.map((segment, index) => (
                        <div key={index} className="text-xs mb-2">
                          <span className="text-muted-foreground">
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </span>
                          <div>{segment.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Language:</span>
                    <div className="font-medium">{selectedTranscription.language}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <div className="font-medium">{(selectedTranscription.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium">{formatDuration(selectedTranscription.duration * 1000)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="font-medium">{selectedTranscription.timestamp.toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
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

export default AudioTranscription