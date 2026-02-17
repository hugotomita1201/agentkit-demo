import { Bot } from 'lucide-react'
import ChatDemoPage from './pages/ChatDemoPage'

export default function App() {
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--vg-bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--vg-border-default)', background: 'var(--vg-bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
          >
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: 'var(--vg-text-primary)' }}>
              AgentKit Demo
            </h1>
            <p className="text-xs" style={{ color: 'var(--vg-text-tertiary)' }}>
              Claude Agent SDK Showcase
            </p>
          </div>
        </div>

        <span
          className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-full uppercase"
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            color: 'var(--vg-orange)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          Demo
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0">
        <ChatDemoPage />
      </main>
    </div>
  )
}
