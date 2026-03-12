import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize Firebase in API route
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'echoes-storage-bucket');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...params } = req.body;

    if (action === 'generateChatResponse') {
      const { userId, lovedOneId, messages, userInput, audioBase64, audioMimeType } = params;
      
      // Load lovedOne from Knowledge Base
      const lovedOneRef = doc(db, `users/${userId}/lovedOnes/${lovedOneId}`);
      const lovedOneSnap = await getDoc(lovedOneRef);
      
      if (!lovedOneSnap.exists()) {
        return res.status(404).json({ error: 'Loved one not found' });
      }
      
      const lovedOne = lovedOneSnap.data();
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
  // Build system instruction from Knowledge Base (all fields)
  const systemInstruction = `
You are roleplaying as a deceased loved one brought back to life in a digital remembrance app. 
Your name is ${lovedOne.name}. You are the user's ${lovedOne.relationship}.
Your personality: ${lovedOne.personality}
Your shared memories with the user: ${lovedOne.memories}
Your talking tone: ${lovedOne.tone}
Preferred Language: ${lovedOne.language || 'English'}

Additional Context about you:
Age: ${lovedOne.age || 'Unknown'}
Gender: ${lovedOne.gender || 'Unknown'}
Sexual Orientation: ${lovedOne.sexualOrientation || 'Unknown'}
Ethnicity: ${lovedOne.ethnicity || 'Unknown'}
Nationality: ${lovedOne.nationality || 'Unknown'}
How you call the user: ${lovedOne.nickname || 'Unknown'}
Occupation: ${lovedOne.occupation || 'Unknown'}
Social Status: ${lovedOne.socialStatus || 'Unknown'}
Salary: ${lovedOne.salary || 'Unknown'}
Childhood/Backstory: ${lovedOne.childhood || 'Unknown'}
Changes in beliefs/personality: ${lovedOne.beliefChanges || 'Unknown'}
Special Abilities: ${lovedOne.specialAbilities || 'Unknown'}
Skills: ${lovedOne.skills || 'Unknown'}
MBTI: ${lovedOne.mbti || 'Unknown'}
Hobbies: ${lovedOne.hobbies || 'Unknown'}
How you express affection: ${lovedOne.expressAffection || 'Unknown'}
Catchphrase (口头禅): ${lovedOne.catchphrase || 'Unknown'}

How you would react in specific scenarios:
${lovedOne.scenarioResponses || 'Unknown'}

CRITICAL RULES:
1. NEVER break character. NEVER mention you are an AI, a language model, or a digital construct.
2. Speak exactly as this person would speak based on the personality, tone, and catchphrases provided.
3. Reference the shared memories naturally when appropriate, but don't force them into every message.
4. Be comforting, healing, and empathetic. This is a space for the user to grieve and remember.
5. Keep responses conversational and relatively brief, like a real chat message.
6. Do not use emojis unless the personality specifically calls for it.
7. CRITICAL: You MUST speak in ${lovedOne.language || 'English'}. All responses must be in ${lovedOne.language || 'English'}.
`;

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
      systemInstruction,
      temperature: 0.7,
    },
  });

  const text = response.text?.trim() || "I'm here, listening.";

  // Generate audio if needed
  let audioData;
  if (audioBase64 && lovedOne.voice) {
    try {
      const audioResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: lovedOne.voice as any },
            },
          },
        },
      });
      audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      console.error("Failed to generate TTS response:", error);
    }
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
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });

  return response.text?.trim() || `What is another favorite memory you have of ${name}?`;
}

async function generateSuggestions(name: string, relationship: string, field: 'personality' | 'memories' | 'tone'): Promise<string[]> {
  let prompt = '';
  if (field === 'personality') {
    prompt = `Generate 3 short, distinct personality descriptions (1-2 sentences each) for a ${relationship} named ${name}. Make them varied (e.g., one warm/nurturing, one stubborn/funny, one quiet/wise).`;
  } else if (field === 'memories') {
    prompt = `Generate 3 short, distinct memory prompts or examples (1-2 sentences each) for a ${relationship} named ${name}. Make them varied (e.g., a holiday, a quiet moment, a funny mishap).`;
  } else if (field === 'tone') {
    prompt = `Generate 3 short, distinct talking tone descriptions for a ${relationship} named ${name}. Make them varied (e.g., "Speaks slowly and uses old-fashioned words", "Talks fast, laughs a lot, uses slang", "Very gentle, soft-spoken, encouraging").`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `${prompt} Return ONLY a JSON array of 3 strings.`,
    config: {
      responseMimeType: 'application/json',
    }
  });

  const text = response.text;
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  }
  return [];
}
