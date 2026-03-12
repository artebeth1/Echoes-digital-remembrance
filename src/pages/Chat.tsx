import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LovedOne, Message, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { generateChatResponse } from '../services/geminiService';
import { ArrowLeft, Send, Phone, Mic, Square, Play, Pause } from 'lucide-react';
import { motion } from 'motion/react';

function AudioPlayer({ base64Data, mimeType, isAi }: { base64Data: string, mimeType?: string, isAi: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!base64Data) return;
    
    if (!isAi) {
      setAudioUrl(`data:${mimeType || 'audio/webm'};base64,${base64Data}`);
    } else {
      // AI returns raw PCM 24kHz 16-bit mono. We need to wrap it in a WAV header.
      try {
        const binaryString = atob(base64Data);
        const pcmLength = binaryString.length;
        const buffer = new ArrayBuffer(44 + pcmLength);
        const view = new DataView(buffer);
        
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + pcmLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 24000, true);
        view.setUint32(28, 24000 * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, pcmLength, true);
        
        const pcmBytes = new Uint8Array(buffer, 44);
        for (let i = 0; i < pcmLength; i++) {
          pcmBytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(blob));
      } catch (e) {
        console.error("Failed to parse AI audio", e);
      }
    }
  }, [base64Data, isAi, mimeType]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!audioUrl) return null;

  return (
    <div className="flex items-center gap-3 mt-2 bg-black/5 rounded-full px-3 py-1.5 w-fit">
      <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-stone-700 shadow-sm">
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="h-1 w-24 bg-black/10 rounded-full overflow-hidden">
        {isPlaying && <motion.div className="h-full bg-stone-500" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2, repeat: Infinity }} />}
      </div>
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onEnded={() => setIsPlaying(false)} 
        onPause={() => setIsPlaying(false)}
        className="hidden" 
      />
    </div>
  );
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [lovedOne, setLovedOne] = useState<LovedOne | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser || !id) return;

    const fetchLovedOne = async () => {
      try {
        const docRef = doc(db, `users/${currentUser.uid}/lovedOnes/${id}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setLovedOne(snap.data() as LovedOne);
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/lovedOnes/${id}`);
      }
    };

    fetchLovedOne();

    const q = query(
      collection(db, `users/${currentUser.uid}/lovedOnes/${id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => d.data() as Message);
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/lovedOnes/${id}/messages`);
    });

    return () => unsubscribe();
  }, [currentUser, id, navigate]);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            await handleSendAudio(base64data, 'audio/webm');
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    }
  };

  const handleSendAudio = async (base64Audio: string, mimeType: string) => {
    if (!currentUser || !id || !lovedOne) return;

    setIsTyping(true);

    const userMsgId = crypto.randomUUID();
    const userMsgRef = doc(db, `users/${currentUser.uid}/lovedOnes/${id}/messages`, userMsgId);
    
    try {
      await setDoc(userMsgRef, {
        id: userMsgId,
        text: t('chat.voice_message'),
        sender: 'user',
        audioData: base64Audio,
        audioMimeType: mimeType,
        createdAt: serverTimestamp()
      });

      const { text: aiResponseText, audioData: aiAudioData } = await generateChatResponse(
        lovedOne, 
        messages, 
        t('chat.voice_message'),
        base64Audio,
        mimeType
      );

      const aiMsgId = crypto.randomUUID();
      const aiMsgRef = doc(db, `users/${currentUser.uid}/lovedOnes/${id}/messages`, aiMsgId);
      
      await setDoc(aiMsgRef, {
        id: aiMsgId,
        text: aiResponseText,
        sender: 'ai',
        audioData: aiAudioData || null,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Failed to send voice message", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser || !id || !lovedOne) return;

    const userMessageText = input.trim();
    setInput('');
    setIsTyping(true);

    const userMsgId = crypto.randomUUID();
    const userMsgRef = doc(db, `users/${currentUser.uid}/lovedOnes/${id}/messages`, userMsgId);
    
    try {
      await setDoc(userMsgRef, {
        id: userMsgId,
        text: userMessageText,
        sender: 'user',
        createdAt: serverTimestamp()
      });

      // Get AI response
      const { text: aiResponseText } = await generateChatResponse(lovedOne, messages, userMessageText);

      const aiMsgId = crypto.randomUUID();
      const aiMsgRef = doc(db, `users/${currentUser.uid}/lovedOnes/${id}/messages`, aiMsgId);
      
      await setDoc(aiMsgRef, {
        id: aiMsgId,
        text: aiResponseText,
        sender: 'ai',
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading || !lovedOne) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500">{t('chat.connecting')}</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-serif text-stone-800">{lovedOne.name}</h2>
            <p className="text-xs text-stone-500 uppercase tracking-wider">{lovedOne.relationship}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/call/${id}`)}
          className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors flex items-center gap-2"
        >
          <Phone size={20} />
          <span className="text-sm font-medium hidden sm:inline">{t('dashboard.call')}</span>
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-stone-400 my-10 italic text-sm">
            {t('chat.beginning', { name: lovedOne.name })}
          </div>
        )}
        
        {messages.map((msg, i) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                  isUser 
                    ? 'bg-stone-800 text-white rounded-br-sm' 
                    : 'bg-white border border-stone-100 text-stone-800 rounded-bl-sm'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.audioData && (
                  <AudioPlayer base64Data={msg.audioData} mimeType={msg.audioMimeType} isAi={!isUser} />
                )}
              </div>
            </motion.div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-100 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-stone-200 p-4 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
          <button 
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-full transition-colors shadow-sm flex-shrink-0 ${
              isRecording ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
            title={isRecording ? "Stop recording" : "Record voice message"}
          >
            {isRecording ? <Square size={20} className="fill-red-600" /> : <Mic size={20} />}
          </button>
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('chat.placeholder', { name: lovedOne.name })}
            className="flex-1 bg-stone-100 border-transparent focus:bg-white focus:border-amber-300 focus:ring-2 focus:ring-amber-100 rounded-full px-6 py-3 outline-none transition-all text-stone-800"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 bg-stone-800 text-white rounded-full hover:bg-stone-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}
