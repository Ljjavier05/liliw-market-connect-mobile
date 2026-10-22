import api from './api';

/**
 * Send message to Liliw Market Connect AI Assistant
 * @param {string} message - User query
 * @param {string} language - 'tl' | 'en'
 * @returns {Promise<{ reply: string, cached?: boolean, error?: string }>}
 */
export async function sendAIChatMessage(message, language = 'tl') {
  const res = await api.post('/ai/chat', {
    message: String(message || '').trim(),
    language: language || 'tl',
  });
  return res.data;
}
