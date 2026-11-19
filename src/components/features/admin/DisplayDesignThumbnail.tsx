import React from 'react';
import { CanonicalDisplayProfileId } from '../../../utils/smartMosqueDisplayEngine';

interface DisplayDesignThumbnailProps {
  profileId: CanonicalDisplayProfileId;
  sampleClock?: string;
  samplePrayers?: [string, string][];
}

/**
 * Accurate live-composition architectural thumbnail previews for all 11 Smart Mosque Display profiles.
 * Zero Arabic script; uses real localized prayer labels when passed from the active admin language.
 */
export const DisplayDesignThumbnail: React.FC<DisplayDesignThumbnailProps> = ({
  profileId,
  sampleClock = '04:44:20',
  samplePrayers = [
    ['BOMDOD', '05:14'],
    ['PESHIN', '12:06'],
    ['ASR', '15:15'],
    ['SHOM', '17:37'],
    ['XUFTON', '19:07'],
  ],
}) => {
  // 1. MASJID AL-NABAWI & DEDICATED UZBEK CYRILLIC TABLO (Faithful Reference Preview)
  if (profileId === 'masjid_al_nabawi' || profileId === 'masjid_namoz_tablosa_uz_cyrl') {
    const rows: [string, string][] =
      profileId === 'masjid_namoz_tablosa_uz_cyrl'
        ? [
            ['БОМДОД', '05:14'],
            ['ПЕШИН', '12:06'],
            ['АСР', '15:15'],
            ['ШОМ', '17:37'],
            ['ХУФТОН', '19:07'],
          ]
        : samplePrayers;
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-[#151D1A] p-2 flex items-center justify-center overflow-hidden">
        <div className="h-full aspect-[9/14] bg-[#E8EEF1] text-[#1D252B] rounded-md shadow-lg flex flex-col justify-between overflow-hidden border border-black/15">
          <div className="px-2 pt-1.5 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[7px] font-mono-numbers font-bold px-1 border border-[#9D835C] text-[#8C5B32]">
                10
              </span>
              <span className="text-[11px] font-mono-numbers font-extrabold tracking-tight text-[#1D2B2F]">
                {sampleClock}
              </span>
              <span className="text-[7px] font-mono-numbers font-bold px-1 border border-[#9D835C] text-[#8C5B32]">
                30
              </span>
            </div>
          </div>
          <div className="px-2.5 space-y-[2px]">
            {rows.map(([name, time], idx) => (
              <div
                key={name}
                className={`flex items-center justify-between text-[7.5px] px-1 rounded ${
                  idx === 1 ? 'bg-[#1E6B38]/12' : ''
                }`}
              >
                <span className="font-extrabold truncate">{name}</span>
                <span className="font-mono-numbers font-extrabold text-[#5E1828]">{time}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#1D2B2F]/30 px-2 py-0.5 grid grid-cols-2 text-center text-[7px] font-mono-numbers font-extrabold">
            <span className="text-[#1A5836]">06:53</span>
            <span className="text-[#5E1828]">06:33</span>
          </div>
          <div className="bg-[#1E6B38] text-white px-2 py-1 grid grid-cols-2 text-center text-[8px] font-mono-numbers font-extrabold mb-0.5">
            <span>12:06</span>
            <span>00:53</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. SULTAN ROYAL (Deep Emerald + Gold Architectural Geometry)
  if (profileId === 'sultan_royal') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-[#041D14] text-[#FDFBF4] border border-[#E5C36A]/45 p-2.5 flex flex-col justify-between relative overflow-hidden">
        <div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
          <div className="col-span-5 bg-[#03150F] border border-[#E5C36A]/30 rounded-lg p-2 flex flex-col justify-between">
            <div className="text-[7px] font-bold tracking-widest text-[#E5C36A]">ASAKA ZIYO</div>
            <div className="text-[13px] font-mono-numbers font-extrabold leading-none">{sampleClock.slice(0, 5)}</div>
            <div className="rounded bg-[#0A3A27] border border-[#E5C36A]/35 px-1.5 py-1 text-[8px] font-mono-numbers font-bold text-[#FFE69D]">
              00:42:18
            </div>
          </div>
          <div className="col-span-7 flex flex-col justify-between py-0.5">
            {samplePrayers.map(([name, time], idx) => (
              <div
                key={name}
                className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[8px] ${
                  idx === 1 ? 'bg-[#0F633A] ring-1 ring-[#E5C36A]/65 font-extrabold' : 'opacity-85'
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="font-mono-numbers font-bold text-[#FFE69D]">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. NOOR CLASSIC (Warm Ivory & White Marble Luxury)
  if (profileId === 'noor_classic') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-gradient-to-br from-[#FDFCFA] to-[#F2ECE0] text-[#13221C] border border-[#B88E3D]/40 overflow-hidden flex flex-col justify-between">
        <div className="h-[3px] w-full bg-[#B88E3D]" />
        <div className="px-3 pt-1.5 flex items-center justify-between border-b border-[#B88E3D]/25 pb-1">
          <span className="text-[7.5px] font-extrabold tracking-widest text-[#9F7628]">ASAKA ZIYO</span>
          <span className="text-[12px] font-mono-numbers font-extrabold">{sampleClock.slice(0, 5)}</span>
        </div>
        <div className="px-3 py-1 space-y-[2px]">
          {samplePrayers.slice(0, 4).map(([name, time], idx) => (
            <div
              key={name}
              className={`flex items-center justify-between px-1.5 py-[1px] rounded text-[8px] ${
                idx === 1 ? 'bg-[#125635] text-white font-extrabold' : ''
              }`}
            >
              <span>{name}</span>
              <span className="font-mono-numbers font-bold">{time}</span>
            </div>
          ))}
        </div>
        <div className="mx-3 mb-2 rounded-md bg-[#125635] text-white px-2 py-1 flex items-center justify-between text-[8px] font-mono-numbers font-extrabold">
          <span className="text-[#F5DC93]">12:06</span>
          <span>00:42:18</span>
        </div>
      </div>
    );
  }

  // 4. MIDNIGHT PREMIUM (Deep Navy + Dark Emerald + Crisp White)
  if (profileId === 'midnight_premium') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-gradient-to-br from-[#07162E] via-[#09182D] to-[#062223] text-[#F8FAFC] border border-[#CBD5E1]/25 p-2.5 flex flex-col justify-between">
        <div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
          <div className="col-span-5 bg-[#060F20]/80 border border-[#CBD5E1]/18 rounded-lg p-2 flex flex-col justify-between">
            <div className="text-[7px] font-bold tracking-widest text-[#D6B66C]">ASAKA ZIYO</div>
            <div className="text-[13px] font-mono-numbers font-extrabold leading-none text-white">{sampleClock.slice(0, 5)}</div>
            <div className="rounded bg-[#0D3D38] border border-[#D6B66C]/35 px-1.5 py-1 text-[8px] font-mono-numbers font-bold text-[#F0D898]">
              00:42:18
            </div>
          </div>
          <div className="col-span-7 flex flex-col justify-between py-0.5">
            {samplePrayers.map(([name, time], idx) => (
              <div
                key={name}
                className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[8px] ${
                  idx === 1 ? 'bg-[#0F4C45] ring-1 ring-[#D6B66C]/50 font-extrabold' : 'text-[#CBD5E1]'
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="font-mono-numbers font-bold text-white">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 5. VISION MODERN (Clean Alabaster 5-Column Swiss Grid)
  if (profileId === 'vision_modern') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-white text-[#0F172A] border border-[#0F172A]/15 p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-[#0F5C3B]/25 pb-1">
          <span className="text-[7.5px] font-extrabold tracking-widest text-[#0F5C3B]">ASAKA ZIYO</span>
          <span className="text-[12px] font-mono-numbers font-extrabold">{sampleClock.slice(0, 5)}</span>
        </div>
        <div className="grid grid-cols-5 gap-1 my-1 flex-1">
          {samplePrayers.map(([name, time], idx) => (
            <div
              key={name}
              className={`rounded-md p-1 flex flex-col justify-between text-center border ${
                idx === 1
                  ? 'bg-[#0F5C3B] text-white border-[#0F5C3B]'
                  : 'bg-[#F8F9F7] border-[#0F172A]/10'
              }`}
            >
              <span className="text-[6px] font-bold truncate">{name.slice(0, 5)}</span>
              <span className="text-[8.5px] font-mono-numbers font-extrabold">{time}</span>
            </div>
          ))}
        </div>
        <div className="h-2.5 rounded bg-[#0F5C3B]/12 flex items-center justify-between px-2 text-[6.5px] font-mono-numbers font-bold text-[#0F5C3B]">
          <span>06:33</span>
          <span>12:06</span>
          <span>00:42</span>
        </div>
      </div>
    );
  }

  // 6. ISLAMIC HERITAGE (Deep Emerald Outer Frame + Warm Ivory Inner Sanctuary + Gold Motifs)
  if (profileId === 'islamic_heritage') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-[#073022] p-2 flex flex-col">
        <div className="flex-1 rounded-lg bg-[#F7F3E9] text-[#10261D] border border-[#C2953B]/75 p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#C2953B]/35 pb-1">
            <span className="text-[7px] font-extrabold tracking-widest text-[#9F7523]">ASAKA ZIYO</span>
            <span className="text-[11px] font-mono-numbers font-extrabold">{sampleClock.slice(0, 5)}</span>
          </div>
          <div className="space-y-[2px]">
            {samplePrayers.slice(0, 4).map(([name, time], idx) => (
              <div
                key={name}
                className={`flex items-center justify-between px-1.5 py-[1px] rounded text-[7.5px] ${
                  idx === 1 ? 'bg-[#0B4E2F] text-white font-extrabold' : ''
                }`}
              >
                <span>{name}</span>
                <span className="font-mono-numbers font-bold">{time}</span>
              </div>
            ))}
          </div>
          <div className="rounded bg-[#0B4E2F] text-[#F5DB8F] px-2 py-0.5 flex items-center justify-between text-[7.5px] font-mono-numbers font-extrabold">
            <span>12:06</span>
            <span className="text-white">00:42:18</span>
          </div>
        </div>
      </div>
    );
  }

  // ORIGINAL 4 CLASSIC PROFILES THUMBNAILS
  if (profileId === 'emerald_royal') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-[#041A12] text-[#FAF7F0] border border-[#DFBD69]/40 p-2.5 flex items-center justify-between gap-2">
        <div className="w-[42%] h-full bg-[#03150E] rounded-lg p-1.5 flex flex-col justify-between border border-[#DFBD69]/20">
          <span className="text-[7px] text-[#DFBD69] font-bold">ASAKA ZIYO</span>
          <span className="text-[12px] font-mono-numbers font-extrabold">{sampleClock.slice(0, 5)}</span>
          <span className="text-[7.5px] font-mono-numbers text-[#FFE498]">00:42</span>
        </div>
        <div className="flex-1 h-full flex flex-col justify-between">
          {samplePrayers.map(([n, t], i) => (
            <div key={n} className={`flex justify-between px-1.5 py-[1px] rounded text-[7.5px] ${i === 1 ? 'bg-[#0E5E38]' : ''}`}>
              <span>{n}</span>
              <span className="font-mono-numbers font-bold">{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (profileId === 'modern_minimal') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-[#FAFAF8] text-[#0A1D16] border border-[#0A1D16]/15 p-2.5 flex flex-col justify-between">
        <div className="flex justify-between text-[8px] font-bold border-b border-black/10 pb-1">
          <span>ASAKA ZIYO</span>
          <span className="font-mono-numbers">{sampleClock.slice(0, 5)}</span>
        </div>
        <div className="grid grid-cols-5 divide-x divide-black/10 flex-1 my-1">
          {samplePrayers.map(([n, t], i) => (
            <div key={n} className={`flex flex-col items-center justify-center p-0.5 ${i === 1 ? 'bg-[#0B4C2E] text-white' : ''}`}>
              <span className="text-[6px] font-bold">{n.slice(0, 4)}</span>
              <span className="text-[8px] font-mono-numbers font-extrabold">{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (profileId === 'madina_portrait') {
    return (
      <div className="w-full aspect-[16/10] rounded-xl bg-[#07130E] p-2 flex items-center justify-center">
        <div className="h-full aspect-[9/14] bg-[#F5F3EC] text-[#0D241C] rounded-md p-1.5 flex flex-col justify-between">
          <div className="text-center text-[10px] font-mono-numbers font-extrabold">{sampleClock.slice(0, 5)}</div>
          <div className="space-y-[1.5px]">
            {samplePrayers.map(([n, t], i) => (
              <div key={n} className={`flex justify-between px-1 text-[7px] rounded ${i === 1 ? 'bg-[#0E5A35] text-white' : ''}`}>
                <span>{n.slice(0, 5)}</span>
                <span className="font-mono-numbers font-bold">{t}</span>
              </div>
            ))}
          </div>
          <div className="bg-[#0E5A35] text-white text-center text-[7px] font-mono-numbers font-bold py-0.5 rounded">
            12:06 · 00:42
          </div>
        </div>
      </div>
    );
  }

  // Royal Ivory default
  return (
    <div className="w-full aspect-[16/10] rounded-xl bg-[#F5F2EA] text-[#0B231A] border border-[#B08533]/40 p-2.5 flex flex-col justify-between">
      <div className="flex justify-between items-center border-b border-[#B08533]/35 pb-1">
        <span className="text-[7.5px] font-extrabold text-[#9A6F22]">ASAKA ZIYO</span>
        <span className="text-[12px] font-mono-numbers font-extrabold">{sampleClock.slice(0, 5)}</span>
      </div>
      <div className="space-y-[2px]">
        {samplePrayers.slice(0, 4).map(([n, t], i) => (
          <div key={n} className={`flex justify-between px-1.5 py-[1px] rounded text-[8px] ${i === 1 ? 'bg-[#0D5A35] text-white font-bold' : ''}`}>
            <span>{n}</span>
            <span className="font-mono-numbers font-bold">{t}</span>
          </div>
        ))}
      </div>
      <div className="rounded bg-[#0D5A35] text-white px-2 py-0.5 flex justify-between text-[7.5px] font-mono-numbers font-bold">
        <span className="text-[#F3D788]">12:06</span>
        <span>00:42:18</span>
      </div>
    </div>
  );
};
