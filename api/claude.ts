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
  console.log('🌐 API endpoint /api/claude вызван');
  console.log('Method:', req.method);

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('❌ Неправильный метод:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'claude-sonnet-4-20250514', max_tokens = 4096 } = req.body;

    console.log('📨 Получен запрос:', {
      model,
      max_tokens,
      messagesCount: messages?.length
    });

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Некорректные messages');
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Extract system message from messages array
    const systemMessage = messages.find((msg: any) => msg.role === 'system');
    const filteredMessages = messages.filter((msg: any) => msg.role !== 'system');

    console.log('🔧 System message:', systemMessage ? 'Есть' : 'Нет');
    console.log('💬 Filtered messages:', filteredMessages.length);

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY не установлен!');
      return res.status(500).json({
        error: 'API key not configured',
        message: 'ANTHROPIC_API_KEY environment variable is missing'
      });
    }

    console.log('🔑 API Key найден');

    // Prepare API request parameters
    const apiParams: any = {
      model,
      max_tokens,
      messages: filteredMessages,
    };

    // Add system parameter if system message exists
    if (systemMessage?.content) {
      apiParams.system = systemMessage.content;
    }

    console.log('📤 Отправляю запрос к Anthropic API...');

    // Make request to Claude API
    const response = await anthropic.messages.create(apiParams);

    console.log('✅ Получен ответ от Anthropic:', {
      id: response.id,
      model: response.model,
      contentLength: response.content?.[0]?.text?.length || 0
    });

    // Return the response
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Claude API Error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.type
    });

    return res.status(500).json({
      error: 'Failed to process request',
      message: error.message,
      type: error.type || 'unknown'
    });
  }
}
