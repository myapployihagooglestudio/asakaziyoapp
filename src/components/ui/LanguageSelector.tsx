import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LOCALES, SupportedLocale } from '../../i18n';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const activeOption =
    SUPPORTED_LOCALES.find((l) => l.code === currentLocale) || SUPPORTED_LOCALES[0];

  const handleSelectLanguage = (code: SupportedLocale) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (variant === 'full') {
    return (
      <div className={`space-y-2 ${className}`}>
        {SUPPORTED_LOCALES.map((option) => {
          const isSelected = option.code === currentLocale;
          return (
            <button
              key={option.code}
              onClick={() => handleSelectLanguage(option.code)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white shadow-sm'
                  : 'border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50 text-stone-700 dark:text-stone-300 hover:border-[#c5a869]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-emerald-950 flex items-center justify-center font-mono-numbers text-xs font-bold text-[#c5a869] border border-[#c5a869]/20">
                  {option.flagLabel}
                </span>
                <div>
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="text-xs text-stone-400 dark:text-stone-500">
                    {option.writingSystem}
                  </div>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-[#c5a869]" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200/80 dark:border-emerald-950 bg-stone-100/70 dark:bg-[#091a18] text-stone-700 dark:text-stone-300 hover:border-[#c5a869]/50 transition-colors text-xs font-medium cursor-pointer"
        aria-label="Til va yozuvni tanlash"
        title="Tilni oʻzgartirish"
      >
        <Languages className="w-3.5 h-3.5 text-[#c5a869]" />
        <span className="font-semibold text-[11px] hidden sm:inline">
          {activeOption.flagLabel}
        </span>
        <ChevronDown className="w-3 h-3 text-stone-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-stone-200 dark:border-[#c5a869]/30 bg-white dark:bg-[#0d211e] shadow-xl z-50 p-1.5 space-y-1 backdrop-blur-md">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-emerald-950/80">
            Til va yozuv tizimi
          </div>

          {SUPPORTED_LOCALES.map((option) => {
            const isSelected = option.code === currentLocale;
            return (
              <button
                key={option.code}
                onClick={() => handleSelectLanguage(option.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#c5a869]/15 text-[#c5a869] font-bold'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-stone-100 dark:bg-emerald-950 flex items-center justify-center font-mono-numbers text-[10px] font-bold text-[#c5a869]">
                    {option.flagLabel}
                  </span>
                  <span>{option.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#c5a869]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
