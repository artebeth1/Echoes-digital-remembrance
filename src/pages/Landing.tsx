import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../utils/translations';
import { motion } from 'motion/react';
import { Globe } from 'lucide-react';

export default function Landing() {
  const { currentUser, login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-stone-100">
      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-20">
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-2 rounded-full border border-white/30 text-white">
          <Globe size={16} />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code} className="text-stone-800">
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Background Image: Giant tree in a flower field with comforting sunlight */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop" 
          alt="Giant tree in a sunlit field" 
          className="w-full h-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />
        {/* Warm sunlight overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 via-transparent to-stone-900/60 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-stone-900/20"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 text-center px-6 max-w-2xl mx-auto"
      >
        <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 drop-shadow-lg tracking-wide">
          {t('app.name')}
        </h1>
        <p className="text-lg md:text-xl text-stone-100 mb-10 font-light drop-shadow-md leading-relaxed">
          {t('landing.description')}
        </p>
        
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="px-8 py-4 bg-white/90 hover:bg-white text-stone-800 rounded-full font-medium tracking-wide shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
        >
          {isLoggingIn ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-stone-800 border-t-transparent rounded-full animate-spin"></span>
              {t('landing.connecting')}
            </span>
          ) : (
            t('landing.cta')
          )}
        </button>
      </motion.div>
    </div>
  );
}
