import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { 
  User, Shield, Mail, Phone, Calendar, LogIn, LogOut, Settings, 
  Bookmark, Award, Bell, Heart, History, Sparkles, CheckCircle, Trash2, Edit3, Camera, AlertCircle
} from 'lucide-react';
import { auth } from '../../../utils/firebaseClient';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  deleteUser, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import { saveUserProfile, getAppUserId, getAnalyticsSummary } from '../../../utils/databaseService';

interface UserProfileViewProps {
  favorites: any[];
  onNavigate: (tab: any) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ favorites, onNavigate }) => {
  const { t } = useTranslation(['common', 'settings', 'favorites']);
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [locale, setLocale] = useState('uz-Latn');
  const [theme, setTheme] = useState('dark');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [quizScores, setQuizScores] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setDisplayName(user.displayName || user.email?.split('@')[0] || 'Asaka Ziyo Foydalanuvchisi');
        setEmailInput(user.email || '');
        setPhotoUrl(user.photoURL || '');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Load local profile state if exists
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedProfile = window.localStorage.getItem('asaka_user_profile_meta');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.displayName) setDisplayName(parsed.displayName);
          if (parsed.username) setUsername(parsed.username);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.photoUrl) setPhotoUrl(parsed.photoUrl);
          if (parsed.locale) setLocale(parsed.locale);
          if (parsed.theme) setTheme(parsed.theme);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUp) {
        const res = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        setCurrentUser(res.user);
        setStatusMsg('Akkaunt muvaffaqiyatli yaratildi!');
      } else {
        const res = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        setCurrentUser(res.user);
        setStatusMsg('Tizimga muvaffaqiyatli kirdingiz!');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Autentifikatsiya xatosi');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      setCurrentUser(res.user);
      setStatusMsg('Google orqali muvaffaqiyatli kirdingiz!');
    } catch (err: any) {
      setAuthError(err.message || 'Google orqali kirishda xatolik');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setStatusMsg('Tizimdan chiqildi.');
    } catch {
      // ignore
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Haqiqatan ham akkauntingizni va barcha shaxsiy maʼlumotlaringizni oʻchirib yubormoqchimisiz? Bu amalni ortga qaytarib boʻlmaydi.')) {
      try {
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
        }
        setCurrentUser(null);
        setStatusMsg('Akkauntingiz oʻchirildi.');
      } catch (err: any) {
        setAuthError(err.message || 'Akkauntni oʻchirishda xatolik (qayta kirish talab qilinishi mumkin)');
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getAppUserId();
    const profilePayload = {
      id: userId,
      displayName,
      username,
      phone,
      photoUrl,
      locale,
      theme,
      pushEnabled,
      updatedAt: new Date().toISOString(),
      createdAt: currentUser?.metadata?.creationTime || new Date().toISOString(),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('asaka_user_profile_meta', JSON.stringify(profilePayload));
    }

    await saveUserProfile(userId, profilePayload);
    setIsEditing(false);
    setStatusMsg('Profil maʼlumotlari saqlandi!');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* 2026 Luxury Architectural Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#063D32] via-[#042B25] to-[#031814] border border-[#C6A45C]/35 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-[#C6A45C]/15 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#C6A45C]/20 border-2 border-[#C6A45C] overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
              {photoUrl ? (
                <img src={photoUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-[#C6A45C]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-stone-100">
                  {displayName || 'Asaka Ziyo Foydalanuvchisi'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {currentUser ? 'Tasdiqlangan Akkaunt' : 'Mehmon (Guest)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 mt-1">
                {currentUser ? currentUser.email : 'Asaka shahrining maʼnaviy-maʼrifiy ilovasi'}
              </p>
              <p className="text-[11px] text-[#c5a869] mt-0.5 flex items-center gap-1 font-mono-numbers">
                <Calendar className="w-3 h-3" />
                <span>Roʻyxatdan oʻtgan: {currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'Bugun'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                  className="border-[#c5a869]/50 text-[#c5a869] hover:bg-[#c5a869]/10"
                >
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  <span>{isEditing ? 'Bekor qilish' : 'Tahrirlash'}</span>
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-rose-400 hover:text-rose-300"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  <span>Chiqish</span>
                </Button>
              </>
            ) : (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setIsSignUp(false)}
                className="bg-[#c5a869] text-[#071614] font-bold"
              >
                <LogIn className="w-4 h-4 mr-1.5" />
                <span>Tizimga Kirish</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Auth Box if Not Logged In */}
      {!currentUser && (
        <Card elevated className="p-6 sm:p-8 space-y-6 max-w-xl mx-auto border-[#c5a869]/30">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {isSignUp ? 'Yangi Akkaunt ochish' : 'Asaka Ziyo Akkauntiga Kirish'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Sevimlilar, zikr va oʻqish tarixi, shuningdek shaxsiy yutuqlaringizni bulutda saqlang.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-3 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.31 7.23 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 12s.43 3.88 1.19 5.42l4.09-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.69 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Google orqali kirish</span>
            </Button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
            <span className="flex-shrink mx-4 text-xs text-stone-400">yoki email orqali</span>
            <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300">Email manzil</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="misol@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#c5a869]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300">Parol</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#c5a869]"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full bg-[#c5a869] text-[#071614] font-bold py-3">
              <span>{isSignUp ? 'Roʻyxatdan oʻtish' : 'Kirish'}</span>
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-[#c5a869] hover:underline cursor-pointer font-semibold"
              >
                {isSignUp ? 'Allaqachon akkauntingiz bormi? Kirish' : 'Akkauntingiz yoʻqmi? Roʻyxatdan oʻtish'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Editing Profile Form */}
      {isEditing && currentUser && (
        <Card elevated className="p-6 sm:p-8 space-y-6 border-[#c5a869]/30">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#c5a869]" />
            <span>Profil Maʼlumotlarini Tahrirlash</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300">Ism / Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300">Foydalanuvchi nomi (Username)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@asaka_user"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300">Telefon raqam</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300">Avatar Rasm URL</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <span>Bekor qilish</span>
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-[#c5a869] text-[#071614] font-bold">
                <span>Saqlash</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevated className="p-5 space-y-2 border-[#c5a869]/30 cursor-pointer hover:border-[#c5a869] transition-all" onClick={() => onNavigate('favorites')}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-bold">Sevimlilar</span>
            <Bookmark className="w-4 h-4 text-[#c5a869]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
            {favorites.length} ta
          </div>
          <p className="text-[11px] text-stone-500">Saqlangan oyat, hadis va maqolalar</p>
        </Card>

        <Card elevated className="p-5 space-y-2 cursor-pointer hover:border-[#c5a869] transition-all" onClick={() => onNavigate('quran')}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-bold">Qurʼon Oʻqish</span>
            <Sparkles className="w-4 h-4 text-[#c5a869]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
            114 Sura
          </div>
          <p className="text-[11px] text-stone-500">Oʻzbekcha maʼno va tafsir</p>
        </Card>

        <Card elevated className="p-5 space-y-2 cursor-pointer hover:border-[#c5a869] transition-all" onClick={() => onNavigate('quiz')}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-bold">Kunlik Viktorina</span>
            <Award className="w-4 h-4 text-[#c5a869]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
            Faol
          </div>
          <p className="text-[11px] text-stone-500">Bilimingizni sinang</p>
        </Card>

        <Card elevated className="p-5 space-y-2 cursor-pointer hover:border-[#c5a869] transition-all" onClick={() => onNavigate('dhikr')}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-bold">Zikr & Tasbeh</span>
            <Heart className="w-4 h-4 text-[#c5a869]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
            Tayyor
          </div>
          <p className="text-[11px] text-stone-500">Kunlik zikrlar jamlanmasi</p>
        </Card>
      </div>

      {/* Account Security & Deletion Section */}
      {currentUser && (
        <Card elevated className="p-6 space-y-4 border-rose-500/30">
          <h3 className="text-md font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400" />
            <span>Xavfsizlik & Akkauntni Oʻchirish</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Siz oʻz shaxsiy maʼlumotlaringizni va akkauntingizni istalgan vaqtda toʻliq oʻchirib yuborish huquqiga egasiz.
          </p>
          <div>
            <Button variant="secondary" size="sm" onClick={handleDeleteAccount} className="text-rose-400 hover:text-rose-300 border border-rose-500/30">
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Akkauntni Butunlay Oʻchirish</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
