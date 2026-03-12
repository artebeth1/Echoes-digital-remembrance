import { LovedOne, Message } from '../types';

const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';

/**
 * Generate chat response using lovedOne data (Knowledge Base)
 * Chat.tsx loads lovedOne from Firestore, passes it here
 * @param stream - if true, streams response for better UX
 */
export async function generateChatResponse(
  lovedOne: LovedOne,
  messages: Message[],
  userInput: string,
  audioBase64?: string,
  audioMimeType?: string,
  onChunk?: (chunk: string) => void
): Promise<{ text: string; audioData?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateChatResponse',
        lovedOne,
        messages,
        userInput,
        audioBase64,
        audioMimeType,
        stream: !!onChunk, // Enable streaming if callback provided
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    // If streaming callback provided, read stream
    if (onChunk && response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      let fullText = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                onChunk(data.text);
                fullText += data.text;
              } else if (data.type === 'done') {
                return { text: data.fullText || fullText };
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE:', e);
            }
          }
        }
      }

      return { text: fullText };
    }

    // Standard response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to generate chat response:', error);
    throw error;
  }
}

/**
 * Generate the next memory interview question
 */
export async function generateNextMemoryQuestion(
  name: string,
  relationship: string,
  previousQA: { role: 'ai' | 'user'; text: string }[],
  language: string = 'English'
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/api/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateNextMemoryQuestion',
        name,
        relationship,
        previousQA,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.question || `What is another favorite memory you have of ${name}?`;
  } catch (error) {
    console.error('Failed to generate memory question:', error);
    return `Can you tell me more about ${name}?`;
  }
}

/**
 * Generate personality, memory, or tone suggestions
 */
export async function generateSuggestions(
  name: string,
  relationship: string,
  field: 'personality' | 'memories' | 'tone'
): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/api/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateSuggestions',
        name,
        relationship,
        field,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error(`Failed to generate suggestions for ${field}:`, error);
    return [];
  }
}

/**
 * Play a voice sample
 */
export async function playVoiceSample(voiceName: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'playVoiceSample',
        voiceName,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    // Voice playback handled by CreateLovedOne component
  } catch (error) {
    console.error('Failed to play voice sample:', error);
  }
}
