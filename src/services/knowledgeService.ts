import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { LovedOne } from '../types';

/**
 * Load lovedOne data from Firestore (Knowledge Base)
 */
export async function loadLovedOneFromKnowledge(userId: string, lovedOneId: string): Promise<LovedOne | null> {
  try {
    const docRef = doc(db, `users/${userId}/lovedOnes/${lovedOneId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as LovedOne;
    }
    return null;
  } catch (error) {
    console.error('Failed to load knowledge:', error);
    throw error;
  }
}

/**
 * Save lovedOne data to Firestore (Knowledge Base)
 * Can be used to update character info
 */
export async function saveLovedOneToKnowledge(userId: string, lovedOneId: string, lovedOne: LovedOne): Promise<void> {
  try {
    const docRef = doc(db, `users/${userId}/lovedOnes/${lovedOneId}`);
    await setDoc(docRef, {
      ...lovedOne,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to save knowledge:', error);
    throw error;
  }
}
