const toolRegistry = require('./toolRegistry');
const subagentManager = require('./subagentManager');

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to a knowledge base of documents. You can search, read, and analyze documents. For complex analysis tasks, you can delegate subtasks to specialized worker agents.

Available tools:
- search_knowledge: Search the knowledge base for relevant documents
- read_document: Read a specific document by ID
- analyze_document: Extract key facts and analysis from a document
- delegate_to_subagent: Delegate a subtask to a specialized worker agent for parallel analysis

When answering complex questions:
1. First search for relevant documents
2. Read the most relevant ones
3. For multi-faceted analysis, delegate subtasks to worker agents
4. Synthesize all findings into a comprehensive response
5. Generate a structured artifact when appropriate`;

const TOOLS = [
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
  {
    name: 'analyze_document',
    description: 'Analyze a document to extract key facts, risks, and insights',
    input_schema: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Document ID to analyze' },
        focus: {
          type: 'string',
          description: 'What aspect to focus the analysis on',
        },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'delegate_to_subagent',
    description:
      'Delegate a subtask to a specialized worker agent. Use for parallel analysis, deep research, or when a task benefits from focused attention.',
    input_schema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Description of the subtask to delegate',
        },
        context: {
          type: 'string',
          description: 'Relevant context for the subtask',
        },
      },
      required: ['task'],
    },
  },
];

class ChatOrchestrator {
  async run(userMessage, session, emit) {
    session.messages.push({ role: 'user', content: userMessage });

    const isDemo = process.env.DEMO_MODE === 'true';

    let adapter;
    if (isDemo) {
      const { getMockAdapter } = require('../adapters/llm/mockAnthropic');
      adapter = getMockAdapter();
    } else {
      const { getLLMAdapter } = require('../adapters/llm/realAnthropic');
      adapter = getLLMAdapter();
    }

    try {
      let continueLoop = true;

      while (continueLoop) {
        const response = await adapter.run(
          session.messages,
          TOOLS,
          SYSTEM_PROMPT,
          emit
        );

        let hasToolUse = false;
        const toolResults = [];

        for (const block of response.content) {
          if (block.type === 'thinking') {
            emit({ type: 'thinking_delta', text: block.thinking });
          } else if (block.type === 'text') {
            emit({ type: 'text_delta', text: block.text });
          } else if (block.type === 'tool_use') {
            hasToolUse = true;

            if (block.name === 'delegate_to_subagent') {
              emit({
                type: 'tool_executing',
                tool: block.name,
                input: block.input,
              });
              const result = await subagentManager.delegate(
                block.input.task,
                block.input.context || '',
                session,
                emit
              );
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
              emit({ type: 'tool_result', tool: block.name, output: result });
            } else {
              emit({
                type: 'tool_executing',
                tool: block.name,
                input: block.input,
              });
              const result = await toolRegistry.execute(block.name, block.input);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
              emit({ type: 'tool_result', tool: block.name, output: result });
            }
          }
        }

        // Append assistant turn to session
        session.messages.push({ role: 'assistant', content: response.content });

        if (hasToolUse) {
          // Feed tool results back as a user message and continue the loop
          session.messages.push({ role: 'user', content: toolResults });
        } else {
          // No tool calls — the agent is done
          continueLoop = false;
        }
      }

      // Emit artifact for the risk demo flow
      if (isDemo && userMessage.toLowerCase().includes('risk')) {
        const fixtures = require('../data/demo-fixtures.json');
        emit({
          type: 'artifact',
          id: 'risk-report-1',
          title: 'Q4 Risk Assessment Report',
          contentType: 'application/json',
          content: JSON.stringify(fixtures.artifact, null, 2),
        });
      }

      emit({ type: 'done' });
    } catch (error) {
      console.error('Orchestrator error:', error);
      emit({ type: 'error', message: error.message });
    }
  }
}

module.exports = new ChatOrchestrator();
