import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { PageHero } from '../../ui/PageHero';
import {
  SpatialTiltCard,
  InteractiveCounter,
  MagneticWrapper,
} from '../../ui/MotionPrimitives';
import {
  User,
  Shield,
  Calendar,
  LogIn,
  LogOut,
  Settings,
  Bookmark,
  Award,
  Heart,
  Sparkles,
  CheckCircle,
  Trash2,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import { auth } from '../../../utils/firebaseClient';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  deleteUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { saveUserProfile, getAppUserId } from '../../../utils/databaseService';

interface UserProfileViewProps {
  favorites: any[];
  onNavigate: (tab: any) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ favorites, onNavigate }) => {
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [locale, setLocale] = useState('uz-Latn');
  const [theme, setTheme] = useState('dark');
  const [pushEnabled] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        setAuthError(
          'Ushbu qurilma/brauzerda Google qalqib chiquvchi oynasi bloklandi. Iltimos, Email va parol orqali kiring.'
        );
      } else {
        setAuthError(err?.message || 'Google orqali kirishda xatolik');
      }
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

  const executeDeleteAccount = async () => {
    setShowDeleteModal(false);
    setIsDeletingAccount(true);
    setAuthError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setCurrentUser(null);
        setStatusMsg('Lokal profil maʼlumotlari tozalandi.');
        return;
      }

      // 1. Purge user records on backend & Firestore using verified Firebase ID token
      try {
        const idToken = await user.getIdToken();
        const delResp = await fetch('/api/user/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ uid: user.uid }),
        });
        if (!delResp.ok) {
          const errJson = await delResp.json().catch(() => ({}));
          if (delResp.status === 401 || delResp.status === 403) {
            throw new Error(errJson.error || 'Akkaunt egasini tasdiqlash rad etildi.');
          }
        }
      } catch (serverErr: any) {
        if (serverErr?.message?.includes('tasdiqlash')) {
          throw serverErr;
        }
      }

      // 2. Delete Firebase Auth account
      try {
        await deleteUser(user);
      } catch (authDelErr: any) {
        if (authDelErr?.code === 'auth/requires-recent-login') {
          throw new Error(
            'Xavfsizlik sababli akkauntni oʻchirishdan oldin tizimdan chiqib qayta kiring va yana urinib koʻring.'
          );
        }
        throw authDelErr;
      }

      // 3. Clear personal localStorage caches
      try {
        localStorage.removeItem('asaka_user_profile_meta');
        localStorage.removeItem('asaka_ziyo_favorites');
        localStorage.removeItem('asaka_ziyo_app_user_id_v1');
      } catch {
        // ignore
      }

      setCurrentUser(null);
      setDisplayName('');
      setUsername('');
      setPhone('');
      setPhotoUrl('');
      setStatusMsg('Akkauntingiz va barcha shaxsiy maʼlumotlaringiz butunlay oʻchirildi.');
    } catch (err: any) {
      setAuthError(err?.message || 'Akkauntni oʻchirishda xatolik yuz berdi.');
    } finally {
      setIsDeletingAccount(false);
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

  const inputClassName =
    'w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-white/70 dark:bg-white/[0.04] text-sm text-[#091813] dark:text-[#F7F4EC] placeholder-[#587068] dark:placeholder-[#9CAFA7] focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981] transition-colors';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <PageHero
        variant="sanctuary"
        kicker={currentUser ? 'Shaxsiy Kabinet · Tasdiqlangan Akkaunt' : 'Shaxsiy Kabinet · Mehmon'}
        title={displayName || 'Asaka Ziyo Foydalanuvchisi'}
        subtitle={
          currentUser
            ? `${currentUser.email} · Roʻyxatdan oʻtgan: ${
                currentUser?.metadata?.creationTime
                  ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                  : 'Bugun'
              }`
            : 'Asaka shahrining maʼnaviy-maʼrifiy ilovasi · Sevimlilar va shaxsiy yutuqlaringizni bulutda saqlang.'
        }
        actions={
          currentUser ? (
            <>
              <MagneticWrapper strength={4}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="min-h-[44px] border-[#C8A85E]/45 text-[#F7F4EC] hover:bg-[#C8A85E]/15"
                >
                  <Edit3 className="w-4 h-4 mr-1.5 text-[#C8A85E]" />
                  <span>{isEditing ? 'Bekor qilish' : 'Tahrirlash'}</span>
                </Button>
              </MagneticWrapper>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="min-h-[44px] text-rose-300 hover:text-rose-200 hover:bg-rose-500/15"
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
              className="min-h-[44px]"
            >
              <LogIn className="w-4 h-4 mr-1.5" />
              <span>Tizimga Kirish</span>
            </Button>
          )
        }
        aside={
          <div className="flex items-center sm:justify-end gap-4">
            <div className="flex items-center gap-4 rounded-2xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md p-4">
              <div className="w-16 h-16 rounded-2xl bg-[#C8A85E]/15 ring-1 ring-[#C8A85E]/50 overflow-hidden flex items-center justify-center shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-[#C8A85E]" />
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#34D399]">
                  {currentUser ? 'Bulut sinxronizatsiyasi faol' : 'Lokal rejim'}
                </div>
                <div className="text-[11px] text-[#C2D4CD] flex items-center gap-1.5 font-mono-numbers">
                  <Calendar className="w-3.5 h-3.5 text-[#C8A85E]" />
                  <span>
                    {currentUser?.metadata?.creationTime
                      ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                      : 'Bugun'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        }
      />

      {statusMsg && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-emerald-500/12 border border-emerald-500/35 text-[#064E3B] dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5"
        >
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Auth Box if Not Logged In */}
      {!currentUser && (
        <Card elevated className="p-6 sm:p-8 space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-1.5">
            <h2 className="text-lg sm:text-xl font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
              {isSignUp ? 'Yangi Akkaunt ochish' : 'Asaka Ziyo Akkauntiga Kirish'}
            </h2>
            <p className="text-xs sm:text-sm text-[#587068] dark:text-[#9CAFA7]">
              Sevimlilar, zikr va oʻqish tarixi, shuningdek shaxsiy yutuqlaringizni bulutda saqlang.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full min-h-[46px] flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.31 7.23 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 12s.43 3.88 1.19 5.42l4.09-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.69 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Google orqali kirish</span>
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-black/[0.08] dark:border-white/[0.08]" />
            <span className="flex-shrink mx-4 text-xs text-[#587068] dark:text-[#9CAFA7]">
              yoki email orqali
            </span>
            <div className="flex-grow border-t border-black/[0.08] dark:border-white/[0.08]" />
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1]">
                Email manzil
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="misol@gmail.com"
                className={inputClassName}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1]">
                Parol
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className={inputClassName}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full min-h-[46px] font-bold">
              <span>{isSignUp ? 'Roʻyxatdan oʻtish' : 'Kirish'}</span>
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-[#064E3B] dark:text-[#C8A85E] hover:underline cursor-pointer font-semibold min-h-[36px] px-2"
              >
                {isSignUp
                  ? 'Allaqachon akkauntingiz bormi? Kirish'
                  : 'Akkauntingiz yoʻqmi? Roʻyxatdan oʻtish'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Editing Profile Form */}
      {isEditing && currentUser && (
        <Card elevated className="p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#9E7F3C] dark:text-[#C8A85E]" />
            <span>Profil Maʼlumotlarini Tahrirlash</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1]">
                  Ism / Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClassName}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1]">
                  Foydalanuvchi nomi (Username)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@asaka_user"
                  className={inputClassName}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1]">
                  Telefon raqam
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className={inputClassName}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1]">
                  Avatar Rasm URL
                </label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setIsEditing(false)}
              >
                <span>Bekor qilish</span>
              </Button>
              <Button type="submit" variant="primary" size="sm" className="min-h-[44px] font-bold">
                <span>Saqlash</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Bento Dashboard Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SpatialTiltCard maxTilt={4} onClick={() => onNavigate('favorites')}>
          <Card elevated interactive className="p-5 h-full space-y-2 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#587068] dark:text-[#9CAFA7] font-semibold">
                Sevimlilar
              </span>
              <Bookmark className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />
            </div>
            <div className="text-2xl font-display font-extrabold text-[#091813] dark:text-[#F7F4EC]">
              <InteractiveCounter value={favorites.length} suffix=" ta" />
            </div>
            <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
              Saqlangan oyat, hadis va maqolalar
            </p>
          </Card>
        </SpatialTiltCard>

        <SpatialTiltCard maxTilt={4} onClick={() => onNavigate('quran')}>
          <Card elevated interactive className="p-5 h-full space-y-2 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#587068] dark:text-[#9CAFA7] font-semibold">
                Qurʼon Oʻqish
              </span>
              <Sparkles className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />
            </div>
            <div className="text-2xl font-display font-extrabold font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
              114 Sura
            </div>
            <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
              Oʻzbekcha maʼno va tafsir
            </p>
          </Card>
        </SpatialTiltCard>

        <SpatialTiltCard maxTilt={4} onClick={() => onNavigate('quiz')}>
          <Card elevated interactive className="p-5 h-full space-y-2 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#587068] dark:text-[#9CAFA7] font-semibold">
                Kunlik Viktorina
              </span>
              <Award className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />
            </div>
            <div className="text-2xl font-display font-extrabold text-[#091813] dark:text-[#F7F4EC]">
              Faol
            </div>
            <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">Bilimingizni sinang</p>
          </Card>
        </SpatialTiltCard>

        <SpatialTiltCard maxTilt={4} onClick={() => onNavigate('dhikr')}>
          <Card elevated interactive className="p-5 h-full space-y-2 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#587068] dark:text-[#9CAFA7] font-semibold">
                Zikr & Tasbeh
              </span>
              <Heart className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />
            </div>
            <div className="text-2xl font-display font-extrabold text-[#091813] dark:text-[#F7F4EC]">
              Tayyor
            </div>
            <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
              Kunlik zikrlar jamlanmasi
            </p>
          </Card>
        </SpatialTiltCard>
      </div>

      {/* Account Security, Privacy Policy & Deletion Section */}
      <Card elevated className="p-6 space-y-4 ring-1 ring-rose-500/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>Maxfiylik va Akkaunt Xavfsizligi</span>
          </h3>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('asaka-open-privacy-modal'))}
            className="text-xs font-bold text-[#064E3B] dark:text-[#C8A85E] hover:underline cursor-pointer min-h-[36px] px-1"
          >
            Maxfiylik siyosati & Maʼlumotlar xavfsizligi →
          </button>
        </div>
        <p className="text-xs sm:text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
          Siz oʻz shaxsiy maʼlumotlaringizni va akkauntingizni istalgan vaqtda toʻliq oʻchirib yuborish huquqiga egasiz.{' '}
          <a
            href="/delete-account"
            className="text-[#064E3B] dark:text-[#C8A85E] underline font-semibold"
          >
            Akkauntni oʻchirish yoʻriqnomasi
          </a>
        </p>
        {currentUser && (
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={isDeletingAccount}
              onClick={() => setShowDeleteModal(true)}
              className="min-h-[44px] text-rose-600 dark:text-rose-400 border-rose-500/35 hover:bg-rose-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>{isDeletingAccount ? 'Oʻchirilmoqda...' : 'Akkauntni Butunlay Oʻchirish'}</span>
            </Button>
          </div>
        )}
      </Card>

      {/* In-App Liquid Glass Confirmation Modal (iframe-safe, replaces window.confirm) */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Akkauntni butunlay oʻchirish"
        maxWidth="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
            Haqiqatan ham akkauntingizni va barcha shaxsiy maʼlumotlaringizni butunlay oʻchirib yubormoqchimisiz? Bu amalni ortga qaytarib boʻlmaydi.
          </p>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => setShowDeleteModal(false)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="min-h-[44px] !bg-rose-600 hover:!bg-rose-700 !text-white"
              onClick={executeDeleteAccount}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Ha, butunlay oʻchirish</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
