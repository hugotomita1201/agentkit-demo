const Anthropic = require('@anthropic-ai/sdk');

let instance = null;

class RealAnthropicAdapter {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Set it in your .env file or switch to DEMO_MODE=true.'
      );
    }
    this.client = new Anthropic();
  }

  /**
   * Run a single LLM turn. Returns a response object with a `content` array
   * containing blocks of type "thinking", "text", and/or "tool_use".
   */
  async run(messages, tools, systemPrompt, emit) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      system: systemPrompt,
      tools,
      messages,
    });

    return response;
  }
}

function getLLMAdapter() {
  if (!instance) {
    instance = new RealAnthropicAdapter();
  }
  return instance;
}

module.exports = { getLLMAdapter };
