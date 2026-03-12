import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LovedOne, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { Plus, MessageCircle, Phone, LogOut, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, `users/${currentUser.uid}/lovedOnes`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as LovedOne);
      setLovedOnes(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/lovedOnes`);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-serif text-stone-700 tracking-wide">{t('app.name')}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500 hidden sm:inline">{currentUser?.email}</span>
          <button 
            onClick={() => logout()}
            className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
            title={t('dashboard.sign_out')}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-light text-stone-800 mb-2">{t('dashboard.title')}</h2>
            <p className="text-stone-500">{t('dashboard.subtitle')}</p>
          </div>
          <button 
            onClick={() => navigate('/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-white rounded-full hover:bg-stone-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>{t('dashboard.add_loved_one')}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-stone-400">{t('dashboard.loading')}</div>
          </div>
        ) : lovedOnes.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="text-stone-300" size={32} />
            </div>
            <h3 className="text-xl font-medium text-stone-700 mb-2">{t('dashboard.no_loved_ones')}</h3>
            <p className="text-stone-500 max-w-md mx-auto mb-8">
              {t('dashboard.no_loved_ones_desc')}
            </p>
            <button 
              onClick={() => navigate('/create')}
              className="px-6 py-3 bg-stone-100 text-stone-700 rounded-full hover:bg-stone-200 transition-colors font-medium"
            >
              {t('dashboard.begin_creation')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lovedOnes.map((person, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={person.id}
                className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-200 to-orange-200 opacity-50"></div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/edit/${person.id}`); }}
                  className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-full transition-colors"
                  title={t('dashboard.edit')}
                >
                  <Edit2 size={18} />
                </button>

                <h3 className="text-2xl font-serif text-stone-800 mb-1 pr-8">{person.name}</h3>
                <p className="text-stone-500 text-sm mb-6 uppercase tracking-wider">{person.relationship}</p>
                
                <p className="text-stone-600 text-sm line-clamp-3 mb-8 italic">
                  "{person.personality}"
                </p>

                <div className="flex gap-3 mt-auto">
                  <button 
                    onClick={() => navigate(`/chat/${person.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl transition-colors text-sm font-medium"
                  >
                    <MessageCircle size={16} />
                    {t('dashboard.chat')}
                  </button>
                  <button 
                    onClick={() => navigate(`/call/${person.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition-colors text-sm font-medium"
                  >
                    <Phone size={16} />
                    {t('dashboard.call')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
