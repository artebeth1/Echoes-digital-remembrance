import { GoogleGenAI, Type } from '@google/genai';
import { LovedOne, Message } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateNextMemoryQuestion(
  name: string, 
  relationship: string, 
  previousQA: { role: 'ai' | 'user', text: string }[],
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text?.trim() || `What is another favorite memory you have of ${name}?`;
  } catch (error) {
    console.error("Failed to generate next memory question:", error);
    return `Can you tell me more about your time with ${name}?`;
  }
}

export async function generateSuggestions(name: string, relationship: string, field: 'personality' | 'memories' | 'tone'): Promise<string[]> {
  try {
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
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    console.error(`Failed to generate suggestions for ${field}:`, error);
  }
  return [];
}

export async function playVoiceSample(voiceName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: 'Hello there. I am so glad we can talk again. I have missed you.' }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName as any },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = audioContext.createBuffer(1, bytes.length / 2, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(bytes.buffer);
      
      for (let i = 0; i < bytes.length / 2; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }
  } catch (error) {
    console.error("Failed to play voice sample:", error);
  }
}

export async function generateChatResponse(
  lovedOne: LovedOne,
  chatHistory: Message[],
  newMessage: string,
  base64Audio?: string,
  mimeType?: string
): Promise<{ text: string, audioData?: string }> {
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

  const historyText = chatHistory.map(m => `${m.sender === 'user' ? 'User' : lovedOne.name}: ${m.text}`).join('\n');
  
  const prompt = historyText 
    ? `Here is the recent chat history:\n${historyText}\n\nUser: ${newMessage}\n${lovedOne.name}:`
    : newMessage;

  const contents: any[] = [];
  if (base64Audio && mimeType) {
    contents.push({
      parts: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType
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
    }
  });

  const text = response.text || "I'm here, listening.";
  
  // Generate audio response if the user sent audio
  let audioData: string | undefined;
  if (base64Audio && lovedOne.voice) {
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
