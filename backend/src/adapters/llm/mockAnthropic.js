const { v4: uuidv4 } = require('uuid');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deterministic mock adapter that returns fixture-based responses.
 * Shaped identically to real Anthropic SDK responses.
 *
 * For a "risks" query it walks through a 4-turn tool-use sequence:
 *   Turn 1: thinking + search_knowledge tool_use
 *   Turn 2: thinking + read_document tool_use
 *   Turn 3: thinking + delegate_to_subagent tool_use
 *   Turn 4: thinking + final text synthesis
 *
 * For any other query it returns a single thinking + text turn.
 */
class MockAnthropicAdapter {
  constructor() {
    // Track how many turns have been completed for the current risk-analysis flow
    this.turnIndex = 0;
    this.activeFlow = null; // null | 'risk'
  }

  async run(messages, _tools, _systemPrompt, _emit) {
    const lastUserMsg = this._getLastUserText(messages);
    const isRiskQuery = lastUserMsg.toLowerCase().includes('risk');

    // Determine whether we're continuing an existing risk flow or starting fresh
    const lastAssistant = this._getLastAssistantContent(messages);
    const hasToolResults = this._hasToolResults(messages);

    if (isRiskQuery && this.activeFlow !== 'risk') {
      // Start a new risk analysis flow
      this.activeFlow = 'risk';
      this.turnIndex = 0;
    }

    if (this.activeFlow === 'risk') {
      const response = await this._riskFlowTurn();
      return response;
    }

    // Default: simple thinking + text
    return this._simpleResponse(lastUserMsg);
  }

  async _riskFlowTurn() {
    const turn = this.turnIndex;
    this.turnIndex++;

    switch (turn) {
      case 0:
        // Turn 1: thinking + search_knowledge
        await delay(100);
        return {
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking:
                'The user is asking about risks. I should search the knowledge base for Q4 risk-related documents first.',
            },
            {
              type: 'tool_use',
              id: `toolu_${uuidv4().slice(0, 8)}`,
              name: 'search_knowledge',
              input: { query: 'Q4 risks' },
            },
          ],
          stop_reason: 'tool_use',
        };

      case 1:
        // Turn 2: thinking + read_document
        await delay(120);
        return {
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking:
                'Found the Q4 2025 Project Status Report with high relevance. Let me read the full document to get detailed risk information.',
            },
            {
              type: 'tool_use',
              id: `toolu_${uuidv4().slice(0, 8)}`,
              name: 'read_document',
              input: { documentId: 'q4-report' },
            },
          ],
          stop_reason: 'tool_use',
        };

      case 2:
        // Turn 3: thinking + delegate_to_subagent
        await delay(150);
        return {
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking:
                'I now have the full Q4 report with 4 identified risks. This is a complex analysis task - I should delegate the mitigation strategy analysis to a specialized worker agent so I can synthesize everything into a comprehensive report.',
            },
            {
              type: 'tool_use',
              id: `toolu_${uuidv4().slice(0, 8)}`,
              name: 'delegate_to_subagent',
              input: {
                task: 'Analyze risk mitigation strategies',
                context:
                  'Q4 report identifies 4 risks: Vendor Dependency (HIGH), Staffing Gap (MEDIUM), Timeline Pressure (HIGH), Security Audit (MEDIUM). Analyze each and recommend prioritized mitigation strategies.',
              },
            },
          ],
          stop_reason: 'tool_use',
        };

      case 3:
      default:
        // Turn 4: final text synthesis
        await delay(200);
        this.activeFlow = null;
        this.turnIndex = 0;
        return {
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking:
                'I now have all the information I need: the search results, full document, and the subagent analysis of mitigation strategies. Let me synthesize this into a comprehensive risk assessment.',
            },
            {
              type: 'text',
              text: `## Q4 2025 Risk Assessment

Based on my analysis of the Q4 Project Status Report and specialized risk evaluation, here are the key findings:

### Critical Risks (Immediate Action Required)

**1. Vendor Dependency (HIGH)**
Your primary cloud vendor's pricing changes could increase infrastructure costs by **30%** starting Q1 2026. This is the highest financial impact risk.
- *Recommended action*: Begin multi-cloud evaluation immediately and negotiate a long-term contract for price lock. Estimated savings: ~$720K/year.

**2. Timeline Pressure (HIGH)**
With 23 critical bugs and the client demo on Dec 15, there's significant risk of a poor demo experience.
- *Recommended action*: Triage bugs by client-facing impact. Fix the top 10 critical bugs first and prepare fallback demo paths for known issues.

### Moderate Risks (Monitor Closely)

**3. Staffing Gap (MEDIUM)**
Two senior engineers departing with incomplete knowledge transfer on the authentication module.
- *Recommended action*: Launch a 2-week intensive knowledge transfer program with daily 1-hour pairing sessions. Cross-train 2 mid-level engineers.

**4. Security Audit (MEDIUM)**
Penetration testing on Nov 20 may uncover issues requiring architectural changes.
- *Recommended action*: Conduct pre-audit review using OWASP checklist. Reserve a 2-week remediation sprint.

### Budget Impact
- Current spend: $1.95M of $2.4M (81.25%)
- Projected overrun: $120K (5%)
- Vendor risk could add additional $720K/year if unmitigated

I've generated a structured risk assessment artifact with full details and mitigation timelines.`,
            },
          ],
          stop_reason: 'end_turn',
        };
    }
  }

  async _simpleResponse(userMessage) {
    await delay(80);
    return {
      role: 'assistant',
      content: [
        {
          type: 'thinking',
          thinking: `The user asked: "${userMessage}". I'll provide a helpful response based on what I know.`,
        },
        {
          type: 'text',
          text: `I'd be happy to help! You can ask me to analyze documents in the knowledge base. Try asking about **risks in the Q4 report** to see the full multi-agent orchestration in action, including:\n\n- Tool use (search, read, analyze)\n- Subagent delegation for parallel analysis\n- Structured artifact generation\n\nWhat would you like to explore?`,
        },
      ],
      stop_reason: 'end_turn',
    };
  }

  _getLastUserText(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user') {
        if (typeof msg.content === 'string') return msg.content;
        // If content is an array (tool results), skip it and keep looking
        if (Array.isArray(msg.content)) {
          const textBlock = msg.content.find((b) => b.type === 'text');
          if (textBlock) return textBlock.text;
          // This is a tool_result array, keep searching for actual user text
          continue;
        }
      }
    }
    return '';
  }

  _getLastAssistantContent(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].content;
    }
    return null;
  }

  _hasToolResults(messages) {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user' || !Array.isArray(last.content)) return false;
    return last.content.some((b) => b.type === 'tool_result');
  }
}

let instance = null;

function getMockAdapter() {
  if (!instance) {
    instance = new MockAnthropicAdapter();
  }
  return instance;
}

module.exports = { getMockAdapter };
