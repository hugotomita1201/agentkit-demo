import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamChat } from '../lib/api'
import ToolTracePanel from '../components/ToolTracePanel'
import ArtifactPanel from '../components/ArtifactPanel'

export default function ChatDemoPage() {
  const [messages, setMessages] = useState([])
  const [events, setEvents] = useState([])
  const [artifact, setArtifact] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState(null)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(false)

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    }
  }, [inputValue])

  const handleEvent = useCallback((event) => {
    const timestamp = new Date().toISOString()

    switch (event.type) {
      case 'session':
        setSessionId(event.sessionId)
        break

      case 'text_delta':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + event.text }]
          }
          return [...prev, { role: 'assistant', content: event.text, timestamp, streaming: true }]
        })
        break

      case 'thinking_delta':
        setEvents(prev => {
          const last = prev[prev.length - 1]
          if (last && last.type === 'thinking_delta' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text: last.text + event.text }]
          }
          return [...prev, { type: 'thinking_delta', text: event.text, timestamp, streaming: true }]
        })
        break

      case 'tool_executing':
        setEvents(prev => [...prev, {
          type: 'tool_executing',
          tool: event.tool,
          input: event.input,
          timestamp,
        }])
        break

      case 'tool_result':
        setEvents(prev => [...prev, {
          type: 'tool_result',
          tool: event.tool,
          output: event.output,
          timestamp,
        }])
        break

      case 'subagent_start':
        setEvents(prev => [...prev, {
          type: 'subagent_start',
          subagentId: event.subagentId,
          task: event.task,
          timestamp,
        }])
        break

      case 'subagent_thinking':
        setEvents(prev => {
          const last = prev[prev.length - 1]
          if (last && last.type === 'subagent_thinking' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text: last.text + event.text }]
          }
          return [...prev, { type: 'subagent_thinking', text: event.text, timestamp, streaming: true }]
        })
        break

      case 'subagent_tool':
        setEvents(prev => [...prev, {
          type: 'subagent_tool',
          tool: event.tool,
          input: event.input,
          timestamp,
        }])
        break

      case 'subagent_complete':
        setEvents(prev => [...prev, {
          type: 'subagent_complete',
          subagentId: event.subagentId,
          result: event.result,
          timestamp,
        }])
        break

      case 'artifact':
        setArtifact({
          title: event.title || 'Artifact',
          type: event.contentType || 'text',
          content: event.content,
        })
        break

      case 'done':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last && last.streaming) {
            return [...prev.slice(0, -1), { ...last, streaming: false }]
          }
          return prev
        })
        // Mark all streaming events as done
        setEvents(prev => prev.map(e => ({ ...e, streaming: false })))
        break

      case 'error':
        setMessages(prev => [...prev, {
          role: 'error',
          content: event.message || 'An error occurred',
          timestamp,
        }])
        break

      default:
        break
    }
  }, [])

  const sendMessage = async () => {
    const text = inputValue.trim()
    if (!text || isStreaming) return

    setInputValue('')
    setIsStreaming(true)
    abortRef.current = false

    // Add user message
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    // Clear events for new turn
    setEvents([])

    try {
      await streamChat(text, sessionId, handleEvent)
    } catch (err) {
      if (!abortRef.current) {
        setMessages(prev => [...prev, {
          role: 'error',
          content: `Connection error: ${err.message}`,
          timestamp: new Date().toISOString(),
        }])
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-full" style={{ background: 'var(--vg-bg-primary)' }}>
      {/* Left pane - Chat */}
      <div
        className="flex flex-col border-r"
        style={{ width: '60%', borderColor: 'var(--vg-border-default)' }}
      >
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
              <MessageSquare size={36} style={{ color: 'var(--vg-text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--vg-text-tertiary)' }}>
                Send a message to start the conversation
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'rounded-br-sm' : msg.role === 'error' ? '' : 'rounded-bl-sm'
                }`}
                style={
                  msg.role === 'user'
                    ? { background: 'var(--vg-blue)', color: '#fff' }
                    : msg.role === 'error'
                    ? { background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }
                    : { background: 'var(--vg-bg-tertiary)', color: 'var(--vg-text-primary)' }
                }
              >
                {msg.role === 'assistant' ? (
                  <div className="prose-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    {msg.streaming && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-blink" style={{ background: 'var(--vg-text-secondary)' }} />
                    )}
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
                <div
                  className="text-[10px] mt-1 opacity-50"
                  style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="shrink-0 px-4 py-3 border-t"
          style={{ borderColor: 'var(--vg-border-default)', background: 'var(--vg-bg-secondary)' }}
        >
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2 transition-colors"
            style={{
              background: 'var(--vg-bg-tertiary)',
              border: '1px solid var(--vg-border-default)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-[color:var(--vg-text-tertiary)] disabled:opacity-50"
              style={{ color: 'var(--vg-text-primary)', maxHeight: '160px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isStreaming}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                background: inputValue.trim() && !isStreaming ? 'var(--vg-blue)' : 'transparent',
              }}
            >
              {isStreaming ? (
                <Square size={14} style={{ color: 'var(--vg-text-secondary)' }} />
              ) : (
                <Send size={14} className="text-white" />
              )}
            </button>
          </div>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--vg-text-tertiary)' }}>
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Right pane - Trace + Artifact */}
      <div className="flex flex-col" style={{ width: '40%' }}>
        {/* Top: Tool Trace */}
        <div className="flex-1 min-h-0 border-b" style={{ borderColor: 'var(--vg-border-default)' }}>
          <ToolTracePanel events={events} />
        </div>
        {/* Bottom: Artifact */}
        <div className="flex-1 min-h-0">
          <ArtifactPanel artifact={artifact} />
        </div>
      </div>
    </div>
  )
}
