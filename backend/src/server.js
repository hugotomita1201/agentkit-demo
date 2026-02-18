require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const app = require('./app');

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`TomitaLaw AI Demo running on port ${PORT}`);
  console.log(`Agent: Claude Agent SDK | Model: claude-sonnet-4-6`);
  console.log(`API Key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'MISSING — set ANTHROPIC_API_KEY'}`);
});
