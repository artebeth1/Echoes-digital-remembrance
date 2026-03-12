import { LovedOne, Message } from '../types';

const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';

/**
 * Generate a chat response by calling the backend API
 * API Key is managed server-side for security
 */
export async function generateChatResponse(
  lovedOne: LovedOne,
  messages: Message[],
  userInput: string,
  audioBase64?: string,
  audioMimeType?: string
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
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

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
export async function playVoiceSample(voiceName: string): Promise<string> {
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

    const data = await response.json();
    return data.audioData || '';
  } catch (error) {
    console.error('Failed to play voice sample:', error);
    return '';
  }
}
