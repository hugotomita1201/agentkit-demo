const express = require('express');
const { v4: uuidv4 } = require('uuid');
const chatOrchestrator = require('../services/chatOrchestrator');

const router = express.Router();

// In-memory session store
const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  const id = sessionId || uuidv4();
  const session = { id, messages: [], createdAt: Date.now() };
  sessions.set(id, session);
  return session;
}

router.post('/stream', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required and must be a string' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const session = getOrCreateSession(sessionId);

  // Emit session ID so the client can track it
  const emit = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  emit({ type: 'session', sessionId: session.id });

  try {
    await chatOrchestrator.run(message, session, emit);
  } catch (err) {
    console.error('Stream error:', err);
    emit({ type: 'error', message: err.message });
  }

  res.end();
});

module.exports = router;
