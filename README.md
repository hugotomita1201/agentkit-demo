# TomitaLaw AI — Claude Agent SDK Demo

**How an immigration law practice captured paralegal expertise into Claude skills to automate form generation, letter drafting, and case management.**

---

## The Story

TomitaLaw AI handles hundreds of immigration cases each year. Every case requires paralegals to fill out 200+ field government forms and draft 2,000-word support letters — work that demands deep knowledge of formatting rules, field mappings, and legal standards that took months of hands-on experience to learn.

We captured that expertise into **Claude skills** — structured instruction files that encode every formatting rule, every field constraint, every legal standard our paralegals refined over years. The Agent SDK loads these skills at runtime, giving Claude the same domain knowledge a senior paralegal has.

**This is not generic AI.** It is paralegal domain expertise, distilled into skills that the agent executes with precision.

---

## Productivity Impact

| Task | Before (Manual) | After (TomitaLaw AI) | Time Saved |
|------|-----------------|----------------------|------------|
| **L-1B Support Letter** | Paralegal reads 5-10 source docs, cross-references dates, drafts 2,000-word letter following strict formatting rules. **3-4 hours** | Agent reads docs via tool calls, loads 838-line skill template, generates letter in one pass. Paralegal reviews. **15-20 min** | **~90%** |
| **DS-160 Form (200+ fields)** | Manual data entry into government portal: checkboxes, character-spaced fields, phone formatting, country-specific address rules, conditional sections. **1-2 hours** | Agent loads 1,665-line schema skill, extracts data from case files, produces complete validated JSON. **Minutes** | **~95%** |
| **DOCX Export** | Copy letter from system, reformat in Word (Cambria 11pt, 1" margins, bold headers, bullet spacing). **20-30 min** | One-click export — backend converts markdown artifact to properly formatted DOCX instantly. **Seconds** | **~99%** |
| **Case Preparation Report** | Review all case documents, cross-verify dates and names, check for missing items, write summary with filing status. **1-2 hours** | Agent delegates to subagent for parallel document verification, generates structured checklist with gap analysis. **5-10 min** | **~90%** |
| **New Paralegal Onboarding** | Learn the firm's letter formatting standards, form field rules, filing procedures, consular officer expectations. **Weeks to months** | Skills encode all institutional knowledge — new staff produce firm-quality output from day one. **Day 1** | **Transformative** |

The productivity gain is not just "AI writes faster." The skill encodes **institutional knowledge** — how the firm formats letters, what consular officers look for, word count limits per section, how to structure specialized knowledge arguments — knowledge that would otherwise take a new paralegal months to learn on the job.

**The skills don't just speed things up — they democratize expertise.** A junior paralegal using TomitaLaw AI produces the same quality output as a senior paralegal with years of experience, because the skill encodes the senior paralegal's knowledge. The skill IS the training manual, and Claude follows it precisely.

---

## The Agentic Advantage

### Form Generation — DS-160

The DS-160 nonimmigrant visa application has over 200 fields with interdependent rules, conditional logic, and strict formatting requirements. Our **1,665-line schema** encodes every field rule, every checkbox value, every formatting constraint that paralegals spent months learning:

- Address format rules per country
- Employment history field dependencies
- Travel history conditional sections
- Checkbox values that the government portal expects verbatim

The agent reads the schema, reads the case data, and produces a complete, validated form — in seconds.

### Letter Drafting — L-1B Specialized Knowledge

An L-1B support letter must persuade USCIS that the beneficiary has specialized knowledge. Our **838-line template** encodes the exact structure, word count targets, duty format, and argumentation framework:

- 2,000-word target with section-level word counts
- Duty descriptions in the "performed X by doing Y using Z" format
- Specialized knowledge criteria mapped to evidence
- Company-specific formatting standards

The agent doesn't guess at the structure. It follows the template — the same way a trained paralegal would.

### The Skills ARE the Competitive Advantage

| Skill File | Lines | What It Encodes |
|---|---|---|
| `ds160-new-schema.txt` | 1,665 | Every DS-160 field rule, format, checkbox value |
| `l1b-blanket.md` | 838 | L-1B letter structure, word targets, duty format |
| `i129s-schema.txt` | 362 | I-129S petition supplement field mapping |
| `forms-ds156e.md` | 486 | DS-156E direct PDF fill field reference |
| `g28-schema.txt` | 320 | G-28 notice of entry field mapping |
| `form-generation/SKILL.md` | 117 | Skill routing: which schema for which form |
| `letter-generation/SKILL.md` | 75 | Letter template selection and formatting rules |

We transferred our paralegals' knowledge into skills. The skills are the competitive advantage.

---

## What This Demo Shows

| Capability | How It Works |
|---|---|
| **Letter Drafting** | Agent loads L-1B skill, reads case data, generates structured support letter |
| **Form Generation** | Agent loads DS-160 schema, maps case fields, produces validated form JSON |
| **Subagent Delegation** | Orchestrator delegates research tasks to worker agents with their own tool loops |
| **Artifact Streaming** | Forms and letters stream as artifacts into a dedicated panel with type badges |
| **Skill System** | Skills auto-discovered from `.claude/skills/` by the Agent SDK at runtime |

---

## Public Demo Edition

This is the **open-source demo edition** using synthetic data and local files.

- All case data is fictional (Hiroshi Tanaka, a synthetic L-1B beneficiary)
- Files are read from the local `sample-workspace/` directory
- No authentication required
- No external service dependencies

### What Production Adds

| Demo | Production |
|---|---|
| Local files | SharePoint/OneDrive integration |
| No auth | Microsoft OAuth + role-based access |
| In-memory sessions | PostgreSQL persistence |
| Single agent | 40+ tools, email triage, Teams bot |
| Synthetic data | Real case files, real form submissions |

---

## Architecture

```
                        ┌──────────────────────────────┐
                        │          Frontend             │
                        │  Chat + Trace + Artifact UI   │
                        └──────────┬───────────────────┘
                                   │ POST /api/chat/stream (SSE)
                        ┌──────────▼───────────────────┐
                        │       Agent Service           │
                        │  query() — Claude Agent SDK   │
                        │                               │
                        │  ┌─────────────────────────┐  │
                        │  │ System Prompt            │  │
                        │  │ + .claude/skills/ (auto) │  │
                        │  └─────────────────────────┘  │
                        │                               │
                        │  ┌──────────┐ ┌────────────┐  │
                        │  │ MCP Tools│ │  Subagent  │  │
                        │  │ (6 tools)│ │  query()   │  │
                        │  └──────────┘ └─────┬──────┘  │
                        │                     │         │
                        │              ┌──────▼──────┐  │
                        │              │   Worker    │  │
                        │              │  Subagent   │  │
                        │              └─────────────┘  │
                        └───────────────────────────────┘
```

---

## Run Locally

**Prerequisites:** Node.js 20+, an Anthropic API key

```bash
# Clone and install
git clone <this-repo>
cd agentkit-demo

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build

# Set API key and start backend (serves frontend from build/)
cd ../backend
ANTHROPIC_API_KEY=sk-ant-... PORT=10000 node src/server.js

# Open http://localhost:10000
```

The app uses real Claude API calls via the Agent SDK. An `ANTHROPIC_API_KEY` is required.

---

## 3 Demo Flows

### 1. Draft an L-1B Support Letter

```
Draft an L-1B support letter for Hiroshi Tanaka
```

Watch the agent load the L-1B letter skill, read the case file, and generate a structured support letter with proper duty format, specialized knowledge arguments, and word count targets. The letter appears as a markdown artifact in the right panel.

### 2. Generate a DS-160 Form

```
Generate a DS-160 for Tanaka's visa renewal
```

Watch the agent load the DS-160 schema skill, read applicant data from the workspace, and produce a validated JSON form with all 200+ fields mapped. The form appears as a JSON artifact with validation status.

### 3. Prepare a Case Report

```
Prepare a case report for the Tanaka L-1B petition
```

Watch the agent delegate research to a subagent, gather case details, and compile a structured case report. The trace panel shows subagent activity with purple-highlighted nested events.

---

## Event Contract (SSE)

| Event | Payload | Source |
|---|---|---|
| `session` | `{ sessionId }` | Router |
| `text_delta` | `{ content }` | Agent |
| `thinking` | `{ content }` | Agent |
| `tool_executing` | `{ tool, input }` | Agent |
| `tool_result` | `{ tool }` | Agent |
| `artifact_start` | `{ artifactType, title }` | Agent |
| `artifact_delta` | `{ text }` | Agent |
| `artifact_end` | `{ content, artifactType }` | Agent |
| `complete` | `{ tokenUsage, sdkSessionId }` | Agent |
| `end` | `{}` | Router |
| `error` | `{ message }` | Agent |

---

## Built With

- [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk) — Agent orchestration and tool execution
- [Claude Code](https://claude.ai/code) — AI-powered development
- Express.js + React + Vite + Tailwind CSS

---

*Built with [Claude Code](https://claude.ai/code)*
