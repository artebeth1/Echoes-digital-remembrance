import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../utils/translations';
import { motion } from 'motion/react';
import { Globe } from 'lucide-react';

export default function Landing() {
  const { currentUser, login, signup } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'welcome' | 'login' | 'signup'>('welcome');

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setIsSigningUp(true);
    try {
      await signup(email, password);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsSigningUp(false);
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
        className="relative z-10 px-6 max-w-md w-full mx-auto"
      >
        {mode === 'welcome' ? (
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 drop-shadow-lg tracking-wide">
              {t('app.name')}
            </h1>
            <p className="text-lg md:text-xl text-stone-100 mb-10 font-light drop-shadow-md leading-relaxed">
              {t('landing.description')}
            </p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setMode('login')}
                className="px-8 py-4 bg-white/90 hover:bg-white text-stone-800 rounded-full font-medium tracking-wide shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm"
              >
                Sign In
              </button>
              <button 
                onClick={() => setMode('signup')}
                className="px-8 py-4 bg-white/30 hover:bg-white/40 text-white rounded-full font-medium tracking-wide shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm border border-white/50"
              >
                Create Account
              </button>
            </div>
          </div>
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6 bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif text-white drop-shadow-lg">Sign In</h2>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-stone-300 focus:outline-none focus:border-white/50 transition"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-stone-300 focus:outline-none focus:border-white/50 transition"
            />

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full px-6 py-3 bg-white/90 hover:bg-white text-stone-800 rounded-full font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setMode('welcome')}
              className="w-full text-white/70 hover:text-white text-sm transition"
            >
              Back
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-6 bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif text-white drop-shadow-lg">Create Account</h2>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-stone-300 focus:outline-none focus:border-white/50 transition"
            />

            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-stone-300 focus:outline-none focus:border-white/50 transition"
            />

            <button 
              type="submit"
              disabled={isSigningUp}
              className="w-full px-6 py-3 bg-white/90 hover:bg-white text-stone-800 rounded-full font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningUp ? 'Creating account...' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => setMode('welcome')}
              className="w-full text-white/70 hover:text-white text-sm transition"
            >
              Back
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
