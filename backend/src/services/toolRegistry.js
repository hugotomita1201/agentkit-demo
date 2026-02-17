const fixtures = require('../data/demo-fixtures.json');

class ToolRegistry {
  constructor() {
    this.handlers = new Map();
    this._registerBuiltins();
  }

  register(name, handler) {
    this.handlers.set(name, handler);
  }

  async execute(name, input) {
    const handler = this.handlers.get(name);
    if (!handler) {
      return { error: `Unknown tool: ${name}` };
    }
    try {
      return await handler(input);
    } catch (err) {
      return { error: err.message };
    }
  }

  _registerBuiltins() {
    this.register('search_knowledge', (input) => {
      const query = (input.query || '').toLowerCase();
      const results = fixtures.documents
        .filter((doc) => {
          const haystack = `${doc.title} ${doc.content}`.toLowerCase();
          // Simple word-level fuzzy match: every query word must appear somewhere
          const words = query.split(/\s+/).filter(Boolean);
          return words.some((w) => haystack.includes(w));
        })
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          relevance: query.split(/\s+/).filter((w) => `${doc.title} ${doc.content}`.toLowerCase().includes(w)).length / Math.max(query.split(/\s+/).length, 1),
          snippet: doc.content.substring(0, 200) + '...',
        }))
        .sort((a, b) => b.relevance - a.relevance);

      return { query: input.query, results };
    });

    this.register('read_document', (input) => {
      const doc = fixtures.documents.find((d) => d.id === input.documentId);
      if (!doc) {
        return { error: `Document not found: ${input.documentId}` };
      }
      return { id: doc.id, title: doc.title, content: doc.content };
    });

    this.register('analyze_document', (input) => {
      const doc = fixtures.documents.find((d) => d.id === input.documentId);
      if (!doc) {
        return { error: `Document not found: ${input.documentId}` };
      }

      // Extract key points by looking for markdown headers and list items
      const lines = doc.content.split('\n');
      const keyPoints = [];
      const risks = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          keyPoints.push(trimmed.replace(/^[-*]\s+/, ''));
        }
        if (/\*\*.*\(HIGH\)\*\*/.test(trimmed)) {
          risks.push(trimmed);
        } else if (/\*\*.*\(MEDIUM\)\*\*/.test(trimmed)) {
          risks.push(trimmed);
        }
      }

      return {
        documentId: input.documentId,
        title: doc.title,
        focus: input.focus || 'general',
        keyPoints: keyPoints.slice(0, 10),
        risks,
        wordCount: doc.content.split(/\s+/).length,
      };
    });
  }
}

module.exports = new ToolRegistry();
