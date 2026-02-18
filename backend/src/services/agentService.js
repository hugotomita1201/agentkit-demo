/**
 * Agent Service — Claude Agent SDK Integration
 *
 * Stripped-down fork of TomitaLaw's agentSdkService.js (~7K lines → ~700 lines).
 * Demonstrates the core Agent SDK patterns:
 *
 * 1. MCP tool registration via createSdkMcpServer() + tool() with Zod schemas
 * 2. query() call with streaming async iteration
 * 3. Artifact detection (<artifact> tags) with TCP fragmentation handling
 * 4. Subagent delegation via custom MCP tools
 * 5. Session resumption for prompt caching
 * 6. SSE streaming to frontend
 *
 * Key SDK imports: { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
 */

const { query, createSdkMcpServer, tool } = require('@anthropic-ai/claude-agent-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const fs = require('fs').promises;
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MODEL = 'claude-sonnet-4-6';

// Paths — configurable via env vars, with sensible defaults
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SAMPLE_WORKSPACE_DIR =
  process.env.SAMPLE_WORKSPACE_DIR ||
  path.join(PROJECT_ROOT, 'src', 'data', 'sample-workspace');
const SYSTEM_PROMPT_PATH =
  process.env.SYSTEM_PROMPT_PATH ||
  path.join(PROJECT_ROOT, 'prompts', 'system-prompt.txt');

// ---------------------------------------------------------------------------
// Agent SDK Service
// ---------------------------------------------------------------------------

class AgentService {
  constructor() {
    // Session state: sessionId -> { sdkSessionId, artifacts, subagentSessions }
    this.sessions = new Map();

    // Subagent tracking
    this.runningSubagents = new Map(); // taskId -> { promise, startTime }

    // Create MCP server with custom tools
    this.mcpServer = this.createMcpTools();

    // Cache system prompt (loaded lazily)
    this._systemPromptCache = null;
  }

  // =========================================================================
  // Session Management (in-memory)
  // =========================================================================

  getOrCreateSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }
    const session = {
      sdkSessionId: null,
      artifacts: { content: null, type: null },
      subagentSessions: new Map(),
      createdAt: Date.now(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  // =========================================================================
  // System Prompt Loader
  // =========================================================================

  async getSystemPrompt() {
    // In development, always re-read for hot-reload
    if (process.env.NODE_ENV === 'production' && this._systemPromptCache) {
      return this._systemPromptCache;
    }
    try {
      const raw = await fs.readFile(SYSTEM_PROMPT_PATH, 'utf-8');
      // Interpolate template variables
      const prompt = raw
        .replace(/\{\{workspaceDir\}\}/g, SAMPLE_WORKSPACE_DIR)
        .replace(/\{\{projectRoot\}\}/g, PROJECT_ROOT);
      this._systemPromptCache = prompt;
      return prompt;
    } catch (err) {
      console.error(`Failed to load system prompt from ${SYSTEM_PROMPT_PATH}:`, err.message);
      // Fallback prompt so the service still works
      return `You are an immigration case assistant. Help the user analyze documents in ${SAMPLE_WORKSPACE_DIR}. Use the available MCP tools to search and read case files.`;
    }
  }

  // =========================================================================
  // MCP Tools — registered via createSdkMcpServer() + tool() with Zod schemas
  //
  // This is the SAME pattern used in production. Each tool gets:
  //   - a name (string)
  //   - a description (string)
  //   - a Zod schema for input validation
  //   - an async handler function
  // =========================================================================

  createMcpTools() {
    return createSdkMcpServer({
      name: 'immigration-tools',
      version: '1.0.0',
      tools: [
        // ----------------------------------------------------------------
        // 1. search_case_files — keyword search across sample workspace
        // ----------------------------------------------------------------
        tool(
          'search_case_files',
          'Search for documents in the case workspace by keyword. Returns matching filenames and snippets.',
          {
            query: z.string().describe('Search keyword — file name, person name, visa type, etc.'),
          },
          async ({ query: searchQuery }) => {
            return this.handleSearchCaseFiles(searchQuery);
          }
        ),

        // ----------------------------------------------------------------
        // 2. read_document — read a file from the sample workspace
        // ----------------------------------------------------------------
        tool(
          'read_document',
          'Read the full text content of a document from the case workspace by filename.',
          {
            filename: z.string().describe('Filename to read (e.g., "passport.txt", "support-letter.md")'),
          },
          async ({ filename }) => {
            return this.handleReadDocument(filename);
          }
        ),

        // ----------------------------------------------------------------
        // 3. analyze_document — extract dates, flag gaps and risks
        // ----------------------------------------------------------------
        tool(
          'analyze_document',
          'Analyze a document for key immigration data: extract dates, names, visa info, and flag any gaps or risks. Pass the full document text.',
          {
            content: z.string().describe('Full text content of the document to analyze'),
            focus: z.string().optional().describe('What to focus on: "dates", "risks", "gaps", or general analysis'),
          },
          async ({ content, focus }) => {
            return this.handleAnalyzeDocument(content, focus);
          }
        ),

        // ----------------------------------------------------------------
        // 4. generate_form — instruct Claude to use Skill for form generation
        // ----------------------------------------------------------------
        tool(
          'generate_form',
          'Generate an immigration form JSON artifact. This tool triggers the form-generation skill which reads the appropriate schema and produces a complete JSON artifact wrapped in <artifact> tags.',
          {
            form_type: z.string().describe('Form type to generate (e.g., "ds-160", "g-28", "i-129s")'),
            source_documents: z.array(z.string()).describe('Filenames of source documents to extract data from'),
          },
          async ({ form_type, source_documents }) => {
            return this.handleGenerateForm(form_type, source_documents);
          }
        ),

        // ----------------------------------------------------------------
        // 5. delegate_to_subagent — launch background subagent
        // ----------------------------------------------------------------
        tool(
          'delegate_to_subagent',
          `Delegate a task to a worker subagent. The worker runs in the background with its own query() loop, full tool access, and session caching. Returns immediately — call wait_for_subagents to collect results.

Use for:
- Form generation requiring multiple document reads
- Letter drafting with extensive research
- Any multi-step task that benefits from parallel execution`,
          {
            task: z.string().describe('Detailed task description for the worker'),
            taskId: z.string().optional().describe('Unique ID for tracking (e.g., "ds160", "letter"). Same ID resumes cached session.'),
            context: z.string().optional().describe('Additional context from the conversation'),
          },
          async ({ task, taskId, context: additionalContext }) => {
            return this.handleDelegateToSubagent(task, taskId, additionalContext);
          }
        ),

        // ----------------------------------------------------------------
        // 6. wait_for_subagents — block until running subagents complete
        // ----------------------------------------------------------------
        tool(
          'wait_for_subagents',
          'Wait for all running subagents to complete and return their results. Call this after dispatching tasks with delegate_to_subagent.',
          {},
          async () => {
            return this.handleWaitForSubagents();
          }
        ),
      ],
    });
  }

  // =========================================================================
  // Tool Handlers
  // =========================================================================

  /**
   * Search case files by keyword (filename + content grep)
   */
  async handleSearchCaseFiles(searchQuery) {
    try {
      const files = await fs.readdir(SAMPLE_WORKSPACE_DIR);
      const query_lower = searchQuery.toLowerCase();
      const results = [];

      for (const file of files) {
        const filePath = path.join(SAMPLE_WORKSPACE_DIR, file);
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) continue;

        const nameMatch = file.toLowerCase().includes(query_lower);
        let contentSnippet = '';
        let contentMatch = false;

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const idx = content.toLowerCase().indexOf(query_lower);
          if (idx !== -1) {
            contentMatch = true;
            const start = Math.max(0, idx - 80);
            const end = Math.min(content.length, idx + searchQuery.length + 80);
            contentSnippet = '...' + content.substring(start, end).replace(/\n/g, ' ') + '...';
          }
        } catch {
          // Binary file or read error — skip content search
        }

        if (nameMatch || contentMatch) {
          results.push({
            filename: file,
            size: `${(stat.size / 1024).toFixed(1)}KB`,
            matchType: nameMatch && contentMatch ? 'name+content' : nameMatch ? 'name' : 'content',
            snippet: contentSnippet || null,
          });
        }
      }

      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: `No files found matching "${searchQuery}" in the case workspace.` }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Found ${results.length} file(s) matching "${searchQuery}":\n\n${results
            .map(r => `- **${r.filename}** (${r.size}, match: ${r.matchType})${r.snippet ? `\n  ${r.snippet}` : ''}`)
            .join('\n')}`,
        }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error searching files: ${err.message}` }],
        isError: true,
      };
    }
  }

  /**
   * Read a document from the sample workspace
   */
  async handleReadDocument(filename) {
    try {
      // Sanitize: prevent path traversal
      const safeName = path.basename(filename);
      const filePath = path.join(SAMPLE_WORKSPACE_DIR, safeName);
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{
          type: 'text',
          text: `## ${safeName}\n\n${content}`,
        }],
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        // List available files to help the user
        try {
          const files = await fs.readdir(SAMPLE_WORKSPACE_DIR);
          return {
            content: [{
              type: 'text',
              text: `File "${filename}" not found. Available files:\n${files.map(f => `- ${f}`).join('\n')}`,
            }],
            isError: true,
          };
        } catch {
          return { content: [{ type: 'text', text: `File "${filename}" not found.` }], isError: true };
        }
      }
      return { content: [{ type: 'text', text: `Error reading file: ${err.message}` }], isError: true };
    }
  }

  /**
   * Analyze document content for immigration-relevant data
   * Returns structured analysis that Claude can use in its response
   */
  async handleAnalyzeDocument(content, focus) {
    // Use Anthropic Messages API for a focused extraction call
    try {
      const anthropic = new Anthropic();
      const analysisPrompt = focus
        ? `Analyze this immigration document. Focus on: ${focus}. Extract all relevant ${focus} information.`
        : 'Analyze this immigration document. Extract: 1) Key dates, 2) Names and roles, 3) Visa/immigration info, 4) Any gaps, inconsistencies, or risks.';

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `${analysisPrompt}\n\n---\n\n${content.substring(0, 15000)}`,
        }],
      });

      const analysisText = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      return {
        content: [{ type: 'text', text: analysisText }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Analysis failed: ${err.message}. The document content was provided but could not be analyzed programmatically.` }],
        isError: true,
      };
    }
  }

  /**
   * Generate form — returns instruction for Claude to invoke the Skill tool
   */
  async handleGenerateForm(formType, sourceDocuments) {
    return {
      content: [{
        type: 'text',
        text: `To generate the ${formType} form, invoke the form-generation skill:\n\n` +
          `Skill({ skill: "form-generation" })\n\n` +
          `Source documents to use: ${sourceDocuments.join(', ')}\n\n` +
          `The skill will guide you through reading the appropriate schema, extracting data from the source documents, and producing a complete JSON artifact wrapped in <artifact> tags.`,
      }],
    };
  }

  /**
   * Delegate task to a subagent — NON-BLOCKING
   * Launches a separate query() loop in the background and returns immediately.
   */
  async handleDelegateToSubagent(task, taskId, additionalContext) {
    const effectiveTaskId = taskId || `task-${Date.now()}`;

    console.log(`\n[Subagent] Launching task "${effectiveTaskId}": ${task.substring(0, 100)}...`);

    const systemPrompt = await this.getSystemPrompt();
    const fullPrompt = additionalContext
      ? `Context from orchestrator:\n${additionalContext}\n\nTask:\n${task}`
      : task;

    // Tools the subagent can use — same MCP tools + SDK built-in tools
    const workerTools = [
      'Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
      'mcp__immigration-tools__search_case_files',
      'mcp__immigration-tools__read_document',
      'mcp__immigration-tools__analyze_document',
      'mcp__immigration-tools__generate_form',
    ];

    // Launch in background — DO NOT await
    const subagentPromise = this._runSubagentQuery({
      fullPrompt,
      systemPrompt,
      workerTools,
      effectiveTaskId,
    });

    this.runningSubagents.set(effectiveTaskId, {
      promise: subagentPromise,
      startTime: Date.now(),
    });

    return {
      content: [{
        type: 'text',
        text: `Subagent launched for task "${effectiveTaskId}". It is now running in the background. Call wait_for_subagents() after dispatching all tasks to collect results.`,
      }],
    };
  }

  /**
   * Run a subagent query in the background
   * @private
   */
  async _runSubagentQuery({ fullPrompt, systemPrompt, workerTools, effectiveTaskId }) {
    let result = '';

    try {
      // Create a FRESH MCP server for this subagent (prevents shared-state conflicts)
      const subagentMcpServer = this.createMcpTools();

      const subagentQuery = query({
        prompt: fullPrompt,
        options: {
          systemPrompt,
          model: MODEL,
          allowedTools: workerTools,
          disallowedTools: ['Task', 'TaskOutput'], // Subagents cannot spawn sub-subagents
          mcpServers: { 'immigration-tools': subagentMcpServer },
          permissionMode: 'acceptEdits',
          settingSources: ['project'],
          thinking: { type: 'adaptive' },
          effort: 'medium',
          maxTurns: 50,
          workingDirectory: PROJECT_ROOT,
          includePartialMessages: true,
          stderr: (message) => {
            console.error(`[Subagent ${effectiveTaskId} stderr]`, message);
          },
        },
      });

      for await (const message of subagentQuery) {
        // Extract text content from assistant messages
        if (message.type === 'assistant' && Array.isArray(message.message?.content)) {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              result += block.text;
            }
          }
        }
      }

      console.log(`[Subagent] Task "${effectiveTaskId}" completed (${result.length} chars)`);
    } catch (err) {
      console.error(`[Subagent] Task "${effectiveTaskId}" failed:`, err.message);
      result = `Subagent error: ${err.message}`;
    }

    return result;
  }

  /**
   * Wait for all running subagents to complete
   */
  async handleWaitForSubagents() {
    if (this.runningSubagents.size === 0) {
      return {
        content: [{ type: 'text', text: 'No subagents are currently running.' }],
      };
    }

    const results = [];
    const entries = [...this.runningSubagents.entries()];

    console.log(`[Subagent] Waiting for ${entries.length} subagent(s)...`);

    for (const [taskId, entry] of entries) {
      try {
        const result = await entry.promise;
        const elapsed = ((Date.now() - entry.startTime) / 1000).toFixed(1);
        results.push(`## Task: ${taskId} (${elapsed}s)\n\n${result}`);
      } catch (err) {
        results.push(`## Task: ${taskId} (FAILED)\n\nError: ${err.message}`);
      }
      this.runningSubagents.delete(taskId);
    }

    return {
      content: [{ type: 'text', text: results.join('\n\n---\n\n') }],
    };
  }

  // =========================================================================
  // chat() — Async generator that yields SSE events
  //
  // This is the core streaming loop. It:
  // 1. Calls query() with the user message
  // 2. Iterates over SDK streaming events
  // 3. Detects <artifact> tags in text deltas (with TCP fragmentation handling)
  // 4. Yields typed events for the SSE layer
  // =========================================================================

  async *chat(userMessage, options = {}) {
    const { sessionId } = options;
    const session = this.getOrCreateSession(sessionId);

    console.log(`\n[Chat] Session: ${sessionId?.slice(0, 8)}...`);
    console.log(`[Chat] Message: ${userMessage.slice(0, 100)}...`);

    // Load system prompt
    const systemPrompt = await this.getSystemPrompt();

    // Allowed tools: SDK built-in + MCP tools
    const allowedTools = [
      'Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
      'mcp__immigration-tools__search_case_files',
      'mcp__immigration-tools__read_document',
      'mcp__immigration-tools__analyze_document',
      'mcp__immigration-tools__generate_form',
      'mcp__immigration-tools__delegate_to_subagent',
      'mcp__immigration-tools__wait_for_subagents',
    ];

    // Build query options
    const queryOptions = {
      model: MODEL,
      workingDirectory: PROJECT_ROOT,
      systemPrompt,
      settingSources: ['project'], // Enables Skill tool discovery from .claude/skills/
      mcpServers: { 'immigration-tools': this.mcpServer },
      allowedTools,
      disallowedTools: ['Task', 'TaskOutput'],
      // Thinking: adaptive mode — Claude decides when/how much to think
      thinking: { type: 'adaptive' },
      effort: 'medium',
      permissionMode: 'acceptEdits',
      includePartialMessages: true,
      maxTurns: 100,
      stderr: (message) => {
        console.error('[Agent SDK stderr]', message);
      },
    };

    // Resume if we have a previous SDK session (enables prompt caching)
    if (session.sdkSessionId) {
      queryOptions.resume = session.sdkSessionId;
      console.log(`[Chat] Resuming SDK session: ${session.sdkSessionId.substring(0, 20)}...`);
    }

    // -----------------------------------------------------------------------
    // Streaming loop — iterate over SDK events
    // -----------------------------------------------------------------------

    let textBuffer = '';      // Accumulated text for tag detection
    let artifactBuffer = '';  // Accumulated artifact content
    let inArtifact = false;
    let currentArtifactType = null;
    let newSdkSessionId = null;
    let tokenUsage = null;

    const currentResponse = query({
      prompt: userMessage,
      options: queryOptions,
    });

    try {
      for await (const event of currentResponse) {
        // Capture session ID for resumption
        if (event.type === 'session_id') {
          newSdkSessionId = event.session_id;
          session.sdkSessionId = event.session_id;
          console.log(`[Chat] SDK session ID: ${event.session_id.substring(0, 20)}...`);
        }

        // Token usage for cost tracking
        if (event.type === 'usage') {
          tokenUsage = event;
        }

        // Tool execution events — forward to frontend for visibility
        if (event.type === 'tool_call') {
          yield {
            type: 'tool_executing',
            tool: event.tool_name || event.name,
            input: event.tool_input || event.input,
          };
        }

        if (event.type === 'tool_result') {
          yield {
            type: 'tool_result',
            tool: event.tool_name || event.name,
          };
        }

        // Handle content deltas from assistant messages
        if (event.type === 'assistant') {
          const message = event.message;
          if (!message?.content) continue;

          for (const block of Array.isArray(message.content) ? message.content : [message.content]) {
            // Extended thinking blocks
            if (block.type === 'thinking' && block.thinking) {
              yield { type: 'thinking', content: block.thinking };
              continue;
            }

            // Text blocks — need artifact tag detection
            if (block.type !== 'text') continue;
            const text = block.text || '';
            if (!text) continue;

            // Process text through the tag detection state machine
            textBuffer += text;

            // ----------- Tag detection loop (handles TCP fragmentation) -----------
            while (true) {
              if (inArtifact) {
                // Inside artifact — look for </artifact>
                const ARTIFACT_CLOSE = '</artifact>';
                const closeIdx = textBuffer.indexOf(ARTIFACT_CLOSE);

                if (closeIdx === -1) {
                  // No complete closing tag — check for partial at end
                  let keepFromEnd = 0;
                  for (let len = 1; len < ARTIFACT_CLOSE.length; len++) {
                    if (textBuffer.endsWith(ARTIFACT_CLOSE.substring(0, len))) {
                      keepFromEnd = len;
                    }
                  }
                  const toEmit = textBuffer.substring(0, textBuffer.length - keepFromEnd);
                  const toKeep = textBuffer.substring(textBuffer.length - keepFromEnd);
                  if (toEmit) {
                    artifactBuffer += toEmit;
                    yield { type: 'artifact_delta', text: toEmit };
                  }
                  textBuffer = toKeep;
                  break;
                } else {
                  // Found closing tag
                  const beforeClose = textBuffer.substring(0, closeIdx);
                  if (beforeClose) {
                    artifactBuffer += beforeClose;
                    yield { type: 'artifact_delta', text: beforeClose };
                  }

                  // Store artifact
                  const artifactContent = artifactBuffer.trim();
                  session.artifacts.content = artifactContent;
                  session.artifacts.type = currentArtifactType || 'application/json';

                  yield {
                    type: 'artifact_end',
                    content: artifactContent,
                    artifactType: currentArtifactType || 'application/json',
                  };

                  inArtifact = false;
                  artifactBuffer = '';
                  currentArtifactType = null;
                  textBuffer = textBuffer.substring(closeIdx + ARTIFACT_CLOSE.length);
                }
              } else {
                // Not inside artifact — look for <artifact ...>
                const artifactMatch = textBuffer.match(/<artifact(\s[^>]*)?>/)
                if (artifactMatch) {
                  const artifactIdx = textBuffer.indexOf(artifactMatch[0]);
                  const beforeTag = textBuffer.substring(0, artifactIdx);
                  if (beforeTag) yield { type: 'text_delta', content: beforeTag };

                  // Extract type attribute
                  const typeMatch = artifactMatch[0].match(/type=["']([^"']+)["']/);
                  currentArtifactType = typeMatch ? typeMatch[1] : 'application/json';
                  const titleMatch = artifactMatch[0].match(/title=["']([^"']+)["']/);
                  const artifactTitle = titleMatch ? titleMatch[1] : 'Artifact';

                  yield { type: 'artifact_start', artifactType: currentArtifactType, title: artifactTitle };
                  inArtifact = true;
                  artifactBuffer = '';
                  textBuffer = textBuffer.substring(artifactIdx + artifactMatch[0].length);
                } else {
                  // No opening tag — emit safe text (keep potential partial '<')
                  const partialIdx = textBuffer.lastIndexOf('<');
                  if (partialIdx > 0) {
                    const safeText = textBuffer.substring(0, partialIdx);
                    if (safeText) yield { type: 'text_delta', content: safeText };
                    textBuffer = textBuffer.substring(partialIdx);
                  } else if (!textBuffer.includes('<')) {
                    if (textBuffer) yield { type: 'text_delta', content: textBuffer };
                    textBuffer = '';
                  }
                  break;
                }
              }
            }
          }
        }

        // Result message — final assistant turn
        if (event.type === 'result') {
          // Flush any remaining text
          if (textBuffer && !inArtifact) {
            yield { type: 'text_delta', content: textBuffer };
            textBuffer = '';
          }
        }
      }
    } catch (err) {
      console.error('[Chat] SDK streaming error:', err.message);
      yield { type: 'error', message: `Agent error: ${err.message}` };
    }

    // Flush any remaining buffer
    if (textBuffer) {
      if (inArtifact) {
        yield { type: 'artifact_delta', text: textBuffer };
        yield { type: 'artifact_end', content: artifactBuffer + textBuffer, artifactType: currentArtifactType };
      } else {
        yield { type: 'text_delta', content: textBuffer };
      }
    }

    // Emit completion with token usage
    yield {
      type: 'complete',
      tokenUsage: tokenUsage || null,
      sdkSessionId: newSdkSessionId,
    };
  }

  // =========================================================================
  // streamChat() — SSE writer that consumes the chat() async generator
  //
  // This method wires the generator to an Express response object.
  // It handles:
  //   - SSE headers and flush
  //   - Heartbeat to keep the connection alive
  //   - Client disconnect detection
  //   - JSON serialization of events
  // =========================================================================

  async streamChat(userMessage, res, options = {}) {
    const { req } = options;
    let clientDisconnected = false;

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx/Render buffering
    res.flushHeaders();

    const sendEvent = (event) => {
      if (clientDisconnected) return;
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (e) {
        clientDisconnected = true;
        console.log('[SSE] Write failed — client likely disconnected');
      }
    };

    // Heartbeat — keeps connection alive during long tool executions
    const heartbeatInterval = setInterval(() => {
      try {
        if (!clientDisconnected) res.write(':\n\n');
      } catch (e) {
        clientDisconnected = true;
        clearInterval(heartbeatInterval);
      }
    }, 15000);

    // Detect client disconnect
    if (req) {
      req.on('close', () => {
        if (!clientDisconnected) {
          clientDisconnected = true;
          console.log('[SSE] Client disconnected mid-stream');
          clearInterval(heartbeatInterval);
        }
      });
    }

    try {
      for await (const event of this.chat(userMessage, options)) {
        if (clientDisconnected) break;
        sendEvent(event);
      }
    } catch (err) {
      console.error('[streamChat] Error:', err.message);
      sendEvent({ type: 'error', message: err.message });
    } finally {
      clearInterval(heartbeatInterval);
      sendEvent({ type: 'end' });
      res.end();
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export (matches production pattern)
// ---------------------------------------------------------------------------

let instance = null;

function getAgentService() {
  if (!instance) {
    instance = new AgentService();
  }
  return instance;
}

module.exports = { AgentService, getAgentService };
