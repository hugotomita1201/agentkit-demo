import { useEffect, useRef } from 'react'
import { Brain, Wrench, Check, Users, ChevronRight, Activity } from 'lucide-react'

const SUBAGENT_EVENTS = new Set(['subagent_start', 'subagent_thinking', 'subagent_tool', 'subagent_complete'])

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function truncate(str, max = 120) {
  if (!str) return ''
  const s = typeof str === 'string' ? str : JSON.stringify(str)
  return s.length > max ? s.slice(0, max) + '...' : s
}

function EventIcon({ type }) {
  const props = { size: 13, className: 'shrink-0 mt-0.5' }
  switch (type) {
    case 'thinking_delta':
    case 'subagent_thinking':
      return <Brain {...props} style={{ color: type === 'subagent_thinking' ? '#a78bfa' : 'var(--vg-text-tertiary)' }} />
    case 'tool_executing':
    case 'subagent_tool':
      return <Wrench {...props} style={{ color: 'var(--vg-orange)' }} />
    case 'tool_result':
    case 'subagent_complete':
      return <Check {...props} style={{ color: '#4ade80' }} />
    case 'subagent_start':
      return <Users {...props} style={{ color: '#a78bfa' }} />
    default:
      return <ChevronRight {...props} style={{ color: 'var(--vg-text-tertiary)' }} />
  }
}

function EventEntry({ event }) {
  const isSubagent = SUBAGENT_EVENTS.has(event.type)

  const renderContent = () => {
    switch (event.type) {
      case 'thinking_delta':
        return (
          <span className="italic" style={{ color: 'var(--vg-text-secondary)' }}>
            {truncate(event.content, 200)}
            {event.streaming && <span className="animate-blink ml-0.5">|</span>}
          </span>
        )

      case 'tool_executing':
        return (
          <span>
            <span className="font-medium" style={{ color: 'var(--vg-orange)' }}>{event.toolName}</span>
            {event.input && (
              <span className="ml-1.5" style={{ color: 'var(--vg-text-tertiary)' }}>
                {truncate(event.input, 80)}
              </span>
            )}
          </span>
        )

      case 'tool_result':
        return (
          <span>
            <span style={{ color: '#4ade80' }}>{event.toolName || 'result'}</span>
            {event.output && (
              <span className="ml-1.5" style={{ color: 'var(--vg-text-secondary)' }}>
                {truncate(event.output, 100)}
              </span>
            )}
          </span>
        )

      case 'subagent_start':
        return (
          <span style={{ color: '#c4b5fd' }}>
            Delegating to <span className="font-medium">{event.agentName || 'subagent'}</span>
            {event.task && <span className="ml-1" style={{ color: '#a78bfa' }}>: {truncate(event.task, 80)}</span>}
          </span>
        )

      case 'subagent_thinking':
        return (
          <span className="italic" style={{ color: '#a78bfa' }}>
            {truncate(event.content, 200)}
            {event.streaming && <span className="animate-blink ml-0.5">|</span>}
          </span>
        )

      case 'subagent_tool':
        return (
          <span>
            <span className="font-medium" style={{ color: '#c4b5fd' }}>{event.toolName}</span>
            {event.input && (
              <span className="ml-1.5" style={{ color: 'var(--vg-text-tertiary)' }}>
                {truncate(event.input, 80)}
              </span>
            )}
          </span>
        )

      case 'subagent_complete':
        return (
          <span>
            <span style={{ color: '#4ade80' }}>{event.agentName || 'Subagent'} complete</span>
            {event.result && (
              <span className="ml-1.5" style={{ color: 'var(--vg-text-secondary)' }}>
                {truncate(event.result, 100)}
              </span>
            )}
          </span>
        )

      default:
        return <span style={{ color: 'var(--vg-text-secondary)' }}>{JSON.stringify(event)}</span>
    }
  }

  return (
    <div
      className={`flex gap-2 text-xs leading-relaxed animate-slide-in-right ${isSubagent ? 'ml-4 pl-3' : ''}`}
      style={isSubagent ? { borderLeft: '2px solid rgba(167, 139, 250, 0.3)' } : undefined}
    >
      <span className="shrink-0 font-mono" style={{ color: 'var(--vg-text-tertiary)', fontSize: '10px', minWidth: '60px' }}>
        {formatTime(event.timestamp)}
      </span>
      <EventIcon type={event.type} />
      <div className="min-w-0 break-words">{renderContent()}</div>
    </div>
  )
}

export default function ToolTracePanel({ events }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [events])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--vg-border-default)', background: 'var(--vg-bg-secondary)' }}
      >
        <Activity size={13} style={{ color: 'var(--vg-text-tertiary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--vg-text-secondary)' }}>
          Agent Trace
        </span>
        {events.length > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            style={{ background: 'var(--vg-bg-tertiary)', color: 'var(--vg-text-tertiary)' }}
          >
            {events.length}
          </span>
        )}
        {events.some(e => e.streaming) && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px]" style={{ color: '#4ade80' }}>live</span>
          </span>
        )}
      </div>

      {/* Events */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-2 space-y-2">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
            <Activity size={24} style={{ color: 'var(--vg-text-tertiary)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--vg-text-tertiary)' }}>
              Events will appear here as the agent<br />processes your request
            </p>
          </div>
        ) : (
          events.map((event, i) => <EventEntry key={i} event={event} />)
        )}
      </div>
    </div>
  )
}
