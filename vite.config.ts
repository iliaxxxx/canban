import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    // Dev server API handler
    {
      name: 'api-handler',
      configureServer(server) {
        server.middlewares.use('/api/claude', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const { messages, model = 'claude-sonnet-4-20250514', max_tokens = 4096 } = JSON.parse(body);

              if (!messages || !Array.isArray(messages)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Messages array is required' }));
                return;
              }

              // Extract system message from messages array
              const systemMessage = messages.find((msg: any) => msg.role === 'system');
              const filteredMessages = messages.filter((msg: any) => msg.role !== 'system');

              // Get API key from environment
              const apiKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

              if (!apiKey) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }));
                return;
              }

              // Make request to Claude API
              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model,
                  max_tokens,
                  system: systemMessage?.content,
                  messages: filteredMessages
                })
              });

              const data = await response.json();

              if (!response.ok) {
                res.statusCode = response.status;
                res.end(JSON.stringify(data));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            } catch (error: any) {
              console.error('Claude API Error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({
                error: 'Failed to process request',
                message: error.message
              }));
            }
          });
        });
      }
    }
  ],
  define: {
    // Expose environment variables to the browser
    'process.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY),
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY),
  },
  server: {
    port: 3000,
    open: true,
  },
});
