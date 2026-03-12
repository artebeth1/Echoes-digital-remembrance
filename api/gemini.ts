import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { buildSystemPromptFromLovedOne } from './knowledgeService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...params } = req.body;

    if (action === 'generateChatResponse') {
      const { lovedOne, messages, userInput, audioBase64, audioMimeType } = params;
      const response = await generateChatResponse(lovedOne, messages, userInput, audioBase64, audioMimeType);
      return res.status(200).json(response);
    }

    if (action === 'generateNextMemoryQuestion') {
      const { name, relationship, previousQA, language } = params;
      const question = await generateNextMemoryQuestion(name, relationship, previousQA, language);
      return res.status(200).json({ question });
    }

    if (action === 'generateSuggestions') {
      const { name, relationship, field } = params;
      const suggestions = await generateSuggestions(name, relationship, field);
      return res.status(200).json({ suggestions });
    }

    if (action === 'playVoiceSample') {
      const { voiceName } = params;
      const audioData = await playVoiceSample(voiceName);
      return res.status(200).json({ audioData });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function generateChatResponse(
  lovedOne: any,
  messages: any[],
  userInput: string,
  audioBase64?: string,
  audioMimeType?: string
): Promise<{ text: string; audioData?: string }> {
  // Build system prompt with full LovedOne details (original style)
  const systemPrompt = buildSystemPromptFromLovedOne(lovedOne);
  
  const historyText = messages.map((m: any) => `${m.sender === 'user' ? 'User' : lovedOne.name}: ${m.text}`).join('\n');
  
  const prompt = historyText 
    ? `Here is the recent chat history:\n${historyText}\n\nUser: ${userInput}\n${lovedOne.name}:`
    : userInput;

  const contents: any[] = [];
  if (audioBase64 && audioMimeType) {
    contents.push({
      parts: [
        {
          inlineData: {
            data: audioBase64,
            mimeType: audioMimeType
          }
        },
        { text: prompt }
      ]
    });
  } else {
    contents.push({
      parts: [{ text: prompt }]
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 200,
    },
  });

  const text = response.text?.trim() || "I'm here, thinking of you.";

  // Optionally generate audio (if needed)
  let audioData;
  if (userInput) {
    audioData = await generateAudio(text);
  }

  return { text, audioData };
}

async function generateNextMemoryQuestion(
  name: string,
  relationship: string,
  previousQA: { role: 'ai' | 'user'; text: string }[],
  language: string = 'English'
): Promise<string> {
  const systemInstruction = `You are an empathetic interviewer helping a user remember their deceased ${relationship} named ${name}.
Your goal is to ask ONE thoughtful, open-ended question at a time to elicit specific memories, personality quirks, and scenarios.
If this is the first question, ask a broad but engaging question like "What did a typical day with ${name} look like?" or "What is a memory with ${name} that always makes you smile?"
If there is previous conversation, base your next question on the user's last answer to dig deeper into the details. However, if the current memory feels well-explored (e.g., after 2-3 follow-up questions on the same topic) or if the user's answer is brief and conclusive, gently pivot to ask a question from another direction (e.g., a different time period, a specific hobby, how they reacted in a certain situation, or what they taught the user).
Keep your questions conversational, warm, and relatively brief. Do not be overly dramatic.
CRITICAL: You MUST conduct the interview in ${language}. All questions must be in ${language}.
Return ONLY the question text.`;

  const historyText = previousQA.map(m => `${m.role === 'user' ? 'User' : 'Interviewer'}: ${m.text}`).join('\n');

  const prompt = historyText
    ? `Here is the conversation so far:\n${historyText}\n\nBased on the conversation, either ask a logical follow-up question to dig deeper into the current memory, or if the topic is well-explored, pivot to a new direction to gather different aspects of their personality and memories. Return ONLY the question.`
    : `Ask the first question to start the memory gathering process.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    systemInstruction,
    config: {
      temperature: 0.7,
    },
  });

  return response.text?.trim() || `What is another favorite memory you have of ${name}?`;
}

async function generateSuggestions(
  name: string,
  relationship: string,
  field: 'personality' | 'memories' | 'tone'
): Promise<string[]> {
  let prompt = '';
  if (field === 'personality') {
    prompt = `Generate 3 short, distinct personality descriptions (1-2 sentences each) for a ${relationship} named ${name}. Make them varied (e.g., one warm/nurturing, one stubborn/funny, one quiet/wise).`;
  } else if (field === 'memories') {
    prompt = `Generate 3 short, distinct memory prompts or examples (1-2 sentences each) for a ${relationship} named ${name}. Make them varied (e.g., a holiday, a quiet moment, a funny mishap).`;
  } else if (field === 'tone') {
    prompt = `Generate 3 short, distinct talking tone descriptions for a ${relationship} named ${name}. Make them varied (e.g., "Speaks slowly and uses old-fashioned words", "Talks fast, laughs a lot, uses slang", "Very gentle, soft-spoken, encouraging").`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${prompt} Return ONLY a JSON array of 3 strings.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
      },
    },
  });

  const text = response.text;
  if (text) {
    return JSON.parse(text);
  }
  return [];
}

async function playVoiceSample(voiceName: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: `Hello, my name is ${voiceName}. This is how I sound. Nice to meet you.`,
    config: {
      speechConfig: {
        voiceName: voiceName,
      },
    },
  });

  const audioData = response.audio?.data || '';
  return audioData;
}

async function generateAudio(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: text,
  });

  return response.audio?.data || '';
}


