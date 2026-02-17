const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const chatRoutes = require('./routes/chat');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'live',
  });
});

// API routes
app.use('/api/chat', chatRoutes);

// Serve frontend static files
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for any unmatched route
app.get('*', (_req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
