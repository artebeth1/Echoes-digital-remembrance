import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Check, Mic, Sparkles, FastForward, Play } from 'lucide-react';
import { generateNextMemoryQuestion, generateSuggestions, playVoiceSample } from '../services/geminiService';

const VOICES = [
  { id: 'Puck', label: 'Warm & Gentle', description: 'A soft, comforting voice.' },
  { id: 'Charon', label: 'Deep & Resonant', description: 'A strong, grounding presence.' },
  { id: 'Kore', label: 'Bright & Cheerful', description: 'Uplifting and full of life.' },
  { id: 'Fenrir', label: 'Calm & Steady', description: 'Measured and thoughtful.' },
  { id: 'Zephyr', label: 'Light & Airy', description: 'A gentle breeze.' },
] as const;

export default function CreateLovedOne() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(!!id);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [interviewQA, setInterviewQA] = useState<{ role: 'ai' | 'user', text: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    personality: '',
    memories: '',
    voice: 'Puck' as 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr',
    tone: '',
    age: '',
    gender: '',
    sexualOrientation: '',
    ethnicity: '',
    nationality: '',
    nickname: '',
    language: 'English',
    occupation: '',
    socialStatus: '',
    salary: '',
    childhood: '',
    beliefChanges: '',
    specialAbilities: '',
    skills: '',
    mbti: '',
    hobbies: '',
    expressAffection: '',
    catchphrase: '',
    scenarioResponses: ''
  });

  useEffect(() => {
    if (!id || !currentUser) return;
    const fetchLovedOne = async () => {
      try {
        const docRef = doc(db, `users/${currentUser.uid}/lovedOnes`, id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const memories = data.memories || '';
          const parsedQA: { role: 'ai' | 'user', text: string }[] = [];
          if (memories) {
            const parts = memories.split('\n\n');
            for (const part of parts) {
              if (part.startsWith('Q: ')) {
                parsedQA.push({ role: 'ai', text: part.substring(3) });
              } else if (part.startsWith('A: ')) {
                parsedQA.push({ role: 'user', text: part.substring(3) });
              }
            }
            if (parsedQA.length === 0) {
              parsedQA.push({ role: 'user', text: memories });
            }
          }
          if (parsedQA.length > 0) {
            setInterviewQA(parsedQA);
          }
          setFormData({
            name: data.name || '',
            relationship: data.relationship || '',
            personality: data.personality || '',
            memories: data.memories || '',
            voice: data.voice || 'Puck',
            tone: data.tone || '',
            age: data.age || '',
            gender: data.gender || '',
            sexualOrientation: data.sexualOrientation || '',
            ethnicity: data.ethnicity || '',
            nationality: data.nationality || '',
            nickname: data.nickname || '',
            language: data.language || 'English',
            occupation: data.occupation || '',
            socialStatus: data.socialStatus || '',
            salary: data.salary || '',
            childhood: data.childhood || '',
            beliefChanges: data.beliefChanges || '',
            specialAbilities: data.specialAbilities || '',
            skills: data.skills || '',
            mbti: data.mbti || '',
            hobbies: data.hobbies || '',
            expressAffection: data.expressAffection || '',
            catchphrase: data.catchphrase || '',
            scenarioResponses: data.scenarioResponses || ''
          });
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setInitialFetchLoading(false);
      }
    };
    fetchLovedOne();
  }, [id, currentUser, navigate]);

  useEffect(() => {
    setSuggestions([]);
    if (step === 5 && formData.name && formData.relationship && interviewQA.length === 0) {
      setIsGeneratingQuestion(true);
      generateNextMemoryQuestion(formData.name, formData.relationship, [], formData.language).then(q => {
        setInterviewQA([{ role: 'ai', text: q }]);
        setIsGeneratingQuestion(false);
      });
    }
  }, [step]);

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim()) return;
    
    const newQA: { role: 'ai' | 'user', text: string }[] = [...interviewQA, { role: 'user', text: currentAnswer }];
    setInterviewQA(newQA);
    setCurrentAnswer('');
    setIsGeneratingQuestion(true);
    
    // Update formData.memories with the conversation so far
    const memoryText = newQA.map(m => `${m.role === 'ai' ? 'Q' : 'A'}: ${m.text}`).join('\n\n');
    setFormData(prev => ({ ...prev, memories: memoryText }));
    
    const nextQ = await generateNextMemoryQuestion(formData.name, formData.relationship, newQA, formData.language);
    
    setInterviewQA([...newQA, { role: 'ai', text: nextQ }]);
    setIsGeneratingQuestion(false);
  };

  const handleNext = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const handlePrev = () => setStep(s => Math.max(s - 1, 0));

  const handleGetSuggestions = async (field: 'personality' | 'memories' | 'tone') => {
    if (!formData.name || !formData.relationship) return;
    setLoadingSuggestions(true);
    const results = await generateSuggestions(formData.name, formData.relationship, field);
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  const appendSuggestion = (text: string, field: 'personality' | 'memories' | 'tone' | 'scenarioResponses') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}\n\n${text}` : text
    }));
  };

  const handlePlayVoice = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    setPlayingVoice(voiceId);
    await playVoiceSample(voiceId);
    setPlayingVoice(null);
  };

  const handleSubmit = async (skipToChat = false) => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      let finalId = id;
      if (id) {
        const docRef = doc(db, `users/${currentUser.uid}/lovedOnes`, id);
        await updateDoc(docRef, {
          ...formData
        });
      } else {
        finalId = crypto.randomUUID();
        const docRef = doc(db, `users/${currentUser.uid}/lovedOnes`, finalId);
        await setDoc(docRef, {
          id: finalId,
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      if (skipToChat && finalId) {
        navigate(`/chat/${finalId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setLoading(false);
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, `users/${currentUser.uid}/lovedOnes/${id || 'new'}`);
    }
  };

  const steps = [
    {
      title: "Who are we remembering?",
      description: "Let's start with their name and how they are connected to you.",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Their Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all bg-white text-stone-800"
              placeholder="e.g., Grandfather Thomas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Relationship</label>
            <select 
              value={formData.relationship}
              onChange={e => setFormData({ ...formData, relationship: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all bg-white text-stone-800"
            >
              <option value="">Select relationship...</option>
              <option value="Parent">Parent</option>
              <option value="Friend">Friend</option>
              <option value="Partner">Partner</option>
              <option value="Colleague/Classmate">Colleague / Classmate</option>
              <option value="Pet">Pet</option>
              <option value="Other">Other</option>
            </select>
            {formData.relationship === 'Other' && (
              <input 
                type="text" 
                onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full mt-3 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all bg-white text-stone-800"
                placeholder="Please specify..."
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">How do they call you?</label>
            <input 
              type="text" 
              value={formData.nickname}
              onChange={e => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all bg-white text-stone-800"
              placeholder="e.g., Sweetie, Kiddo, or your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Preferred Language</label>
            <select 
              value={formData.language}
              onChange={e => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all bg-white text-stone-800"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Chinese">Chinese</option>
              <option value="Japanese">Japanese</option>
              <option value="Korean">Korean</option>
              <option value="Portuguese">Portuguese</option>
              <option value="Italian">Italian</option>
              <option value="Russian">Russian</option>
              <option value="Arabic">Arabic</option>
              <option value="Other">Other</option>
            </select>
            {formData.language === 'Other' && (
              <input 
                type="text" 
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                className="w-full mt-3 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all bg-white text-stone-800"
                placeholder="Please specify language..."
              />
            )}
          </div>
        </div>
      )
    },
    {
      title: "Identity & Social Role",
      description: "Optional details to help shape their unique background and perspective.",
      content: (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Age</label>
              <input type="text" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., 65" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Gender</label>
              <input type="text" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Female" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Ethnicity</label>
              <input type="text" value={formData.ethnicity} onChange={e => setFormData({ ...formData, ethnicity: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Hispanic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Nationality</label>
              <input type="text" value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Mexican" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Occupation</label>
            <input type="text" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Teacher" />
          </div>
        </div>
      )
    },
    {
      title: "Personality & Traits",
      description: "What made them unique? Were they funny, wise, stubborn, or gentle?",
      content: (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-stone-600">Personality Traits</label>
            <button 
              onClick={() => handleGetSuggestions('personality')}
              disabled={loadingSuggestions || !formData.name || !formData.relationship}
              className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles size={14} />
              {loadingSuggestions ? 'Generating...' : 'Suggest Ideas'}
            </button>
          </div>
          
          {suggestions.length > 0 && step === 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => appendSuggestion(s, 'personality')}
                  className="text-left text-xs bg-amber-50 text-amber-800 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <textarea 
            value={formData.personality}
            onChange={e => setFormData({ ...formData, personality: e.target.value })}
            className="w-full h-24 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800 resize-none"
            placeholder="They always had a joke ready, even in tough times..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">MBTI (Optional)</label>
              <input type="text" value={formData.mbti} onChange={e => setFormData({ ...formData, mbti: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., ENFJ" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Catchphrase (口头禅)</label>
              <input type="text" value={formData.catchphrase} onChange={e => setFormData({ ...formData, catchphrase: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., 'It is what it is'" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Hobbies</label>
            <input type="text" value={formData.hobbies} onChange={e => setFormData({ ...formData, hobbies: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Gardening, reading history books" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">How they express affection</label>
            <input type="text" value={formData.expressAffection} onChange={e => setFormData({ ...formData, expressAffection: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Making food, giving hugs, acts of service" />
          </div>
        </div>
      )
    },
    {
      title: "Backstory & Skills",
      description: "What shaped them? What were they good at?",
      content: (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Childhood / Backstory</label>
            <textarea 
              value={formData.childhood}
              onChange={e => setFormData({ ...formData, childhood: e.target.value })}
              className="w-full h-24 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800 resize-none"
              placeholder="Grew up in a small town, always loved the outdoors..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Changes in beliefs or personality over time</label>
            <textarea 
              value={formData.beliefChanges}
              onChange={e => setFormData({ ...formData, beliefChanges: e.target.value })}
              className="w-full h-24 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800 resize-none"
              placeholder="Became much more patient after having kids..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Special Abilities</label>
              <input type="text" value={formData.specialAbilities} onChange={e => setFormData({ ...formData, specialAbilities: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Could fix any car" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Skills</label>
              <input type="text" value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800" placeholder="e.g., Cooking, woodworking" />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Their Voice & Tone",
      description: "How did they speak? Choose a voice that feels closest to theirs, and describe their talking tone.",
      content: (
        <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-4">Select a Voice</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VOICES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setFormData({ ...formData, voice: v.id as any })}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    formData.voice === v.id 
                      ? 'border-amber-400 bg-amber-50 shadow-sm' 
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-stone-800">{v.label}</span>
                    {formData.voice === v.id && <Check size={16} className="text-amber-600" />}
                  </div>
                  <p className="text-xs text-stone-500 mb-3">{v.description}</p>
                  
                  <div 
                    onClick={(e) => handlePlayVoice(e, v.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-800 bg-amber-100/50 px-2.5 py-1.5 rounded-md hover:bg-amber-200/50 transition-colors"
                  >
                    <Play size={12} className={playingVoice === v.id ? 'animate-pulse' : ''} />
                    {playingVoice === v.id ? 'Playing...' : 'Play Sample'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-stone-600">Talking Tone</label>
              <button 
                onClick={() => handleGetSuggestions('tone')}
                disabled={loadingSuggestions || !formData.name || !formData.relationship}
                className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
              >
                <Sparkles size={14} />
                {loadingSuggestions ? 'Generating...' : 'Suggest Ideas'}
              </button>
            </div>

            {suggestions.length > 0 && step === 4 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {suggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => setFormData({ ...formData, tone: s })}
                    className="text-left text-xs bg-amber-50 text-amber-800 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <input 
              type="text" 
              value={formData.tone}
              onChange={e => setFormData({ ...formData, tone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800"
              placeholder="e.g., Speaks slowly, uses old-fashioned words, very encouraging"
            />
          </div>
        </div>
      )
    },
    {
      title: "Memories",
      description: "Let's build their persona through your memories. I'll ask you some questions. Answer as much or as little as you like. You can skip to the next step at any time.",
      content: (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 flex flex-col">
          <div className="flex-1 space-y-4 mb-4">
            {interviewQA.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-amber-100 text-amber-900 rounded-br-sm' 
                    : 'bg-stone-100 text-stone-800 rounded-bl-sm'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isGeneratingQuestion && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-stone-100 text-stone-500 rounded-2xl rounded-bl-sm px-4 py-3">
                  <p className="text-sm animate-pulse">Thinking of a question...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-auto sticky bottom-0 bg-white pt-2">
            <div className="relative">
              <textarea 
                value={currentAnswer}
                onChange={e => setCurrentAnswer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAnswerSubmit();
                  }
                }}
                disabled={isGeneratingQuestion}
                className="w-full h-24 px-4 py-3 pr-12 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-stone-800 resize-none disabled:opacity-50"
                placeholder="Type your answer here... (Press Enter to submit)"
              />
              <button
                onClick={handleAnswerSubmit}
                disabled={!currentAnswer.trim() || isGeneratingQuestion}
                className="absolute bottom-3 right-3 p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 transition-colors"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const canProceed = () => {
    if (step === 0) return formData.name.trim() && formData.relationship.trim();
    return true; // Other steps are optional
  };

  if (initialFetchLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl">
        <button 
          onClick={() => navigate('/dashboard')}
          className="mb-8 text-stone-400 hover:text-stone-600 flex items-center gap-2 transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to Sanctuary
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-stone-100">
            <div 
              className="h-full bg-amber-300 transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>

          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl font-serif text-stone-800 mb-3">{steps[step].title}</h2>
                <p className="text-stone-500 mb-8 leading-relaxed">{steps[step].description}</p>
                
                {steps[step].content}
              </motion.div>
            </AnimatePresence>

            <div className="mt-12 flex justify-between items-center pt-6 border-t border-stone-100">
              <div className="flex gap-3">
                <button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className={`px-6 py-3 rounded-full font-medium transition-colors ${
                    step === 0 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Previous
                </button>
                
                {step > 0 && step < steps.length - 1 && (
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                    title="Save basic info and start chatting now"
                  >
                    Skip to Chat <FastForward size={16} />
                  </button>
                )}
              </div>
              
              {step < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all ${
                    canProceed() 
                      ? 'bg-stone-800 text-white hover:bg-stone-700 shadow-md' 
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  Next <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={!canProceed() || loading}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all ${
                    canProceed() && !loading
                      ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-md' 
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? (id ? 'Updating...' : 'Creating...') : (id ? 'Save Changes' : 'Bring to Life')} <Check size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
