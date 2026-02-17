require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const app = require('./app');

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`AgentKit Demo running on port ${PORT}`);
  console.log(`Mode: ${process.env.DEMO_MODE === 'true' ? 'DEMO (fixtures)' : 'LIVE (Anthropic API)'}`);
});
