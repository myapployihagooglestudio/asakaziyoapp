import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { IslamicStarEmblem } from '../../ui/GeometricPattern';
import { SupportInquiry } from '../../../types';
import {
  getStoredInquiries,
  submitUserInquiry,
  subscribeToDatabase,
} from '../../../utils/databaseService';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Phone,
  HelpCircle,
} from 'lucide-react';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation('common');
  const [inquiries, setInquiries] = useState<SupportInquiry[]>(() =>
    getStoredInquiries()
  );

  const [activeTab, setActiveTab] = useState<'new_inquiry' | 'my_inquiries'>(
    'new_inquiry'
  );

  // Form states
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync with real-time updates from database
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'INQUIRIES_UPDATED') {
        setInquiries(getStoredInquiries());
      }
    });
    return unsubscribe;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !message.trim()) {
      setValidationError('Iltimos, ismingiz va savolingiz matnini kiriting.');
      return;
    }

    setValidationError(null);
    submitUserInquiry({
      userName: userName.trim(),
      userPhone: userPhone.trim() || undefined,
      subject: subject.trim() || 'Umumiy diniy-maʼrifiy savol',
      message: message.trim(),
    });

    setMessage('');
    setSubject('');
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setActiveTab('my_inquiries');
    }, 1800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Maʼmuriyat bilan Muloqot va Savollar"
      subtitle="Asaka Jome Masjidi imom-xatiblari va maʼmurlariga murojaat yoʻllash"
      size="lg"
    >
      <div className="space-y-5">
        {/* Navigation tabs */}
        <div className="flex border-b border-stone-200 dark:border-emerald-950/80 gap-3">
          <button
            onClick={() => setActiveTab('new_inquiry')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'new_inquiry'
                ? 'border-[#c5a869] text-[#c5a869]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Savol yoki Murojaat Yoʻllash</span>
          </button>
          <button
            onClick={() => setActiveTab('my_inquiries')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_inquiries'
                ? 'border-[#c5a869] text-[#c5a869]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Murojaatlarim ({inquiries.length})</span>
          </button>
        </div>

        {/* TAB 1: FORM */}
        {activeTab === 'new_inquiry' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-stone-300 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#c5a869] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Yuborilgan savollar va fikr-mulohazalar toʻgʻridan-toʻgʻri Asaka jome masjidi maʼmuriyati admin konsoliga kelib tushadi. Har bir murojaatga imom-xatiblarimiz tomonidan shariat meʼyorlarida javob qaytariladi.
              </p>
            </div>

            {isSubmitted && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Murojaatingiz muvaffaqiyatli yuborildi! Tez orada javob beriladi.</span>
              </div>
            )}

            {validationError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {validationError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Ismingiz: *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Abdulloh"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#c5a869]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Telefon raqamingiz (ixtiyoriy):
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="tel"
                    placeholder="+998 90 123 45 67"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#c5a869]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Mavzu:
              </label>
              <input
                type="text"
                placeholder="Masalan: Namoz hukmlari, ehson yoki masjid tartibi"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#c5a869]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Savolingiz yoki Murojaatingiz matni: *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Savolingiz yoki fikr-mulohazangizni batafsil yozing..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#c5a869] resize-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center text-xs sm:text-sm font-bold tracking-wide"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>Murojaatni Yuborish</span>
            </Button>
          </form>
        )}

        {/* TAB 2: LIST OF INQUIRIES & REPLIES */}
        {activeTab === 'my_inquiries' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {inquiries.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-[#c5a869]/60" />
                <p>Hozircha hech qanday murojaat yoʻllanmagan.</p>
              </div>
            ) : (
              inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/70 dark:bg-[#071614]/70 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {inq.subject}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                        <span className="font-semibold text-[#c5a869]">{inq.userName}</span>
                        <span>·</span>
                        <span>{inq.createdAt}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        inq.status === 'answered'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {inq.status === 'answered' ? 'Javob berildi' : 'Kutilmoqda'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed bg-white/40 dark:bg-black/20 p-2.5 rounded-lg">
                    {inq.message}
                  </p>

                  {inq.adminReply && (
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#c5a869]">
                        <IslamicStarEmblem size={14} className="text-[#c5a869]" />
                        <span>{inq.repliedBy || 'Asaka Jome Masjidi Maʼmuriyati'}</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          · {inq.repliedAt}
                        </span>
                      </div>
                      <p className="text-xs text-stone-200 leading-relaxed pl-5">
                        {inq.adminReply}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-stone-200 dark:border-emerald-950/80 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Yopish
          </Button>
        </div>
      </div>
    </Modal>
  );
};
