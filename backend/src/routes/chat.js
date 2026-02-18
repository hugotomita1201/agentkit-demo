const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getAgentService } = require('../services/agentService');

const router = express.Router();

/**
 * POST /api/chat/stream
 *
 * Send a message and receive streaming SSE events.
 * Body: { message: string, sessionId?: string }
 *
 * SSE event types:
 *   session        — { sessionId }
 *   text_delta     — { content }
 *   artifact_start — { artifactType, title }
 *   artifact_delta — { text }
 *   artifact_end   — { content, artifactType }
 *   tool_executing — { tool, input }
 *   tool_result    — { tool }
 *   thinking       — { content }
 *   complete       — { tokenUsage }
 *   error          — { message }
 *   end            — stream finished
 */
router.post('/stream', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required and must be a string' });
  }

  const effectiveSessionId = sessionId || uuidv4();

  // Emit session ID before streaming starts (not SSE format yet — this is sent
  // as the first SSE event inside streamChat via the generator)
  const agentService = getAgentService();

  // SSE headers are set by streamChat — we just need to forward session info
  // by wrapping the generator call
  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send session ID as first event
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId: effectiveSessionId })}\n\n`);

    // Stream chat — agentService.streamChat sets its own headers,
    // but since we already set them, we call the generator directly
    for await (const event of agentService.chat(message, { sessionId: effectiveSessionId })) {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (e) {
        console.log('[SSE] Write failed — client likely disconnected');
        break;
      }
    }
  } catch (err) {
    console.error('[Chat] Stream error:', err);
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    } catch (e) { /* client disconnected */ }
  }

  try {
    res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
  } catch (e) { /* client disconnected */ }
  res.end();
});

module.exports = router;
