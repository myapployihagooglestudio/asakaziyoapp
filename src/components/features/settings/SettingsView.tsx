import React from 'react';
import { AppSettings, QuranReciter } from '../../../types';
import { QURAN_RECITERS } from '../../../data/quranData';
import { Card } from '../../ui/Card';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Type,
  Volume2,
  Bell,
  Smartphone,
  MapPin,
  Shield,
  Info,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAdmin: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenAdmin,
}) => {
  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Tizim Moslashuvi</span>
            <span aria-hidden="true">·</span>
            <span>Konfiguratsiya</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Ilova Sozlamalari
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Mavzu (yorugʻ/qorongʻi), arabcha shrift oʻlchami, qiroat qorisi va ovozli bildirishnomalarni boshqarish.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Visual Theme */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 flex items-center justify-center text-[#c5a869]">
              {settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Tizim Mavzusi (Koʻrinish)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Qorongʻi (Dark Emerald) yoki yorugʻ (Light Ivory) rejimi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'border-[#c5a869] bg-[#071614] text-[#c5a869] shadow-sm'
                  : 'border-stone-200 dark:border-emerald-950 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Qorongʻi (Tungi Ziyo)</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'light'
                  ? 'border-[#c5a869] bg-stone-100 text-[#071614] shadow-sm'
                  : 'border-stone-200 dark:border-emerald-950 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Yorugʻ (Kunduzgi)</span>
            </button>
          </div>
        </Card>

        {/* 2. Arabic Font Size */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 flex items-center justify-center text-[#c5a869]">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Arabcha Shrift Oʻlchami
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Qurʼoni Karim va hadis matnlarini qulay oʻqish uchun shaxsiy kattalik
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { id: 'standard', label: 'Oddiy (28px)' },
              { id: 'large', label: 'Katta (36px)' },
              { id: 'huge', label: 'Juda katta (44px)' },
            ].map((size) => {
              const isSelected = settings.arabicFontSize === size.id;
              return (
                <button
                  key={size.id}
                  onClick={() =>
                    onUpdateSettings({
                      arabicFontSize: size.id as 'standard' | 'large' | 'huge',
                    })
                  }
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#c5a869] bg-[#c5a869]/10 text-[#c5a869]'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {size.label}
                </button>
              );
            })}
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200/60 dark:border-emerald-950/60 text-center">
            <span className="text-[11px] text-stone-400 block mb-1">Koʻrinish namunasi:</span>
            <p
              dir="rtl"
              className={`font-arabic text-stone-900 dark:text-amber-100/90 ${
                settings.arabicFontSize === 'standard'
                  ? 'text-2xl'
                  : settings.arabicFontSize === 'large'
                  ? 'text-3xl'
                  : 'text-4xl'
              }`}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        </Card>

        {/* 3. Audio Reciter Selection */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 flex items-center justify-center text-[#c5a869]">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Qurʼon Qorisi
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Audioni tinglash uchun asosiy qiroat qorisi
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {QURAN_RECITERS.map((reciter) => {
              const isSelected = settings.activeReciterId === reciter.id;
              return (
                <button
                  key={reciter.id}
                  onClick={() => onUpdateSettings({ activeReciterId: reciter.id })}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{reciter.name}</div>
                    <div className="text-xs text-stone-400 dark:text-stone-500">
                      {reciter.subtext}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-semibold text-[#c5a869]">Tanlangan</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 4. Toggles: Haptics, Audio, Notifications */}
        <Card elevated className="p-6 divide-y divide-stone-100 dark:divide-emerald-950/60">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Elektron Tasbeh Chertish Ovozi
              </div>
              <div className="text-xs text-stone-400">
                Har bir sanashda akustik chertish tovushini chiqarish
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ tasbihSound: !settings.tasbihSound })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.tasbihSound ? 'bg-[#c5a869]' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.tasbihSound ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Vibratsiya (Haptic Feedback)
              </div>
              <div className="text-xs text-stone-400">
                Tugmachani bosganda yengil tebranish berish
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ hapticFeedback: !settings.hapticFeedback })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.hapticFeedback ? 'bg-[#c5a869]' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.hapticFeedback ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Namoz Vaqti Eslatmalari
              </div>
              <div className="text-xs text-stone-400">
                Har bir namoz kirishidan 15 daqiqa oldin bildirishnoma
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ prayerAlertsEnabled: !settings.prayerAlertsEnabled })
              }
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.prayerAlertsEnabled ? 'bg-[#c5a869]' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.prayerAlertsEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </Card>

        {/* 5. Regional & Architecture Information */}
        <Card className="p-6 space-y-3 bg-stone-100/60 dark:bg-[#071614]/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Info className="w-3.5 h-3.5" />
            <span>Mahalliy Hudud va Tizim</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 dark:text-stone-300">
            <div>
              <span className="text-stone-400 block">Hudud:</span>
              <span className="font-semibold">Asaka shahri, Andijon viloyati</span>
            </div>
            <div>
              <span className="text-stone-400 block">Vaqt mintaqasi:</span>
              <span className="font-semibold font-mono-numbers">Asia/Tashkent (UTC+5)</span>
            </div>
            <div>
              <span className="text-stone-400 block">Qibla kompas yoʻnalishi:</span>
              <span className="font-semibold font-mono-numbers">241° (Gʻarb-Janubi-Gʻarb)</span>
            </div>
            <div>
              <span className="text-stone-400 block">Platforma versiyasi:</span>
              <span className="font-semibold">Phase 1 Foundation (Bolt & GitHub Ready)</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenAdmin}
              className="text-xs text-[#c5a869] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Maʼmuriyat konsoliga kirish</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
