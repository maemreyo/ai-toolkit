import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  MessageSquare,
  Trash2,
  Copy,
  Download,
  Bot,
  User,
  RefreshCw,
  Settings,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAIChat } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatDuration } from '../lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

const systemPrompts = [
  {
    name: "Default Assistant",
    prompt: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses."
  },
  {
    name: "Code Expert",
    prompt: "You are an expert programmer. Help with coding questions, debug issues, and explain programming concepts clearly."
  },
  {
    name: "Creative Writer",
    prompt: "You are a creative writing assistant. Help with storytelling, poetry, and creative content creation."
  },
  {
    name: "Research Assistant",
    prompt: "You are a research assistant. Provide well-researched, factual information and help analyze data and findings."
  },
  {
    name: "Friendly Tutor",
    prompt: "You are a patient and encouraging tutor. Explain complex topics in simple terms and provide helpful examples."
  }
]

const ChatDemo: React.FC = () => {
  const [input, setInput] = useState('')
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState(systemPrompts[0])
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, clearMessages, loading, error } = useAIChat(
    selectedSystemPrompt.prompt
  )

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const messageToSend = input
    setInput('')

    try {
      await sendMessage(messageToSend)
    } catch (err) {
      toast.error('Failed to send message')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    clearMessages()
    toast.success('Chat cleared')
  }

  const handleCopyMessage = async (content: string) => {
    try {
      await copyToClipboard(content)
      toast.success('Message copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy message')
    }
  }

  const handleDownloadChat = () => {
    if (messages.length === 0) {
      toast.error('No messages to download')
      return
    }

    const chatContent = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}\n\n`)
      .join('')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadFile(chatContent, `chat-conversation-${timestamp}.txt`)
    toast.success('Chat downloaded!')
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="space-y-6 h-full max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Chat</h1>
            <p className="text-muted-foreground">Interactive conversation with AI assistants</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          <button
            onClick={handleDownloadChat}
            disabled={messages.length === 0}
            className="btn-outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 h-full">
        {/* Chat Interface */}
        <div className="lg:col-span-3 flex flex-col h-[600px]">
          <div className="card flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="card-header border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="card-title">Conversation</h3>
                  <p className="card-description">
                    {selectedSystemPrompt.name} • {messages.length} messages
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {loading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                    <p className="text-muted-foreground mb-4">
                      Send a message to begin chatting with the AI assistant
                    </p>
                    <div className="grid gap-2 max-w-md">
                      {['Tell me about quantum computing', 'Write a haiku about coding', 'Explain machine learning'].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(suggestion)}
                          className="text-left p-2 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 group",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2 relative",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs opacity-70">
                        {formatTimestamp(message.timestamp)}
                      </div>
                      <button
                        onClick={() => handleCopyMessage(message.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/20"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message... (Shift+Enter for new line)"
                    className="textarea min-h-[60px] max-h-[120px] resize-none pr-12"
                    disabled={loading}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {input.length}
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="btn-primary self-end"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-4">
          {showSettings && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Assistant Type</h3>
                  <p className="card-description">Choose the AI assistant personality</p>
                </div>
                <div className="card-content space-y-2">
                  {systemPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSystemPrompt(prompt)}
                      className={cn(
                        "w-full text-left p-3 rounded-md border transition-colors",
                        selectedSystemPrompt.name === prompt.name
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="font-medium text-sm">{prompt.name}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {prompt.prompt.substring(0, 60)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Custom System Prompt</h3>
                </div>
                <div className="card-content">
                  <textarea
                    value={selectedSystemPrompt.prompt}
                    onChange={(e) => setSelectedSystemPrompt({
                      ...selectedSystemPrompt,
                      prompt: e.target.value
                    })}
                    className="textarea min-h-[100px]"
                    placeholder="Enter custom system prompt..."
                  />
                </div>
              </div>
            </>
          )}

          {/* Chat Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Chat Statistics</h3>
            </div>
            <div className="card-content space-y-2">
              <div className="flex justify-between text-sm">
                <span>Messages</span>
                <span className="font-medium">{messages.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>User Messages</span>
                <span className="font-medium">
                  {messages.filter(m => m.role === 'user').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>AI Responses</span>
                <span className="font-medium">
                  {messages.filter(m => m.role === 'assistant').length}
                </span>
              </div>
              {messages.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Started</span>
                  <span className="font-medium">
                    {formatTimestamp(messages[0]?.timestamp)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-content space-y-2">
              <button
                onClick={() => setInput("Explain this code to me:")}
                className="w-full btn-outline btn-sm justify-start"
              >
                <Zap className="h-4 w-4 mr-2" />
                Ask about code
              </button>
              <button
                onClick={() => setInput("Can you help me write a story about")}
                className="w-full btn-outline btn-sm justify-start"
              >
                <Zap className="h-4 w-4 mr-2" />
                Creative writing
              </button>
              <button
                onClick={() => setInput("I need help understanding")}
                className="w-full btn-outline btn-sm justify-start"
              >
                <Zap className="h-4 w-4 mr-2" />
                Learning assistance
              </button>
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

export default ChatDemo