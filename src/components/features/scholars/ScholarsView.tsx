import React, { useState, useEffect, useMemo } from 'react';
import { BASELINE_SCHOLARS, ScholarProfile } from '../../../data/superAppData';
import { NavigationTab } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
  SpatialTiltCard,
} from '../../ui/MotionPrimitives';
import { Search, BookOpen, Quote, Feather, ArrowRight, User } from 'lucide-react';

interface ScholarsViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const ScholarsView: React.FC<ScholarsViewProps> = ({ onNavigate }) => {
  const [scholars, setScholars] = useState<ScholarProfile[]>(BASELINE_SCHOLARS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState<string>('Barchasi');
  const [activeScholar, setActiveScholar] = useState<ScholarProfile | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/database/scholars')
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (json?.success && Array.isArray(json.scholars) && json.scholars.length > 0) {
          const byId = new Map<string, ScholarProfile>();
          for (const b of BASELINE_SCHOLARS) byId.set(b.id, b);
          for (const remote of json.scholars) {
            if (remote?.id && remote?.name) {
              byId.set(remote.id, {
                ...BASELINE_SCHOLARS.find((x) => x.id === remote.id),
                ...remote,
                biographyParagraphsUz: Array.isArray(remote.biographyParagraphsUz)
                  ? remote.biographyParagraphsUz
                  : [remote.shortBioUz || ''],
                notableWorks: Array.isArray(remote.notableWorks) ? remote.notableWorks : [],
                quotesUz: Array.isArray(remote.quotesUz) ? remote.quotesUz : [],
                avatarFallbackInitials:
                  remote.avatarFallbackInitials ||
                  String(remote.name)
                    .split(' ')
                    .slice(0, 2)
                    .map((w: string) => w[0])
                    .join('')
                    .toUpperCase(),
              });
            }
          }
          setScholars(Array.from(byId.values()));
        }
      })
      .catch(() => {
        // Keep verified baseline scholars when offline
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fields = ['Barchasi', 'Tafsir va Fiqh', 'Qurʼon va Tajvid', 'Hadis va Sunnat', 'Maʼnaviyat va Adabiyot'];

  const filteredScholars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scholars.filter((s) => {
      if (selectedField !== 'Barchasi' && s.field !== selectedField) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.shortBioUz.toLowerCase().includes(q) ||
        s.notableWorks.some((w) => w.toLowerCase().includes(q))
      );
    });
  }, [scholars, searchQuery, selectedField]);

  return (
    <div className="space-y-8 pb-16">
      <PageHero
        variant="editorial"
        kicker="Ulamolar Merosi · Tarjimai Hollar · Asarlar va Hikmatlar"
        title="Ulamolar va Ustozlar Katalogi"
        subtitle="Yurtimizning moʻtabar allomalari, Qurʼon qorilari va ustozlarining hayot yoʻli, ilmiy merosi, asarlari hamda maʼnaviy hikmatlari bir maskanda."
      />

      {/* Search & Field Filters */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
        <MorphingTabs
          items={fields.map((f) => ({ id: f, label: f }))}
          activeId={selectedField}
          onChange={setSelectedField}
          layoutId="scholars-field-tabs"
        />

        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-[#587068] dark:text-[#9CAFA7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ustoz ismi yoki asar nomi..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl az-liquid-glass-pill text-sm text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Scholars Grid */}
      {loading && scholars.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-[24px] bg-black/[0.04] dark:bg-white/[0.04]" />
          ))}
        </div>
      ) : filteredScholars.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-[#587068] dark:text-[#9CAFA7]">
            Qidiruv boʻyicha ustoz topilmadi.
          </p>
        </Card>
      ) : (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredScholars.map((scholar) => (
            <StaggerCard key={scholar.id}>
              <SpatialTiltCard maxTilt={3.5} glowColor="rgba(200, 168, 94, 0.18)">
                <Card elevated className="p-6 h-full flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#052920] border border-[#C8A85E]/40 flex items-center justify-center text-[#F7F4EC] font-display text-lg font-bold shrink-0 overflow-hidden shadow-sm">
                        {scholar.imageUrl ? (
                          <img
                            src={scholar.imageUrl}
                            alt={scholar.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          scholar.avatarFallbackInitials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                          {scholar.field} {scholar.years ? `· ${scholar.years}` : ''}
                        </div>
                        <h2 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug mt-0.5">
                          {scholar.name}
                        </h2>
                        <p className="text-xs text-[#587068] dark:text-[#9CAFA7] mt-0.5">{scholar.honorific}</p>
                      </div>
                    </div>

                    <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                      {scholar.shortBioUz}
                    </p>

                    {scholar.notableWorks.length > 0 && (
                      <div className="space-y-1 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                        <div className="text-xs font-semibold text-[#587068] dark:text-[#9CAFA7]">Asosiy asarlari</div>
                        <p className="text-xs text-[#091813] dark:text-[#F7F4EC]/90">
                          {scholar.notableWorks.slice(0, 3).join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="emerald"
                      onClick={() => setActiveScholar(scholar)}
                      className="flex-1"
                    >
                      Tarjimai hol va hikmatlar
                    </Button>
                    {onNavigate && scholar.relatedTab && (
                      <button
                        type="button"
                        onClick={() => onNavigate(scholar.relatedTab!)}
                        className="min-h-[42px] px-3 rounded-xl az-liquid-glass-pill text-xs font-semibold text-[#064E3B] dark:text-[#C8A85E] hover:border-[#C8A85E]/50 transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Tegishli boʻlimga oʻtish"
                        aria-label="Tegishli boʻlimga oʻtish"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              </SpatialTiltCard>
            </StaggerCard>
          ))}
        </StaggerGrid>
      )}

      {/* Scholar Detail Modal */}
      <Modal
        isOpen={Boolean(activeScholar)}
        onClose={() => setActiveScholar(null)}
        title={activeScholar?.name || ''}
        subtitle={activeScholar ? `${activeScholar.honorific} · ${activeScholar.region}` : ''}
        maxWidth="lg"
      >
        {activeScholar && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8B6B2E] dark:text-[#C8A85E]">
                <User className="w-4 h-4" />
                <span>Tarjimai hol</span>
              </div>
              {activeScholar.biographyParagraphsUz.map((p, idx) => (
                <p key={idx} className="font-editorial text-sm sm:text-[15px] text-[#091813] dark:text-[#F7F4EC]/90 leading-[1.8]">
                  {p}
                </p>
              ))}
            </div>

            {activeScholar.notableWorks.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8B6B2E] dark:text-[#C8A85E]">
                  <BookOpen className="w-4 h-4" />
                  <span>Ilmiy va maʼrifiy merosi</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-[#091813] dark:text-[#F7F4EC]">
                  {activeScholar.notableWorks.map((work, i) => (
                    <li key={i}>{work}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeScholar.quotesUz.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8B6B2E] dark:text-[#C8A85E]">
                  <Quote className="w-4 h-4" />
                  <span>Hikmatli soʻzlari</span>
                </div>
                {activeScholar.quotesUz.map((q, i) => (
                  <blockquote
                    key={i}
                    className="rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/85 border border-[#C8A85E]/20 p-4 text-sm italic text-[#091813] dark:text-[#F7F4EC]"
                  >
                    «{q}»
                  </blockquote>
                ))}
              </div>
            )}

            {activeScholar.poemsUz && activeScholar.poemsUz.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8B6B2E] dark:text-[#C8A85E]">
                  <Feather className="w-4 h-4" />
                  <span>Sheʼrlar va maʼnaviy satrlar</span>
                </div>
                {activeScholar.poemsUz.map((poem, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/85 border border-black/[0.06] dark:border-white/[0.08] p-4 space-y-1.5"
                  >
                    <h4 className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">{poem.title}</h4>
                    {poem.lines.map((line, li) => (
                      <p key={li} className="text-sm text-[#3B554D] dark:text-[#A4B9B1]">
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
