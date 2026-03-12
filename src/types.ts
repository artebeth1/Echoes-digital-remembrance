export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: any;
}

export interface LovedOne {
  id: string;
  name: string;
  relationship: string;
  personality: string;
  memories: string;
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  tone: string;
  createdAt: any;

  // Identity
  age?: string;
  gender?: string;
  sexualOrientation?: string;
  ethnicity?: string;
  nationality?: string;
  nickname?: string;
  language?: string;

  // Social Role
  occupation?: string;
  socialStatus?: string;
  salary?: string;

  // Backstory & Skills
  childhood?: string;
  beliefChanges?: string;
  specialAbilities?: string;
  skills?: string;

  // Personality & Interaction
  mbti?: string;
  hobbies?: string;
  expressAffection?: string;
  catchphrase?: string;

  // Shared Memories
  scenarioResponses?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}
