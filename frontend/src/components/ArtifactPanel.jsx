import { useState } from 'react'
import { Copy, Code, Eye, FileText, Check, Download } from 'lucide-react'
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

const FORM_TYPE_LABELS = {
  'ds-160': 'DS-160',
  'i-129s': 'I-129S',
  'g-28': 'G-28',
  'l1b-letter': 'L-1B Letter',
  'case-report': 'Case Report',
}

function normalizeType(type) {
  if (!type) return 'text'
  if (type === 'application/json') return 'json'
  if (type === 'text/markdown') return 'markdown'
  return type
}

function TypeBadge({ type, formType }) {
  const colors = {
    json: { bg: 'rgba(59, 130, 246, 0.12)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.2)' },
    markdown: { bg: 'rgba(167, 139, 250, 0.12)', text: '#c4b5fd', border: 'rgba(167, 139, 250, 0.2)' },
    text: { bg: 'rgba(161, 161, 161, 0.12)', text: '#a1a1a1', border: 'rgba(161, 161, 161, 0.2)' },
    code: { bg: 'rgba(74, 222, 128, 0.12)', text: '#86efac', border: 'rgba(74, 222, 128, 0.2)' },
    form: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.2)' },
  }
  const normalized = normalizeType(type)
  const label = formType ? (FORM_TYPE_LABELS[formType] || formType) : normalized
  const c = colors[formType ? 'form' : normalized] || colors.text
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  )
}

export default function ArtifactPanel({ artifact }) {
  const [viewMode, setViewMode] = useState('formatted')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopy = async () => {
    if (!artifact) return
    const text = typeof artifact.content === 'string'
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportDocx = async () => {
    if (!artifact || exporting) return
    setExporting(true)
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: artifact.title,
          content: typeof artifact.content === 'string'
            ? artifact.content
            : JSON.stringify(artifact.content, null, 2),
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(artifact.title || 'artifact').replace(/\s+/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('DOCX export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const isFormArtifact = !!(artifact && artifact.formType)
  const artifactTypeNorm = artifact ? normalizeType(artifact.type) : null
  const isMarkdownArtifact = artifactTypeNorm === 'markdown'

  const renderFormatted = () => {
    if (!artifact) return null
    const { type, content } = artifact

    // Try JSON
    if (type === 'json' || type === 'application/json' || tryParseJson(content)) {
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
    if (type === 'markdown' || type === 'text/markdown') {
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
          {artifact && <TypeBadge type={artifact.type} formType={artifact.formType} />}
        </div>

        {artifact && (
          <div className="flex items-center gap-1">
            {/* DOCX export for markdown artifacts */}
            {isMarkdownArtifact && (
              <button
                onClick={handleExportDocx}
                disabled={exporting}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors disabled:opacity-40"
                style={{ color: 'var(--vg-text-tertiary)' }}
                title="Generate DOCX"
              >
                <Download size={10} /> {exporting ? 'Exporting...' : 'DOCX'}
              </button>
            )}

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

      {/* Form validation status bar */}
      {isFormArtifact && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-[10px] shrink-0"
          style={{
            background: 'rgba(74, 222, 128, 0.06)',
            borderBottom: '1px solid rgba(74, 222, 128, 0.15)',
            color: '#86efac',
          }}
        >
          <Check size={10} />
          <span>Form schema validated — {FORM_TYPE_LABELS[artifact.formType] || artifact.formType}</span>
        </div>
      )}

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
