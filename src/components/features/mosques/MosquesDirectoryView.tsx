import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { BASELINE_MOSQUES, MosqueDirectoryItem } from '../../../data/superAppData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  SpatialTiltCard,
  StaggerGrid,
  StaggerCard,
  ScrambleText,
} from '../../ui/MotionPrimitives';
import { MOTION_SPRINGS } from '../../../utils/motionSystem';
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
    <div className="space-y-8 pb-16">
      <PageHero
        variant="spatial"
        kicker="Masjidlar Katalogi · Xarita · Jonli Qibla Kompasi"
        title="Asaka va Andijon Masjidlari"
        subtitle="Hududdagi rasmiy jomeʼ masjidlari manzillari, Juma vaqtlari, qulayliklari, xarita yoʻnalishi hamda jonli Qibla kompas sensori."
        imageSrc="/images/asaka_islamic_architecture_1793634657962.jpg"
        imageAlt="Asaka masjidlari"
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs text-[#C8A85E] font-semibold uppercase tracking-[0.14em]">
              <span>Qibla Azimuti</span>
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-3xl font-display font-extrabold font-mono-numbers text-[#F7F4EC]">
              <ScrambleText text={`${qiblaAngle}° SW`} />
            </div>
            <p className="text-xs text-[#A4B9B1]">
              {selectedMosque.name} · Kaʼbai Muazzama yoʻnalishi
            </p>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Mosque List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#587068] dark:text-[#9CAFA7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masjid nomi yoki hudud boʻyicha qidirish..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl az-liquid-glass-pill text-sm text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <StaggerGrid className="space-y-3">
            {filteredMosques.map((mosque) => {
              const isSelected = selectedMosque.id === mosque.id;
              return (
                <StaggerCard key={mosque.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedMosque(mosque)}
                    className={`w-full text-left p-5 rounded-[22px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#064E3B] to-[#052E23] text-[#F7F4EC] border-[#C8A85E]/55 shadow-[0_18px_40px_-14px_rgba(6,78,59,0.5)]'
                        : 'az-liquid-glass-card text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/35'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-[#C8A85E]' : 'text-[#8B6B2E] dark:text-[#C8A85E]'
                          }`}
                        >
                          {mosque.district} · {mosque.region}
                          {mosque.isPrimary ? ' · Bosh markaz' : ''}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold tracking-tight">{mosque.name}</h2>
                        <p
                          className={`text-xs ${
                            isSelected ? 'text-[#D6E4DE]' : 'text-[#587068] dark:text-[#9CAFA7]'
                          }`}
                        >
                          {mosque.address}
                        </p>
                      </div>
                      <MapPin
                        className={`w-5 h-5 shrink-0 ${
                          isSelected ? 'text-[#C8A85E]' : 'text-[#064E3B] dark:text-[#10B981]'
                        }`}
                      />
                    </div>

                    <div
                      className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${
                        isSelected
                          ? 'border-white/15 text-[#F7F4EC]/90'
                          : 'border-black/[0.06] dark:border-white/[0.08] text-[#587068] dark:text-[#9CAFA7]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 font-mono-numbers">
                        <Clock className="w-3.5 h-3.5" />
                        Juma: {mosque.jumaTime}
                      </span>
                      {mosque.capacity && (
                        <span className="inline-flex items-center gap-1.5 font-mono-numbers">
                          <Users className="w-3.5 h-3.5" />
                          Sigʻimi: {mosque.capacity} kishi
                        </span>
                      )}
                    </div>
                  </button>
                </StaggerCard>
              );
            })}
          </StaggerGrid>
        </div>

        {/* Right: Mosque Detail + Map Coordinates + Spatial Live Qibla Compass */}
        <div className="lg:col-span-5 space-y-5">
          <Card elevated className="p-6 space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#8B6B2E] dark:text-[#C8A85E]">
                Tanlangan masjid · {selectedMosque.district}
              </div>
              <h2 className="text-xl font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                {selectedMosque.name}
              </h2>
              <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed pt-1">
                {selectedMosque.descriptionUz}
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1] bg-[#F4F0E6] dark:bg-[#050D0A]">
              <iframe
                title={`${selectedMosque.name} xaritasi`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedMosque.lng - 0.015}%2C${selectedMosque.lat - 0.01}%2C${selectedMosque.lng + 0.015}%2C${selectedMosque.lat + 0.01}&layer=mapnik&marker=${selectedMosque.lat}%2C${selectedMosque.lng}`}
                className="w-full h-52 border-0"
                loading="lazy"
              />
            </div>

            {selectedMosque.facilities.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#587068] dark:text-[#9CAFA7]">
                  Masjid qulayliklari
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {selectedMosque.facilities.map((fac, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#091813] dark:text-[#F7F4EC]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#064E3B] dark:text-[#10B981] shrink-0" />
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-2xl bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D] font-bold text-sm hover:brightness-110 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span className="font-mono-numbers">
                Xaritada yoʻnalish ({selectedMosque.lat.toFixed(4)}, {selectedMosque.lng.toFixed(4)})
              </span>
            </a>
          </Card>

          {/* Spatial Live Qibla Compass Card */}
          <SpatialTiltCard maxTilt={5} glowColor="rgba(200, 168, 94, 0.22)">
            <Card elevated className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                    Qibla Yoʻnalishi Kompasi
                  </h3>
                  <p className="text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                    Azimut: {qiblaAngle}° · Kaʼba tomon
                  </p>
                </div>
                <Compass className="w-6 h-6 text-[#C8A85E]" />
              </div>

              <div className="flex flex-col items-center py-2">
                <div className="relative w-48 h-48 rounded-full az-neumorphic-inset border border-[#C8A85E]/35 flex items-center justify-center">
                  {/* Degree tick ring */}
                  <svg
                    viewBox="0 0 180 180"
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
                    aria-hidden="true"
                  >
                    <circle
                      cx="90"
                      cy="90"
                      r="80"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="2 7"
                      className="text-[#8B6B2E] dark:text-[#C8A85E]"
                    />
                  </svg>
                  <span className="absolute top-2.5 text-[11px] font-bold text-[#587068] dark:text-[#9CAFA7]">N</span>
                  <span className="absolute right-3 text-[11px] font-bold text-[#587068] dark:text-[#9CAFA7]">E</span>
                  <span className="absolute bottom-2.5 text-[11px] font-bold text-[#587068] dark:text-[#9CAFA7]">S</span>
                  <span className="absolute left-3 text-[11px] font-bold text-[#587068] dark:text-[#9CAFA7]">W</span>

                  <motion.div
                    className="w-1 h-34 relative"
                    animate={{ rotate: relativeNeedleDeg }}
                    transition={MOTION_SPRINGS.gentle}
                  >
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[26px] border-l-transparent border-r-transparent border-b-[#064E3B] dark:border-b-[#C8A85E] absolute -top-1 left-1/2 -translate-x-1/2" />
                    <div className="w-1 h-16 bg-[#064E3B] dark:bg-[#C8A85E] mx-auto mt-3 rounded-full" />
                    <div className="w-1 h-12 bg-[#587068]/30 mx-auto rounded-full" />
                  </motion.div>
                  <div className="w-4 h-4 rounded-full bg-[#C8A85E] border-2 border-[#030706] absolute shadow-sm" />
                </div>

                <div className="mt-4 text-center space-y-2">
                  {sensorStatus === 'active' && heading !== null ? (
                    <p className="text-xs font-semibold text-[#064E3B] dark:text-[#34D399] font-mono-numbers">
                      Jonli kompas faol · Qurilma: {heading}° · Qibla burilishi: {relativeNeedleDeg}°
                    </p>
                  ) : sensorStatus === 'unsupported' ? (
                    <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
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
          </SpatialTiltCard>
        </div>
      </div>
    </div>
  );
};
