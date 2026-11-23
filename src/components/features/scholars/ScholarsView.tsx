import React, { useState, useEffect, useMemo } from 'react';
import { BASELINE_SCHOLARS, ScholarProfile } from '../../../data/superAppData';
import { NavigationTab } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
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
    <div className="space-y-8">
      {/* Editorial Header */}
      <section className="rounded-3xl bg-[#03170F] text-[#FFF8E8] border border-[#DFBD69]/35 p-6 sm:p-8 shadow-xl">
        <p className="text-xs font-semibold tracking-widest uppercase text-[#DFBD69]">
          Ulamolar merosi · Tarjimai hollar · Asarlar · Hikmatlar va sheʼrlar
        </p>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 text-balance">
          Ulamolar va Ustozlar Katalogi
        </h1>
        <p className="text-sm sm:text-base text-[#E6DFCE]/85 mt-2 max-w-2xl leading-relaxed">
          Yurtimizning moʻtabar allomalari, Qurʼon qorilari va ustozlarining hayot yoʻli, ilmiy merosi, asarlari hamda maʼnaviy hikmatlari bir maskanda.
        </p>
      </section>

      {/* Search & Field Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#526B62] dark:text-[#9CB5AC] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ustoz ismi yoki asar nomi boʻyicha qidirish..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#041D13] border border-[#063D32]/15 dark:border-[#DFBD69]/25 text-sm text-[#03170F] dark:text-[#FFF8E8] focus:outline-none focus:border-[#DFBD69]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {fields.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedField(f)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                selectedField === f
                  ? 'bg-[#063D32] text-[#FFF8E8] dark:bg-[#DFBD69] dark:text-[#010906]'
                  : 'bg-[#F1EBDD] dark:bg-[#041D13] text-[#1E3F35] dark:text-[#E6DFCE]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Scholars Grid */}
      {loading && scholars.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-[#F1EBDD] dark:bg-[#041D13] animate-pulse" />
          ))}
        </div>
      ) : filteredScholars.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-[#526B62] dark:text-[#9CB5AC]">
            Qidiruv boʻyicha ustoz topilmadi.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredScholars.map((scholar) => (
            <Card
              key={scholar.id}
              className="p-6 flex flex-col justify-between gap-5 border border-[#063D32]/12 dark:border-[#DFBD69]/22 hover:border-[#DFBD69]/60 transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#063D32] dark:bg-[#092E1F] border border-[#DFBD69]/40 flex items-center justify-center text-[#FFF6C8] font-display text-lg font-bold shrink-0 overflow-hidden">
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
                    <div className="text-xs text-[#8A6621] dark:text-[#DFBD69] font-semibold">
                      {scholar.field} {scholar.years ? `· ${scholar.years}` : ''}
                    </div>
                    <h2 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8] leading-snug mt-0.5">
                      {scholar.name}
                    </h2>
                    <p className="text-xs text-[#526B62] dark:text-[#9CB5AC] mt-0.5">{scholar.honorific}</p>
                  </div>
                </div>

                <p className="text-sm text-[#1E3F35] dark:text-[#E6DFCE] leading-relaxed">
                  {scholar.shortBioUz}
                </p>

                {scholar.notableWorks.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#063D32]/10 dark:border-[#DFBD69]/15">
                    <div className="text-xs font-semibold text-[#526B62] dark:text-[#9CB5AC]">Asosiy asarlari:</div>
                    <p className="text-xs text-[#03170F] dark:text-[#FFF8E8]/90">
                      {scholar.notableWorks.slice(0, 3).join(' · ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setActiveScholar(scholar)}
                  className="flex-1"
                >
                  Tarjimai hol va hikmatlar
                </Button>
                {onNavigate && scholar.relatedTab && (
                  <button
                    onClick={() => onNavigate(scholar.relatedTab!)}
                    className="min-h-[42px] px-3 rounded-xl border border-[#063D32]/20 dark:border-[#DFBD69]/35 text-xs font-semibold text-[#063D32] dark:text-[#DFBD69] hover:bg-[#DFBD69]/15 transition-colors cursor-pointer inline-flex items-center gap-1"
                    title="Tegishli boʻlimga oʻtish"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
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
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A6621] dark:text-[#DFBD69]">
                <User className="w-4 h-4" />
                <span>Tarjimai hol</span>
              </div>
              {activeScholar.biographyParagraphsUz.map((p, idx) => (
                <p key={idx} className="text-sm text-[#1E3F35] dark:text-[#E6DFCE] leading-relaxed">
                  {p}
                </p>
              ))}
            </div>

            {activeScholar.notableWorks.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A6621] dark:text-[#DFBD69]">
                  <BookOpen className="w-4 h-4" />
                  <span>Ilmiy va maʼrifiy merosi</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-[#03170F] dark:text-[#FFF8E8]">
                  {activeScholar.notableWorks.map((work, i) => (
                    <li key={i}>{work}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeScholar.quotesUz.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A6621] dark:text-[#DFBD69]">
                  <Quote className="w-4 h-4" />
                  <span>Hikmatli soʻzlari</span>
                </div>
                {activeScholar.quotesUz.map((q, i) => (
                  <blockquote
                    key={i}
                    className="rounded-2xl bg-[#F8F5EC] dark:bg-[#041D13] border border-[#063D32]/10 dark:border-[#DFBD69]/20 p-4 text-sm italic text-[#03170F] dark:text-[#FFF6C8]"
                  >
                    «{q}»
                  </blockquote>
                ))}
              </div>
            )}

            {activeScholar.poemsUz && activeScholar.poemsUz.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A6621] dark:text-[#DFBD69]">
                  <Feather className="w-4 h-4" />
                  <span>Sheʼrlar va maʼnaviy satrlar</span>
                </div>
                {activeScholar.poemsUz.map((poem, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-[#F8F5EC] dark:bg-[#041D13] border border-[#063D32]/10 dark:border-[#DFBD69]/20 p-4 space-y-1.5"
                  >
                    <h4 className="text-sm font-bold text-[#03170F] dark:text-[#FFF8E8]">{poem.title}</h4>
                    {poem.lines.map((line, li) => (
                      <p key={li} className="text-sm text-[#1E3F35] dark:text-[#E6DFCE]">
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
