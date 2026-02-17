const { v4: uuidv4 } = require('uuid');
const toolRegistry = require('./toolRegistry');

const SUBAGENT_SYSTEM_PROMPT = `You are a specialized worker agent. You have been delegated a specific analysis task. You have access to search and read tools to gather information. Complete the task thoroughly and return your findings concisely.

Available tools:
- search_knowledge: Search the knowledge base for relevant documents
- read_document: Read a specific document by ID`;

const SUBAGENT_TOOLS = [
  {
    name: 'search_knowledge',
    description: 'Search the knowledge base for documents matching a query',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_document',
    description: 'Read a specific document by its ID',
    input_schema: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Document ID to read' },
      },
      required: ['documentId'],
    },
  },
];

class SubagentManager {
  /**
   * Delegate a task to a subagent that runs its own independent agent loop.
   */
  async delegate(task, context, _parentSession, emit) {
    const subagentId = uuidv4();

    emit({ type: 'subagent_start', subagentId, task });

    const isDemo = process.env.DEMO_MODE === 'true';

    if (isDemo) {
      return this._runDemoSubagent(subagentId, task, context, emit);
    }

    return this._runLiveSubagent(subagentId, task, context, emit);
  }

  async _runDemoSubagent(subagentId, task, context, emit) {
    const { getMockAdapter } = require('../adapters/llm/mockAnthropic');
    const fixtures = require('../data/demo-fixtures.json');

    // Simulate the subagent doing some work
    emit({
      type: 'subagent_thinking',
      subagentId,
      text: `Analyzing task: "${task}". Reviewing available documents for risk mitigation strategies...`,
    });

    await new Promise((r) => setTimeout(r, 150));

    emit({
      type: 'subagent_tool',
      subagentId,
      tool: 'search_knowledge',
      input: { query: 'mitigation strategies' },
    });

    await new Promise((r) => setTimeout(r, 100));

    const result = fixtures.mockResponses.subagentResult;

    emit({
      type: 'subagent_complete',
      subagentId,
      result,
    });

    return result;
  }

  async _runLiveSubagent(subagentId, task, context, emit) {
    const { getLLMAdapter } = require('../adapters/llm/realAnthropic');
    const adapter = getLLMAdapter();

    // Subagent has its OWN message history, completely independent
    const subagentMessages = [
      {
        role: 'user',
        content: `Task: ${task}\n\nContext: ${context || 'None provided'}`,
      },
    ];

    let continueLoop = true;

    while (continueLoop) {
      const response = await adapter.run(
        subagentMessages,
        SUBAGENT_TOOLS,
        SUBAGENT_SYSTEM_PROMPT,
        emit
      );

      let hasToolUse = false;
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === 'thinking') {
          emit({ type: 'subagent_thinking', subagentId, text: block.thinking });
        } else if (block.type === 'text') {
          // Subagent's final text is its findings
          emit({
            type: 'subagent_complete',
            subagentId,
            result: { task, findings: block.text, confidence: 0.9 },
          });
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          emit({
            type: 'subagent_tool',
            subagentId,
            tool: block.name,
            input: block.input,
          });
          const result = await toolRegistry.execute(block.name, block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      subagentMessages.push({ role: 'assistant', content: response.content });

      if (hasToolUse) {
        subagentMessages.push({ role: 'user', content: toolResults });
      } else {
        continueLoop = false;
      }
    }

    // Extract final text from the last assistant message
    const lastAssistant = subagentMessages[subagentMessages.length - 1];
    if (lastAssistant && lastAssistant.role === 'assistant') {
      const textBlock = lastAssistant.content.find((b) => b.type === 'text');
      if (textBlock) {
        return { task, findings: textBlock.text, confidence: 0.9 };
      }
    }

    return { task, findings: 'Subagent completed analysis.', confidence: 0.7 };
  }
}

module.exports = new SubagentManager();
