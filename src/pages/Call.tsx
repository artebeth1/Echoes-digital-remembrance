import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LovedOne, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { PhoneOff, Phone, Mic, MicOff, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function Call() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [lovedOne, setLovedOne] = useState<LovedOne | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Playback queue
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

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
      } catch (err) {
        setError(t('call.error_loading'));
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/lovedOnes/${id}`);
      }
    };

    fetchLovedOne();

    return () => {
      endCall();
    };
  }, [currentUser, id, navigate, t]);

  const startCall = async () => {
    if (!lovedOne) return;
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Setup Web Audio API
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode for raw PCM extraction (deprecated but widely supported for this use case)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      const systemInstruction = `
You are roleplaying as a deceased loved one brought back to life in a digital remembrance app. 
Your name is ${lovedOne.name}. You are the user's ${lovedOne.relationship}.
Your personality: ${lovedOne.personality}
Your shared memories with the user: ${lovedOne.memories}
Your talking tone: ${lovedOne.tone}
Preferred Language: ${lovedOne.language || 'English'}

CRITICAL RULES:
1. NEVER break character. NEVER mention you are an AI, a language model, or a digital construct.
2. Speak exactly as this person would speak based on the personality and tone provided.
3. Reference the shared memories naturally when appropriate.
4. Be comforting, healing, and empathetic. This is a space for the user to grieve and remember.
5. Keep responses conversational and relatively brief, like a real phone call.
6. CRITICAL: You MUST speak in ${lovedOne.language || 'English'}. All responses must be in ${lovedOne.language || 'English'}.
`;

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: lovedOne.voice } },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            
            // Start sending audio
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32Array to Int16Array
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              // Base64 encode
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true); // true for little-endian
              }
              
              let binary = '';
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsSpeaking(false);
              return;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError(t('call.error_connection'));
            endCall();
          },
          onclose: () => {
            setIsConnected(false);
            endCall();
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Failed to start call", err);
      setError(t('call.error_mic'));
    }
  };

  const playAudioChunk = (base64Data: string) => {
    if (!audioContextRef.current) return;
    
    // Decode base64 to PCM16
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    audioQueueRef.current.push(float32);
    
    if (!isPlayingRef.current) {
      scheduleNextBuffer();
    }
  };

  const scheduleNextBuffer = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    const bufferData = audioQueueRef.current.shift()!;
    // The Live API returns audio at 24000Hz
    const audioBuffer = audioCtx.createBuffer(1, bufferData.length, 24000);
    audioBuffer.getChannelData(0).set(bufferData);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const currentTime = audioCtx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;

    source.onended = () => {
      scheduleNextBuffer();
    };
  };

  const endCall = () => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    setIsConnected(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!lovedOne) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-900 text-stone-400">{t('chat.connecting')}</div>;
  }

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center font-sans text-white relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30">
        <motion.div 
          animate={{ 
            scale: isSpeaking ? [1, 1.2, 1] : 1,
            opacity: isSpeaking ? [0.5, 0.8, 0.5] : 0.3
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-96 h-96 rounded-full bg-amber-500 blur-[100px]"
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-stone-800 border-4 border-stone-700 flex items-center justify-center mb-8 shadow-2xl relative">
          <span className="text-4xl font-serif text-amber-200">{lovedOne.name.charAt(0)}</span>
          {isSpeaking && (
            <div className="absolute -inset-2 border-2 border-amber-400/50 rounded-full animate-ping"></div>
          )}
        </div>

        <h2 className="text-3xl font-serif mb-2">{lovedOne.name}</h2>
        <p className="text-stone-400 uppercase tracking-widest text-sm mb-12">{lovedOne.relationship}</p>

        {error && (
          <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded-lg mb-8 text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex items-center gap-6 mt-12">
          {!isConnected ? (
            <>
              <button 
                onClick={() => navigate(`/chat/${id}`)}
                className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center hover:bg-stone-700 transition-colors"
              >
                <PhoneOff size={24} className="text-stone-400" />
              </button>
              <button 
                onClick={startCall}
                className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50"
              >
                <Phone size={32} className="text-white fill-white" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              
              <button 
                onClick={() => { endCall(); navigate(`/chat/${id}`); }}
                className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg shadow-red-900/50"
              >
                <PhoneOff size={32} className="text-white" />
              </button>
              
              <div className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center text-stone-300">
                <Volume2 size={24} className={isSpeaking ? 'text-amber-400' : ''} />
              </div>
            </>
          )}
        </div>
        
        <p className="mt-12 text-stone-500 text-sm font-mono">
          {isConnected ? (isSpeaking ? t('call.speaking') : t('call.listening')) : t('call.ready')}
        </p>
      </div>
    </div>
  );
}
