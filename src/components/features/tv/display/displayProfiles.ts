/**
 * ASAKA ZIYO — Smart Mosque Display Architectural Design Profiles
 *
 * Four distinct, ornament-free digital mosque signage profiles.
 * Each profile adapts both color calibration and screen composition:
 * 1. royal_ivory     — Luminous warm ivory 16:9 architectural signage
 * 2. emerald_royal   — Deep velvet mosque emerald 16:9 asymmetric 2-column sanctuary
 * 3. modern_minimal  — Pure gallery alabaster 16:9 5-column Swiss-editorial grid
 * 4. madina_portrait — Vertical 9:16 (1080x1920) Masjid an-Nabawi pillar composition
 */

import { PrayerKey } from '../../../../types';
import { CanonicalDisplayProfileId } from '../../../../utils/smartMosqueDisplayEngine';

export const CANONICAL_PROFILE_ORDER: CanonicalDisplayProfileId[] = [
  'royal_ivory',
  'emerald_royal',
  'modern_minimal',
  'madina_portrait',
];

export interface DisplayPrayerRowItem {
  key: PrayerKey | 'juma';
  label: string;
  nameAr: string;
  azanTime: string;
  iqamahTime: string;
  isCurrent: boolean;
  isNext: boolean;
}

/** Classical Masjid an-Nabawi calligraphic prayer titles with balanced kashida elongation */
export const HARAMAYN_ARABIC_NAMES: Record<PrayerKey | 'ishroq' | 'juma', string> = {
  tahajjud: 'التهجد',
  subh: 'الصبح',
  bomdod: 'الفجـــر',
  quyosh: 'الشروق',
  ishroq: 'ابتداء وقت الضحى',
  peshin: 'الظهـــر',
  juma: 'الجمعـــة',
  asr: 'العصـــر',
  shom: 'المغـــرب',
  xufton: 'العشـــاء',
};

export const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export function parseHijriParts(rawHijri: string): { day: string; month: string; year: string } {
  const clean = (rawHijri || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return { day: '', month: '', year: '' };
  const tokens = clean.split(' ');
  let day = '';
  let year = '';
  const middle: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (!day && /^\d{1,2}$/.test(tk)) {
      day = tk;
    } else if (!year && /^\d{4}$/.test(tk)) {
      year = tk;
    } else {
      middle.push(tk);
    }
  }

  return {
    day,
    month: middle.join(' '),
    year,
  };
}

export interface DisplayProfileTheme {
  id: CanonicalDisplayProfileId;
  isDark: boolean;
  pageBg: string;
  surfaceBg: string;
  secondarySurfaceBg: string;
  inkPrimary: string;
  inkSecondary: string;
  inkMuted: string;
  goldHex: string;
  goldText: string;
  hairline: string;
  accentHairline: string;
  activeRowClass: string;
  activeAccentText: string;
  nextRowClass: string;
  greenBandBg: string;
  greenBandAccent: string;
  footerBg: string;
  medallionStroke: string;
  medallionFill: string;
  medallionText: string;
}

export const DISPLAY_PROFILE_THEMES: Record<CanonicalDisplayProfileId, DisplayProfileTheme> = {
  royal_ivory: {
    id: 'royal_ivory',
    isDark: false,
    pageBg: 'bg-[#F5F2EA]',
    surfaceBg: 'bg-[#F8F6F0]',
    secondarySurfaceBg: 'bg-[#EFECE2]',
    inkPrimary: 'text-[#0B231A]',
    inkSecondary: 'text-[#2F4D42]',
    inkMuted: 'text-[#5A7067]',
    goldHex: '#B08533',
    goldText: 'text-[#9A6F22]',
    hairline: 'border-[#0D4A2E]/14',
    accentHairline: 'border-[#B08533]/40',
    activeRowClass: 'bg-[#0D5A35] text-white',
    activeAccentText: 'text-[#F3D788]',
    nextRowClass: 'bg-[#0D5A35]/[0.065]',
    greenBandBg: 'bg-[#0D5A35] text-white',
    greenBandAccent: 'text-[#F3D788]',
    footerBg: 'bg-[#ECE7DA] text-[#112A20]',
    medallionStroke: '#B08533',
    medallionFill: 'rgba(176, 133, 51, 0.06)',
    medallionText: '#9A6F22',
  },
  emerald_royal: {
    id: 'emerald_royal',
    isDark: true,
    pageBg: 'bg-[#041A12]',
    surfaceBg: 'bg-[#052117]',
    secondarySurfaceBg: 'bg-[#03150E]',
    inkPrimary: 'text-[#FAF7F0]',
    inkSecondary: 'text-[#C8DBD2]',
    inkMuted: 'text-[#89A89B]',
    goldHex: '#DFBD69',
    goldText: 'text-[#DFBD69]',
    hairline: 'border-[#DFBD69]/16',
    accentHairline: 'border-[#DFBD69]/42',
    activeRowClass: 'bg-[#0E5E38] text-white ring-1 ring-[#DFBD69]/55',
    activeAccentText: 'text-[#FFE498]',
    nextRowClass: 'bg-[#DFBD69]/[0.08]',
    greenBandBg: 'bg-[#0B4B2D] text-white',
    greenBandAccent: 'text-[#FFE498]',
    footerBg: 'bg-[#02100B] text-[#EFEAD9]',
    medallionStroke: '#DFBD69',
    medallionFill: 'rgba(223, 189, 105, 0.08)',
    medallionText: '#F2D68A',
  },
  modern_minimal: {
    id: 'modern_minimal',
    isDark: false,
    pageBg: 'bg-[#FAFAF8]',
    surfaceBg: 'bg-[#FFFFFF]',
    secondarySurfaceBg: 'bg-[#F3F2ED]',
    inkPrimary: 'text-[#0A1D16]',
    inkSecondary: 'text-[#394F46]',
    inkMuted: 'text-[#667770]',
    goldHex: '#9C752C',
    goldText: 'text-[#8D6822]',
    hairline: 'border-[#0A1D16]/12',
    accentHairline: 'border-[#0A1D16]/22',
    activeRowClass: 'bg-[#0B4C2E] text-white',
    activeAccentText: 'text-[#F3D88E]',
    nextRowClass: 'bg-[#0B4C2E]/[0.045]',
    greenBandBg: 'bg-[#0B4C2E] text-white',
    greenBandAccent: 'text-[#F3D88E]',
    footerBg: 'bg-[#F3F2ED] text-[#142A21]',
    medallionStroke: '#9C752C',
    medallionFill: 'transparent',
    medallionText: '#8D6822',
  },
  madina_portrait: {
    id: 'madina_portrait',
    isDark: false,
    pageBg: 'bg-[#07130E]',
    surfaceBg: 'bg-[#F5F3EC]',
    secondarySurfaceBg: 'bg-[#ECE8DC]',
    inkPrimary: 'text-[#0D241C]',
    inkSecondary: 'text-[#345045]',
    inkMuted: 'text-[#5C7269]',
    goldHex: '#B38A3B',
    goldText: 'text-[#9B7225]',
    hairline: 'border-[#0D4A2E]/16',
    accentHairline: 'border-[#B38A3B]/42',
    activeRowClass: 'bg-[#0E5A35] text-white',
    activeAccentText: 'text-[#F3D788]',
    nextRowClass: 'bg-[#0E5A35]/[0.065]',
    greenBandBg: 'bg-[#0E5A35] text-white',
    greenBandAccent: 'text-[#F3D788]',
    footerBg: 'bg-[#E9E4D6] text-[#112A20]',
    medallionStroke: '#B38A3B',
    medallionFill: 'rgba(179, 138, 59, 0.06)',
    medallionText: '#9B7225',
  },
};
