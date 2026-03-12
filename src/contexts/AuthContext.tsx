import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { OperationType } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  isAuthReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

async function syncUserToFirestore(user: FirebaseUser) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error syncing user to Firestore:", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) await syncUserToFirestore(user);
      setCurrentUser(user);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await syncUserToFirestore(result.user);
    } catch (error: any) {
      console.error("Signup failed:", error);
      throw new Error(error.message || 'Signup failed');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUserToFirestore(result.user);
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error("Password reset failed:", error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthReady, login, signup, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}
