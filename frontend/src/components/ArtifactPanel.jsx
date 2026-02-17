import { useState } from 'react'
import { Copy, Code, Eye, FileText, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function syntaxHighlightJson(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2)
  }
  // Escape HTML then apply syntax classes
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string'
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      return `<span class="${cls}">${match}</span>`
    }
  )
}

function tryParseJson(content) {
  if (typeof content === 'object') return content
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function TypeBadge({ type }) {
  const colors = {
    json: { bg: 'rgba(59, 130, 246, 0.12)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.2)' },
    markdown: { bg: 'rgba(167, 139, 250, 0.12)', text: '#c4b5fd', border: 'rgba(167, 139, 250, 0.2)' },
    text: { bg: 'rgba(161, 161, 161, 0.12)', text: '#a1a1a1', border: 'rgba(161, 161, 161, 0.2)' },
    code: { bg: 'rgba(74, 222, 128, 0.12)', text: '#86efac', border: 'rgba(74, 222, 128, 0.2)' },
  }
  const c = colors[type] || colors.text
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {type}
    </span>
  )
}

export default function ArtifactPanel({ artifact }) {
  const [viewMode, setViewMode] = useState('formatted')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!artifact) return
    const text = typeof artifact.content === 'string'
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderFormatted = () => {
    if (!artifact) return null
    const { type, content } = artifact

    // Try JSON
    if (type === 'json' || tryParseJson(content)) {
      const parsed = tryParseJson(content) || content
      const highlighted = syntaxHighlightJson(parsed)
      return (
        <pre
          className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      )
    }

    // Markdown
    if (type === 'markdown') {
      return (
        <div className="prose-chat text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )
    }

    // Plain text / code
    return (
      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--vg-text-primary)' }}>
        {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
      </pre>
    )
  }

  const renderRaw = () => {
    if (!artifact) return null
    const raw = typeof artifact.content === 'string'
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2)
    return (
      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--vg-text-secondary)' }}>
        {raw}
      </pre>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--vg-border-default)', background: 'var(--vg-bg-secondary)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={13} style={{ color: 'var(--vg-text-tertiary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--vg-text-secondary)' }}>
            {artifact ? artifact.title : 'Artifacts'}
          </span>
          {artifact && <TypeBadge type={artifact.type} />}
        </div>

        {artifact && (
          <div className="flex items-center gap-1">
            {/* View mode toggle */}
            <div
              className="flex rounded-md overflow-hidden text-[10px]"
              style={{ border: '1px solid var(--vg-border-default)' }}
            >
              <button
                onClick={() => setViewMode('formatted')}
                className="flex items-center gap-1 px-2 py-1 transition-colors"
                style={{
                  background: viewMode === 'formatted' ? 'var(--vg-bg-tertiary)' : 'transparent',
                  color: viewMode === 'formatted' ? 'var(--vg-text-primary)' : 'var(--vg-text-tertiary)',
                }}
              >
                <Eye size={10} /> Formatted
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className="flex items-center gap-1 px-2 py-1 transition-colors"
                style={{
                  background: viewMode === 'raw' ? 'var(--vg-bg-tertiary)' : 'transparent',
                  color: viewMode === 'raw' ? 'var(--vg-text-primary)' : 'var(--vg-text-tertiary)',
                  borderLeft: '1px solid var(--vg-border-default)',
                }}
              >
                <Code size={10} /> Raw
              </button>
            </div>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: copied ? '#4ade80' : 'var(--vg-text-tertiary)' }}
              title="Copy to clipboard"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-3">
        {artifact ? (
          viewMode === 'formatted' ? renderFormatted() : renderRaw()
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
            <FileText size={24} style={{ color: 'var(--vg-text-tertiary)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--vg-text-tertiary)' }}>
              Artifacts generated by the agent<br />will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
