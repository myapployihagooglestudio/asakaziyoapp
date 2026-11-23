import React, { useState, useEffect, useMemo } from 'react';
import { BASELINE_MOSQUES, MosqueDirectoryItem } from '../../../data/superAppData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { MapPin, Compass, Clock, Search, Navigation, Users, CheckCircle2 } from 'lucide-react';

export const MosquesDirectoryView: React.FC = () => {
  const [mosques, setMosques] = useState<MosqueDirectoryItem[]>(BASELINE_MOSQUES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMosque, setSelectedMosque] = useState<MosqueDirectoryItem>(BASELINE_MOSQUES[0]);

  // Live Magnetometer Qibla Compass State
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorStatus, setSensorStatus] = useState<'idle' | 'active' | 'unsupported' | 'denied'>('idle');

  useEffect(() => {
    let active = true;
    fetch('/api/database/mosques')
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (json?.success && Array.isArray(json.mosques) && json.mosques.length > 0) {
          const byId = new Map<string, MosqueDirectoryItem>();
          for (const b of BASELINE_MOSQUES) byId.set(b.id, b);
          for (const m of json.mosques) {
            if (m?.id && m?.name) {
              byId.set(m.id, {
                ...BASELINE_MOSQUES.find((x) => x.id === m.id),
                ...m,
                facilities: Array.isArray(m.facilities) ? m.facilities : [],
              });
            }
          }
          const list = Array.from(byId.values());
          setMosques(list);
          setSelectedMosque((prev) => list.find((x) => x.id === prev.id) || list[0]);
        }
      })
      .catch(() => {
        // offline fallback to verified baseline mosques
      });
    return () => {
      active = false;
    };
  }, []);

  const startLiveCompass = async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSensorStatus('unsupported');
      return;
    }

    const OrientationEvent = window.DeviceOrientationEvent as any;
    if (typeof OrientationEvent.requestPermission === 'function') {
      try {
        const perm = await OrientationEvent.requestPermission();
        if (perm !== 'granted') {
          setSensorStatus('denied');
          return;
        }
      } catch {
        setSensorStatus('denied');
        return;
      }
    }

    const handleOrientation = (ev: DeviceOrientationEvent) => {
      const anyEv = ev as any;
      let compassHeading: number | null = null;
      if (typeof anyEv.webkitCompassHeading === 'number') {
        compassHeading = anyEv.webkitCompassHeading;
      } else if (typeof ev.alpha === 'number') {
        compassHeading = (360 - ev.alpha) % 360;
      }
      if (compassHeading !== null && Number.isFinite(compassHeading)) {
        setHeading(Math.round(compassHeading));
        setSensorStatus('active');
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    setSensorStatus('active');
  };

  const filteredMosques = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mosques;
    return mosques.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.district.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q)
    );
  }, [mosques, searchQuery]);

  const qiblaAngle = selectedMosque.qiblaDeg || 241;
  const relativeNeedleDeg = heading !== null ? (qiblaAngle - heading + 360) % 360 : qiblaAngle;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-3xl bg-[#03170F] text-[#FFF8E8] border border-[#DFBD69]/35 p-6 sm:p-8 shadow-xl">
        <p className="text-xs font-semibold tracking-widest uppercase text-[#DFBD69]">
          Masjidlar Katalogi · Xarita · Jonli Qibla Kompasi (241°)
        </p>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 text-balance">
          Asaka va Andijon Masjidlari Katalogi
        </h1>
        <p className="text-sm sm:text-base text-[#E6DFCE]/85 mt-2 max-w-2xl leading-relaxed">
          Hududdagi rasmiy jomeʼ masjidlari manzillari, Juma vaqtlari, qulayliklari, xarita yoʻnalishi hamda jonli Qibla kompas sensori.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Mosque List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#526B62] dark:text-[#9CB5AC] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masjid nomi yoki hudud boʻyicha qidirish..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#041D13] border border-[#063D32]/15 dark:border-[#DFBD69]/25 text-sm text-[#03170F] dark:text-[#FFF8E8] focus:outline-none focus:border-[#DFBD69]"
            />
          </div>

          <div className="space-y-3">
            {filteredMosques.map((mosque) => {
              const isSelected = selectedMosque.id === mosque.id;
              return (
                <button
                  key={mosque.id}
                  onClick={() => setSelectedMosque(mosque)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#063D32] text-[#FFF8E8] border-[#DFBD69] shadow-md'
                      : 'bg-white dark:bg-[#041D13] text-[#03170F] dark:text-[#FFF8E8] border-[#063D32]/12 dark:border-[#DFBD69]/20 hover:border-[#DFBD69]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#DFBD69]' : 'text-[#8A6621] dark:text-[#DFBD69]'
                        }`}
                      >
                        {mosque.district} · {mosque.region}
                        {mosque.isPrimary ? ' · Bosh markaz' : ''}
                      </div>
                      <h2 className="text-base sm:text-lg font-bold">{mosque.name}</h2>
                      <p
                        className={`text-xs ${
                          isSelected ? 'text-[#E6DFCE]/85' : 'text-[#526B62] dark:text-[#9CB5AC]'
                        }`}
                      >
                        {mosque.address}
                      </p>
                    </div>
                    <MapPin className={`w-5 h-5 shrink-0 ${isSelected ? 'text-[#DFBD69]' : 'text-[#063D32] dark:text-[#DFBD69]'}`} />
                  </div>

                  <div
                    className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${
                      isSelected
                        ? 'border-[#DFBD69]/25 text-[#FFF6C8]'
                        : 'border-[#063D32]/10 dark:border-[#DFBD69]/15 text-[#526B62] dark:text-[#9CB5AC]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Juma: {mosque.jumaTime}
                    </span>
                    {mosque.capacity && (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Users className="w-3.5 h-3.5" />
                        Sigʻimi: {mosque.capacity} kishi
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Mosque Detail + Map Coordinates + Live Qibla Compass */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-6 space-y-4 border border-[#063D32]/15 dark:border-[#DFBD69]/30">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#8A6621] dark:text-[#DFBD69]">
                Tanlangan masjid · {selectedMosque.district}
              </div>
              <h2 className="text-xl font-bold text-[#03170F] dark:text-[#FFF8E8]">
                {selectedMosque.name}
              </h2>
              <p className="text-sm text-[#1E3F35] dark:text-[#E6DFCE] leading-relaxed pt-1">
                {selectedMosque.descriptionUz}
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#063D32]/15 dark:border-[#DFBD69]/25 bg-[#F8F5EC] dark:bg-[#092E1F]/50">
              <iframe
                title={`${selectedMosque.name} xaritasi`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedMosque.lng - 0.015}%2C${selectedMosque.lat - 0.01}%2C${selectedMosque.lng + 0.015}%2C${selectedMosque.lat + 0.01}&layer=mapnik&marker=${selectedMosque.lat}%2C${selectedMosque.lng}`}
                className="w-full h-52 border-0"
                loading="lazy"
              />
            </div>

            {selectedMosque.facilities.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#526B62] dark:text-[#9CB5AC]">
                  Masjid qulayliklari:
                </div>
                <div className="space-y-1.5">
                  {selectedMosque.facilities.map((fac, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#03170F] dark:text-[#FFF8E8]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#063D32] dark:text-[#DFBD69] shrink-0" />
                      <span>{fac}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedMosque.lat},${selectedMosque.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-[#063D32] dark:bg-[#DFBD69] text-[#FFF8E8] dark:text-[#010906] font-bold text-sm hover:brightness-105 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Xaritada yoʻnalish olish ({selectedMosque.lat.toFixed(4)}, {selectedMosque.lng.toFixed(4)})</span>
            </a>
          </Card>

          {/* Live Qibla Compass Card */}
          <Card className="p-6 space-y-4 border border-[#DFBD69]/35 bg-[#F8F5EC] dark:bg-[#041D13]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#03170F] dark:text-[#FFF8E8]">
                  Qibla Yoʻnalishi Kompasi
                </h3>
                <p className="text-xs text-[#526B62] dark:text-[#9CB5AC] tabular-nums">
                  Azimut: {qiblaAngle}° (Gʻarb–Janubi-Gʻarb · Kaʼba tomon)
                </p>
              </div>
              <Compass className="w-6 h-6 text-[#DFBD69]" />
            </div>

            <div className="flex flex-col items-center py-2">
              <div className="relative w-44 h-44 rounded-full border-2 border-[#063D32]/25 dark:border-[#DFBD69]/40 bg-white dark:bg-[#03170F] flex items-center justify-center shadow-inner">
                <span className="absolute top-2 text-[11px] font-bold text-[#526B62] dark:text-[#9CB5AC]">N</span>
                <span className="absolute right-2.5 text-[11px] font-bold text-[#526B62] dark:text-[#9CB5AC]">E</span>
                <span className="absolute bottom-2 text-[11px] font-bold text-[#526B62] dark:text-[#9CB5AC]">S</span>
                <span className="absolute left-2.5 text-[11px] font-bold text-[#526B62] dark:text-[#9CB5AC]">W</span>

                <div
                  className="w-1 h-32 relative transition-transform duration-300 ease-out"
                  style={{ transform: `rotate(${relativeNeedleDeg}deg)` }}
                >
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[26px] border-l-transparent border-r-transparent border-b-[#063D32] dark:border-b-[#DFBD69] absolute -top-1 left-1/2 -translate-x-1/2" />
                  <div className="w-1 h-16 bg-[#063D32] dark:bg-[#DFBD69] mx-auto mt-3 rounded-full" />
                  <div className="w-1 h-12 bg-[#526B62]/30 mx-auto rounded-full" />
                </div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#DFBD69] border-2 border-[#03170F] absolute" />
              </div>

              <div className="mt-4 text-center space-y-2">
                {sensorStatus === 'active' && heading !== null ? (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    Jonli kompas faol · Qurilma yoʻnalishi: {heading}° · Qibla burilishi: {relativeNeedleDeg}°
                  </p>
                ) : sensorStatus === 'unsupported' ? (
                  <p className="text-xs text-[#526B62] dark:text-[#9CB5AC]">
                    Ushbu qurilmada magnitometr sensori mavjud emas — Asaka uchun tasdiqlangan statik 241° koʻrsatilmoqda.
                  </p>
                ) : sensorStatus === 'denied' ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Kompas sensori ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering.
                  </p>
                ) : (
                  <Button onClick={startLiveCompass} variant="secondary">
                    Jonli kompas sensorini yoqish
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
