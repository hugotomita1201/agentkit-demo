# AgentKit Demo — Claude Agent SDK Showcase

### What This Is

A minimal, self-contained demo of Claude Agent SDK patterns:

- **Orchestrator/subagent delegation** — real multi-agent architecture
- **MCP-style tool execution loops** — tools invoke, return, re-prompt
- **Server-Sent Events streaming** with typed event contract
- **Artifact generation and display** — structured output rendered in a dedicated panel
- **Deterministic demo mode** — no API key required

### What's Omitted

> **Public demo edition.** The production system this is based on includes SharePoint/OneDrive integration, 40+ immigration form pipelines, email triage with human-in-the-loop, Teams bot, PostgreSQL persistence, and Microsoft OAuth — same architecture, private integrations.

---

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐│
│  │  Chat UI  │ │ Tool Trace   │ │  Artifact    ││
│  │          │ │ Panel        │ │  Panel       ││
│  └────┬─────┘ └──────────────┘ └──────────────┘│
│       │ POST /api/chat/stream (SSE)              │
└───────┼─────────────────────────────────────────┘
        │
┌───────┼─────────────────────────────────────────┐
│       ▼          Backend                         │
│  ┌─────────────────────────────┐                │
│  │     Chat Orchestrator       │                │
│  │   (Agent Loop + Tools)      │                │
│  └──────┬──────────┬───────────┘                │
│         │          │                             │
│  ┌──────▼──┐  ┌────▼────────┐                   │
│  │ Tool    │  │  Subagent   │                   │
│  │Registry │  │  Manager    │                   │
│  └─────────┘  └──────┬──────┘                   │
│                       │                          │
│                ┌──────▼──────┐                   │
│                │   Worker    │                   │
│                │  Subagent   │                   │
│                │ (own loop)  │                   │
│                └─────────────┘                   │
│                                                  │
│  ┌─────────────────────────────┐                │
│  │  LLM Adapter               │                │
│  │  mock (demo) / real (live)  │                │
│  └─────────────────────────────┘                │
└──────────────────────────────────────────────────┘
```

---

### Event Contract

| Event Type | Payload | Source |
|---|---|---|
| `thinking_delta` | `{ text }` | Orchestrator |
| `tool_executing` | `{ name, input }` | Orchestrator |
| `tool_result` | `{ name, result }` | Orchestrator |
| `subagent_start` | `{ name, task }` | Orchestrator |
| `subagent_thinking` | `{ name, text }` | Subagent |
| `subagent_tool` | `{ name, tool, input, result }` | Subagent |
| `subagent_complete` | `{ name, result }` | Subagent |
| `artifact_end` | `{ type, title, content }` | Orchestrator |
| `done` | `{}` | Orchestrator |
| `error` | `{ message }` | Orchestrator |

---

### Run Locally

```bash
cp .env.example .env   # DEMO_MODE=true by default

cd backend && npm install && npm start

# In another terminal:
cd frontend && npm install && npm run dev

# Open http://localhost:3001
```

---

### 2-Minute Demo Script

1. Open the app
2. Type: **"What are the key risks in the Q4 report and how should we address them?"**
3. Watch: orchestrator searches knowledge base, reads document, delegates risk analysis to subagent
4. See: subagent's own tool trace (nested, purple-highlighted)
5. Result: structured risk assessment artifact appears in the right panel

---

### Modes

| Mode | Env | API Key | Behavior |
|------|-----|---------|----------|
| Demo | `DEMO_MODE=true` | Not needed | Fixture responses, deterministic |
| Live | `DEMO_MODE=false` | Required | Real Claude API calls |

---

### Built With

- [Claude Code](https://claude.ai/code) — AI-powered development
- [Claude Agent SDK](https://docs.anthropic.com) — Agent orchestration
- Express.js + React + Vite + Tailwind CSS

---

*Built with [Claude Code](https://claude.ai/code)*
