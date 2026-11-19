/**
 * ASAKA ZIYO — Smart Mosque Display Architectural Design Profiles
 *
 * Four distinct, ornament-free digital mosque signage profiles strictly supporting
 * the 5 official project languages (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en).
 *
 * 1. royal_ivory     — Luminous warm ivory 16:9 architectural signage
 * 2. emerald_royal   — Deep velvet mosque emerald 16:9 asymmetric 2-column sanctuary
 * 3. modern_minimal  — Pure gallery alabaster 16:9 5-column Swiss-editorial grid
 * 4. madina_portrait — Vertical 9:16 (1080x1920) architectural pillar composition
 */

import { PrayerKey } from '../../../../types';
import {
  ALL_CANONICAL_DISPLAY_PROFILE_IDS,
  CanonicalDisplayProfileId,
  ORIGINAL_DISPLAY_PROFILE_IDS,
  PHASE2_PREMIUM_PROFILE_IDS,
} from '../../../../utils/smartMosqueDisplayEngine';

export const CANONICAL_PROFILE_ORDER: CanonicalDisplayProfileId[] =
  ALL_CANONICAL_DISPLAY_PROFILE_IDS;

export const ORIGINAL_PROFILE_ORDER = ORIGINAL_DISPLAY_PROFILE_IDS;
export const PHASE2_PROFILE_ORDER = PHASE2_PREMIUM_PROFILE_IDS;

export interface DisplayPrayerRowItem {
  key: PrayerKey | 'juma';
  label: string;
  azanTime: string;
  iqamahTime: string;
  isCurrent: boolean;
  isNext: boolean;
}

export function parseHijriParts(localizedHijri: string): {
  day: string;
  month: string;
  year: string;
} {
  const clean = (localizedHijri || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
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
  // === ORIGINAL 4 PROFILES (COMPLETELY UNTOUCHED) ===
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

  // === PHASE 2: SIX NEW PREMIUM DESIGN SYSTEMS ===
  sultan_royal: {
    id: 'sultan_royal',
    isDark: true,
    pageBg: 'bg-[#031610]',
    surfaceBg: 'bg-[#042117]',
    secondarySurfaceBg: 'bg-[#062E20]',
    inkPrimary: 'text-[#FDFBF4]',
    inkSecondary: 'text-[#D3E3DB]',
    inkMuted: 'text-[#8FAE9F]',
    goldHex: '#E5C36A',
    goldText: 'text-[#E5C36A]',
    hairline: 'border-[#E5C36A]/20',
    accentHairline: 'border-[#E5C36A]/48',
    activeRowClass: 'bg-[#0F633A] text-white ring-1 ring-[#E5C36A]/65',
    activeAccentText: 'text-[#FFE69D]',
    nextRowClass: 'bg-[#E5C36A]/[0.09] ring-1 ring-[#E5C36A]/28',
    greenBandBg: 'bg-[#0B4E2E] text-white',
    greenBandAccent: 'text-[#FFE69D]',
    footerBg: 'bg-[#02100B] text-[#EFE9D8]',
    medallionStroke: '#E5C36A',
    medallionFill: 'rgba(229, 195, 106, 0.1)',
    medallionText: '#F4DA90',
  },
  noor_classic: {
    id: 'noor_classic',
    isDark: false,
    pageBg: 'bg-[#F8F6F1]',
    surfaceBg: 'bg-[#FCFBF8]',
    secondarySurfaceBg: 'bg-[#F3EFE6]',
    inkPrimary: 'text-[#13221C]',
    inkSecondary: 'text-[#395046]',
    inkMuted: 'text-[#687B73]',
    goldHex: '#B88E3D',
    goldText: 'text-[#9F7628]',
    hairline: 'border-[#B88E3D]/22',
    accentHairline: 'border-[#B88E3D]/48',
    activeRowClass: 'bg-[#125635] text-white',
    activeAccentText: 'text-[#F5DC93]',
    nextRowClass: 'bg-[#B88E3D]/[0.09]',
    greenBandBg: 'bg-[#125635] text-white',
    greenBandAccent: 'text-[#F5DC93]',
    footerBg: 'bg-[#EFEAE0] text-[#172821]',
    medallionStroke: '#B88E3D',
    medallionFill: 'rgba(184, 142, 61, 0.08)',
    medallionText: '#9F7628',
  },
  midnight_premium: {
    id: 'midnight_premium',
    isDark: true,
    pageBg: 'bg-[#060D1D]',
    surfaceBg: 'bg-[#091529]',
    secondarySurfaceBg: 'bg-[#0A1F29]',
    inkPrimary: 'text-[#F8FAFC]',
    inkSecondary: 'text-[#CBD5E1]',
    inkMuted: 'text-[#8A9BB3]',
    goldHex: '#D6B66C',
    goldText: 'text-[#D6B66C]',
    hairline: 'border-[#CBD5E1]/15',
    accentHairline: 'border-[#D6B66C]/36',
    activeRowClass: 'bg-[#0F4C45] text-white ring-1 ring-[#D6B66C]/50',
    activeAccentText: 'text-[#F0D898]',
    nextRowClass: 'bg-[#142D45]/80 ring-1 ring-[#CBD5E1]/20',
    greenBandBg: 'bg-[#0D3D38] text-white',
    greenBandAccent: 'text-[#E7CE8A]',
    footerBg: 'bg-[#040915] text-[#DCE4EE]',
    medallionStroke: '#CBD5E1',
    medallionFill: 'rgba(203, 213, 225, 0.07)',
    medallionText: '#E2E8F0',
  },
  vision_modern: {
    id: 'vision_modern',
    isDark: false,
    pageBg: 'bg-[#F5F5F3]',
    surfaceBg: 'bg-[#FFFFFF]',
    secondarySurfaceBg: 'bg-[#F1F2EE]',
    inkPrimary: 'text-[#0F172A]',
    inkSecondary: 'text-[#334155]',
    inkMuted: 'text-[#64748B]',
    goldHex: '#0F5C3B',
    goldText: 'text-[#0F5C3B]',
    hairline: 'border-[#0F172A]/12',
    accentHairline: 'border-[#0F5C3B]/35',
    activeRowClass: 'bg-[#0F5C3B] text-white',
    activeAccentText: 'text-[#D1FAE5]',
    nextRowClass: 'bg-[#0F5C3B]/[0.06]',
    greenBandBg: 'bg-[#0F5C3B] text-white',
    greenBandAccent: 'text-[#D1FAE5]',
    footerBg: 'bg-[#ECEEE9] text-[#0F172A]',
    medallionStroke: '#0F5C3B',
    medallionFill: 'rgba(15, 92, 59, 0.05)',
    medallionText: '#0F5C3B',
  },
  islamic_heritage: {
    id: 'islamic_heritage',
    isDark: false,
    pageBg: 'bg-[#073022]',
    surfaceBg: 'bg-[#F7F3E9]',
    secondarySurfaceBg: 'bg-[#EDE6D6]',
    inkPrimary: 'text-[#10261D]',
    inkSecondary: 'text-[#2D4B3E]',
    inkMuted: 'text-[#5A7065]',
    goldHex: '#C2953B',
    goldText: 'text-[#9F7523]',
    hairline: 'border-[#0D4A2E]/16',
    accentHairline: 'border-[#C2953B]/48',
    activeRowClass: 'bg-[#0B4E2F] text-white',
    activeAccentText: 'text-[#F5DB8F]',
    nextRowClass: 'bg-[#C2953B]/[0.11]',
    greenBandBg: 'bg-[#0B4E2F] text-white',
    greenBandAccent: 'text-[#F5DB8F]',
    footerBg: 'bg-[#06271C] text-[#F4EFE1]',
    medallionStroke: '#C2953B',
    medallionFill: 'rgba(194, 149, 59, 0.08)',
    medallionText: '#9F7523',
  },
  masjid_al_nabawi: {
    id: 'masjid_al_nabawi',
    isDark: false,
    pageBg: 'bg-[#121917]',
    surfaceBg: 'bg-[#ECEFF1]',
    secondarySurfaceBg: 'bg-[#E2E7EA]',
    inkPrimary: 'text-[#1D242B]',
    inkSecondary: 'text-[#394551]',
    inkMuted: 'text-[#596672]',
    goldHex: '#A67C37',
    goldText: 'text-[#7F5C22]',
    hairline: 'border-[#25313D]/20',
    accentHairline: 'border-[#1E6B38]/40',
    activeRowClass: 'bg-[#1E6B38]/12 text-[#123D21]',
    activeAccentText: 'text-[#1E6B38]',
    nextRowClass: 'bg-[#641C2B]/[0.07]',
    greenBandBg: 'bg-[#1E6B38] text-white',
    greenBandAccent: 'text-[#E7F5EC]',
    footerBg: 'bg-[#E2E7EA] text-[#1D242B]',
    medallionStroke: '#9A7D56',
    medallionFill: 'rgba(154, 125, 86, 0.06)',
    medallionText: '#8E6235',
  },

  // === DEDICATED UZBEK CYRILLIC TABLO (/masjid-tv) ===
  masjid_namoz_tablosa_uz_cyrl: {
    id: 'masjid_namoz_tablosa_uz_cyrl',
    isDark: false,
    pageBg: 'bg-[#121917]',
    surfaceBg: 'bg-[#ECEFF1]',
    secondarySurfaceBg: 'bg-[#E2E7EA]',
    inkPrimary: 'text-[#1D242B]',
    inkSecondary: 'text-[#394551]',
    inkMuted: 'text-[#596672]',
    goldHex: '#9A7D56',
    goldText: 'text-[#7F5C22]',
    hairline: 'border-[#25313D]/22',
    accentHairline: 'border-[#1E6B38]/42',
    activeRowClass: 'bg-[#1E6B38]/12 text-[#123D21]',
    activeAccentText: 'text-[#1E6B38]',
    nextRowClass: 'bg-[#641C2B]/[0.07]',
    greenBandBg: 'bg-[#1E6B38] text-white',
    greenBandAccent: 'text-[#E7F5EC]',
    footerBg: 'bg-[#E2E7EA] text-[#1D242B]',
    medallionStroke: '#9A7D56',
    medallionFill: 'rgba(154, 125, 86, 0.06)',
    medallionText: '#8E6235',
  },
};
