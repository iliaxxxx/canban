import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'claude-sonnet-4-20250514', max_tokens = 4096 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Make request to Claude API
    const response = await anthropic.messages.create({
      model,
      max_tokens,
      messages,
    });

    // Return the response
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Claude API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message 
    });
  }
}
