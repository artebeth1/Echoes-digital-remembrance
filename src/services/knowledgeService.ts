import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { LovedOne } from '../types';

/**
 * Generate Knowledge.md content from LovedOne profile
 * This is a lightweight, updatable knowledge base for the AI
 */
export function generateKnowledgeMarkdown(lovedOne: LovedOne): string {
  return `# ${lovedOne.name} - Knowledge Base

## Identity
- **Relationship:** ${lovedOne.relationship}
- **Your nickname for them:** ${lovedOne.nickname || 'Not specified'}

## Personality
${lovedOne.personality || 'No description provided'}

## Speaking Style
${lovedOne.tone || 'No tone description provided'}

## Shared Memories & Stories
${lovedOne.memories || 'No shared memories recorded yet'}

## Hobbies & Interests
${lovedOne.hobbies || 'Not specified'}

## Special Expressions
${lovedOne.expressAffection || 'Not specified'}

## Skills & Expertise
${lovedOne.skills || 'Not specified'}

## Life Lessons & Wisdom
${lovedOne.advice || 'Not specified'}
`;
}

/**
 * Store knowledge.md in Firestore for a loved one
 */
export async function saveKnowledge(userId: string, lovedOneId: string, lovedOne: LovedOne): Promise<void> {
  try {
    const knowledge = generateKnowledgeMarkdown(lovedOne);
    const knowledgeRef = doc(db, `users/${userId}/lovedOnes/${lovedOneId}/knowledge`, 'default');
    
    await setDoc(knowledgeRef, {
      content: knowledge,
      updatedAt: serverTimestamp(),
      version: 1
    });
  } catch (error) {
    console.error('Failed to save knowledge:', error);
    throw error;
  }
}

/**
 * Load knowledge.md from Firestore
 */
export async function loadKnowledge(userId: string, lovedOneId: string): Promise<string> {
  try {
    const knowledgeRef = doc(db, `users/${userId}/lovedOnes/${lovedOneId}/knowledge`, 'default');
    const knowledgeSnap = await getDoc(knowledgeRef);
    
    if (knowledgeSnap.exists()) {
      return knowledgeSnap.data().content || '';
    }
    return '';
  } catch (error) {
    console.error('Failed to load knowledge:', error);
    return '';
  }
}

/**
 * Build system prompt from knowledge.md
 */
export function buildSystemPromptFromKnowledge(name: string, knowledge: string, relationship: string): string {
  return `You are ${name}, ${relationship}.

# Your Knowledge Base
${knowledge}

## Guidelines
1. Respond as ${name} would, using their personality and speaking style
2. Reference shared memories and stories when relevant
3. Keep responses brief (1-3 sentences)
4. Be warm and genuine
5. Never mention you are an AI or this knowledge base
6. If you don't know something about ${name}, stay in character and respond naturally

Your goal is to provide comfort and maintain emotional connection.`;
}
