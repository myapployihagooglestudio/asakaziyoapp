import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import {
  ASAKA_CANONICAL_CITY_ID,
  CityLocationDefinition,
  GLOBAL_CANONICAL_CITIES,
  UZBEKISTAN_14_REGIONS,
} from '../../../data/globalLocationsData';
import type { GeocodedCityResult } from '../../../services/globalWeatherService';
import {
  UserLocationPreference,
  resolveGpsLocationClient,
  searchLocationsClient,
} from '../../../utils/globalPrayerClient';
import {
  MapPin,
  Search,
  Globe,
  Compass,
  ShieldCheck,
  LocateFixed,
  Loader2,
  Check,
  RefreshCw,
} from 'lucide-react';

interface GlobalLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPref: UserLocationPreference;
  onSelectLocation: (nextPref: UserLocationPreference) => void;
}

export const GlobalLocationPickerModal: React.FC<GlobalLocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentPref,
  onSelectLocation,
}) => {
  const [section, setSection] = useState<'uzbekistan' | 'global' | 'search'>('uzbekistan');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('uz-andijan');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchBuiltIn, setSearchBuiltIn] = useState<CityLocationDefinition[]>([]);
  const [searchGeocoded, setSearchGeocoded] = useState<GeocodedCityResult[]>([]);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isResolvingGps, setIsResolvingGps] = useState(false);
  const [syncAcrossDevices, setSyncAcrossDevices] = useState<boolean>(currentPref.syncAcrossDevices);

  useEffect(() => {
    setSyncAcrossDevices(currentPref.syncAcrossDevices);
  }, [currentPref.syncAcrossDevices]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchBuiltIn([]);
      setSearchGeocoded([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchLocationsClient(q);
        setSearchBuiltIn(res.builtIn);
        setSearchGeocoded(res.geocoded);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const activeRegion =
    UZBEKISTAN_14_REGIONS.find((r) => r.regionId === selectedRegionId) || UZBEKISTAN_14_REGIONS[1];

  const handleChooseBuiltIn = (loc: CityLocationDefinition, districtId?: string) => {
    onSelectLocation({
      ...currentPref,
      cityId: loc.id,
      districtId: districtId || loc.districtId,
      customLocation: null,
      calculationMethod: loc.id === ASAKA_CANONICAL_CITY_ID ? undefined : loc.defaultMethod,
      asrMethod: loc.id === ASAKA_CANONICAL_CITY_ID ? undefined : loc.defaultAsr,
      syncAcrossDevices,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleChooseGeocoded = (geo: GeocodedCityResult) => {
    const customLoc: CityLocationDefinition = {
      id: geo.id,
      countryCode: geo.countryCode,
      countryName: geo.countryName,
      regionId: 'global-geocoded',
      regionName: geo.regionName || geo.countryName,
      cityId: geo.id,
      cityName: geo.cityName,
      districtId: 'center',
      districtName: geo.cityName,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
      sourceMode: 'AUTO_CALCULATED',
      defaultMethod: 'MWL',
      defaultAsr: 'HANAFI',
      featuredGroup: 'global',
    };
    onSelectLocation({
      ...currentPref,
      cityId: customLoc.id,
      districtId: 'center',
      customLocation: customLoc,
      calculationMethod: 'MWL',
      asrMethod: 'HANAFI',
      syncAcrossDevices,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleDetectGps = async () => {
    setIsResolvingGps(true);
    setGpsStatus('GPS koordinatalari aniqlanmoqda...');
    try {
      const res = await resolveGpsLocationClient();
      if (res.ok && res.location) {
        setGpsStatus(
          `Topildi: ${res.location.cityName} (${res.location.regionName}, ${res.location.countryName})${
            typeof res.distanceKm === 'number' ? ` · ${res.distanceKm} km` : ''
          }`
        );
        handleChooseBuiltIn(res.location, res.location.districtId);
      } else {
        setGpsStatus(res.error || 'Joylashuvni aniqlab bo‘lmadi.');
      }
    } finally {
      setIsResolvingGps(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hudud va Shahar Tanlash (Global Taqvim)"
      subtitle="Asaka (Admin MANUAL) · O‘zbekistonning 14 hududi · Makka/Madina · Dunyo shaharlari"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Top Quick Actions: Asaka MANUAL + Haramain + GPS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              const asaka = UZBEKISTAN_14_REGIONS[1].cities.find((c) => c.id === ASAKA_CANONICAL_CITY_ID)!;
              handleChooseBuiltIn(asaka, 'asaka-tumani');
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
              currentPref.cityId === ASAKA_CANONICAL_CITY_ID
                ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                : 'bg-white/5 border-white/10 text-stone-200 hover:border-emerald-400/50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Asaka shahri (Rasmiy MANUAL)</div>
                <div className="text-[11px] text-emerald-300/90 truncate">
                  Faqat administrator jadvali · O‘zgartirilmaydi
                </div>
              </div>
            </div>
            {currentPref.cityId === ASAKA_CANONICAL_CITY_ID && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          </button>

          <button
            type="button"
            disabled={isResolvingGps}
            onClick={handleDetectGps}
            className="p-3 rounded-xl border border-[#C8A85E]/40 bg-[#C8A85E]/10 hover:bg-[#C8A85E]/20 text-[#F7F4EC] text-left transition-all cursor-pointer flex items-center gap-2.5"
          >
            {isResolvingGps ? (
              <Loader2 className="w-5 h-5 text-[#C8A85E] animate-spin shrink-0" />
            ) : (
              <LocateFixed className="w-5 h-5 text-[#C8A85E] shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold">GPS orqali aniqlash</div>
              <div className="text-[11px] text-stone-300 truncate">
                Ruxsat berilmasa, qo‘lda tanlang
              </div>
            </div>
          </button>
        </div>

        {gpsStatus && (
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-amber-200">
            {gpsStatus}
          </div>
        )}

        {/* Quick Featured Haramain Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GLOBAL_CANONICAL_CITIES.filter((c) => c.featuredGroup === 'haramain').map((city) => {
            const active = currentPref.cityId === city.id;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => handleChooseBuiltIn(city)}
                className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#C8A85E]/20 border-[#C8A85E] text-white'
                    : 'bg-white/5 border-white/10 text-stone-300 hover:border-white/30'
                }`}
              >
                <div className="text-xs font-bold truncate">{city.cityName}</div>
                <div className="text-[10px] text-stone-400 truncate">{city.countryName}</div>
              </button>
            );
          })}
        </div>

        {/* Section Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/30 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setSection('uzbekistan')}
            className={`py-2 rounded-lg font-semibold cursor-pointer transition-colors ${
              section === 'uzbekistan' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:text-white'
            }`}
          >
            O‘zbekiston (14 hudud)
          </button>
          <button
            type="button"
            onClick={() => setSection('global')}
            className={`py-2 rounded-lg font-semibold cursor-pointer transition-colors ${
              section === 'global' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:text-white'
            }`}
          >
            Dunyo shaharlari
          </button>
          <button
            type="button"
            onClick={() => setSection('search')}
            className={`py-2 rounded-lg font-semibold cursor-pointer transition-colors ${
              section === 'search' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:text-white'
            }`}
          >
            Global qidiruv
          </button>
        </div>

        {/* SECTION 1: UZBEKISTAN 14 REGIONS + CITIES + DISTRICTS */}
        {section === 'uzbekistan' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 max-h-[42vh] overflow-y-auto pr-1">
            <div className="md:col-span-5 space-y-1">
              {UZBEKISTAN_14_REGIONS.map((reg, idx) => (
                <button
                  key={reg.regionId}
                  type="button"
                  onClick={() => setSelectedRegionId(reg.regionId)}
                  className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                    selectedRegionId === reg.regionId
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-bold'
                      : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <span className="truncate">
                    {idx + 1}. {reg.regionName}
                  </span>
                  <span className="text-[10px] opacity-70">{reg.cities.length}</span>
                </button>
              ))}
            </div>

            <div className="md:col-span-7 space-y-2.5">
              <div className="text-xs font-bold text-[#C8A85E] px-1">
                {activeRegion.regionName} — Shahar va tumanlar ({activeRegion.timezone})
              </div>
              {activeRegion.cities.map((city) => {
                const isSelectedCity = currentPref.cityId === city.id;
                const isAsaka = city.id === ASAKA_CANONICAL_CITY_ID;
                return (
                  <div
                    key={city.id}
                    className={`p-3 rounded-xl border space-y-2 ${
                      isSelectedCity
                        ? 'bg-emerald-500/15 border-emerald-500/50'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{city.cityName}</span>
                          {isAsaka && (
                            <span className="text-[10px] font-mono text-emerald-300">
                              [MANUAL_ADMIN]
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono-numbers">
                          {city.latitude.toFixed(3)}°N, {city.longitude.toFixed(3)}°E
                        </div>
                      </div>
                      <Button
                        variant={isSelectedCity ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleChooseBuiltIn(city)}
                        className="text-[11px]"
                      >
                        {isSelectedCity ? 'Tanlangan' : 'Tanlash'}
                      </Button>
                    </div>

                    {city.districts && city.districts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/10">
                        {city.districts.map((dist) => {
                          const distSelected =
                            isSelectedCity && currentPref.districtId === dist.id;
                          return (
                            <button
                              key={dist.id}
                              type="button"
                              onClick={() => handleChooseBuiltIn(city, dist.id)}
                              className={`px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors border ${
                                distSelected
                                  ? 'bg-[#C8A85E] text-[#05120E] border-[#C8A85E] font-bold'
                                  : 'bg-black/30 text-stone-300 border-white/10 hover:border-white/30'
                              }`}
                            >
                              {dist.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: GLOBAL CANONICAL CITIES */}
        {section === 'global' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[42vh] overflow-y-auto pr-1">
            {GLOBAL_CANONICAL_CITIES.map((city) => {
              const active = currentPref.cityId === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleChooseBuiltIn(city)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                      : 'bg-white/5 border-white/10 text-stone-200 hover:border-white/30'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#C8A85E] shrink-0" />
                      <span className="truncate">{city.cityName}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 truncate">
                      {city.countryName} · {city.timezone} · {city.defaultMethod}
                    </div>
                  </div>
                  {active && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* SECTION 3: LIVE WORLDWIDE SEARCH (OPEN-METEO GEOCODING + BUILT-IN) */}
        {section === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Istalgan shaharni yozing: Samarqand, Makka, Istanbul, London, Tokyo..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-stone-400 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {isSearching && (
              <div className="flex items-center gap-2 text-xs text-stone-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Dunyo shaharlari qidirilmoqda...</span>
              </div>
            )}

            <div className="space-y-2 max-h-[34vh] overflow-y-auto pr-1">
              {searchBuiltIn.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleChooseBuiltIn(loc)}
                  className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      {loc.cityName} — {loc.regionName}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {loc.countryName} · {loc.timezone} · {loc.sourceMode}
                    </div>
                  </div>
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>
              ))}

              {searchGeocoded.map((geo) => (
                <button
                  key={geo.id}
                  type="button"
                  onClick={() => handleChooseGeocoded(geo)}
                  className="w-full p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      {geo.cityName} {geo.regionName && geo.regionName !== geo.countryName ? `(${geo.regionName})` : ''}
                    </div>
                    <div className="text-[11px] text-sky-200/80">
                      {geo.countryName} · {geo.timezone} · {geo.latitude.toFixed(2)}, {geo.longitude.toFixed(2)}
                    </div>
                  </div>
                  <Globe className="w-4 h-4 text-sky-300 shrink-0" />
                </button>
              ))}

              {!isSearching &&
                searchQuery.trim().length >= 2 &&
                searchBuiltIn.length === 0 &&
                searchGeocoded.length === 0 && (
                  <div className="text-xs text-stone-400 text-center py-6">
                    Hech qanday shahar topilmadi. Boshqa nom bilan izlab ko‘ring.
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Footer: Cross-Device Sync Toggle */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={syncAcrossDevices}
              onChange={(e) => setSyncAcrossDevices(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-emerald-500"
            />
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Web, Telegram va Android o‘rtasida hududni sinxronlash</span>
          </label>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Yopish
          </Button>
        </div>
      </div>
    </Modal>
  );
};
