import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MediaPost } from '../../../types';
import { getStoredMediaPosts, subscribeToDatabase } from '../../../utils/databaseService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
  AudioWaveformBars,
} from '../../ui/MotionPrimitives';
import { Play, Pause, Volume2, Video, Image as ImageIcon, Search, Headphones } from 'lucide-react';

export const MediaCenterView: React.FC = () => {
  const [posts, setPosts] = useState<MediaPost[]>(() =>
    getStoredMediaPosts().filter((m) => m.isPublished !== false && !m.isArchived)
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'audio' | 'video' | 'photo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [sleepTimerMin, setSleepTimerMin] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      setPosts(getStoredMediaPosts().filter((m) => m.isPublished !== false && !m.isArchived));
    };
    const unsub = subscribeToDatabase(refresh);
    window.addEventListener('asaka_ziyo_db_updated', refresh);
    return () => {
      unsub();
      window.removeEventListener('asaka_ziyo_db_updated', refresh);
      if (sleepTimeoutRef.current) window.clearTimeout(sleepTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (sleepTimeoutRef.current) {
      window.clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    if (sleepTimerMin > 0 && isPlaying) {
      sleepTimeoutRef.current = window.setTimeout(() => {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        setSleepTimerMin(0);
      }, sleepTimerMin * 60_000);
    }
  }, [sleepTimerMin, isPlaying]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.author || '').toLowerCase().includes(q) ||
        (p.caption || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [posts, typeFilter, searchQuery]);

  const activeAudioPost = posts.find((p) => p.id === activeAudioId) || null;

  const handleToggleAudio = (post: MediaPost) => {
    if (!post.mediaUrl) return;
    if (activeAudioId === post.id && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
      return;
    }
    setActiveAudioId(post.id);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = post.mediaUrl;
        audioRef.current.playbackRate = playbackRate;
        void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }, 30);
  };

  return (
    <div className="space-y-8 pb-16">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      <PageHero
        variant="studio"
        kicker="Audio Maʼruzalar · Video Suhbatlar · Fotolavhalar"
        title="ASAKA ZIYO Media Markazi"
        subtitle="Maʼmuriyat tomonidan Firestore bazasiga yuklangan rasmiy audio maʼruzalar, tilovatlar, video suhbatlar va maʼrifiy lavhalar."
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs text-[#C8A85E] font-semibold uppercase tracking-[0.14em]">
              <span>Media arxivi</span>
              <AudioWaveformBars isPlaying={isPlaying} barCount={5} />
            </div>
            <div className="text-2xl font-display font-bold font-mono-numbers text-[#F7F4EC]">
              {posts.length} <span className="text-sm font-normal text-[#A4B9B1]">material</span>
            </div>
            <p className="text-xs text-[#A4B9B1]">Tezlik boshqaruvi (0.75x–2x) va uyqu taymeri</p>
          </div>
        }
      />

      {/* Apple Studio Liquid Glass Active Mini Audio Player */}
      {activeAudioPost && (
        <Card
          elevated
          className="p-4 sm:p-5 bg-gradient-to-r from-[#064E3B] via-[#06362A] to-[#041D16] text-[#F7F4EC] border-[#C8A85E]/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => handleToggleAudio(activeAudioPost)}
              className="w-12 h-12 rounded-2xl bg-[#C8A85E] text-[#04120D] flex items-center justify-center shrink-0 cursor-pointer shadow-lg hover:brightness-105 transition-all"
              aria-label={isPlaying ? 'Pauza' : 'Ijro etish'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-[#C8A85E] font-semibold">
                <AudioWaveformBars isPlaying={isPlaying} barCount={4} />
                <span>{isPlaying ? 'Ijro etilmoqda' : 'Pauzada'}</span>
              </div>
              <div className="text-sm sm:text-base font-bold truncate">{activeAudioPost.title}</div>
              <div className="text-xs text-[#C2D4CD] truncate">{activeAudioPost.author}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-xl text-xs font-bold font-mono-numbers cursor-pointer transition-colors ${
                  playbackRate === rate
                    ? 'bg-[#C8A85E] text-[#04120D]'
                    : 'bg-white/10 text-[#F7F4EC] hover:bg-white/15'
                }`}
              >
                {rate}x
              </button>
            ))}

            <select
              aria-label="Uyqu taymeri"
              value={sleepTimerMin}
              onChange={(e) => setSleepTimerMin(Number(e.target.value))}
              className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white/10 border border-white/15 text-xs text-[#F7F4EC]"
            >
              <option value={0} className="text-black">Taymer: Oʻchiq</option>
              <option value={15} className="text-black">15 daqiqa</option>
              <option value={30} className="text-black">30 daqiqa</option>
              <option value={60} className="text-black">60 daqiqa</option>
            </select>
          </div>
        </Card>
      )}

      {/* Search & Type Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <MorphingTabs
          items={[
            { id: 'all', label: 'Barchasi', count: posts.length },
            { id: 'audio', label: 'Audio' },
            { id: 'video', label: 'Video' },
            { id: 'photo', label: 'Fotolavha' },
          ]}
          activeId={typeFilter}
          onChange={(id) => setTypeFilter(id as 'all' | 'audio' | 'video' | 'photo')}
          layoutId="media-type-tabs"
        />

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#587068] dark:text-[#9CAFA7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Maʼruza, video yoki muallif..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl az-liquid-glass-pill text-sm text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Media Grid */}
      {filteredPosts.length === 0 ? (
        <Card className="p-12 text-center space-y-2.5">
          <Headphones className="w-10 h-10 text-[#C8A85E] mx-auto" />
          <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
            Hozircha media materiallar topilmadi
          </h3>
          <p className="text-sm text-[#587068] dark:text-[#9CAFA7] max-w-md mx-auto">
            Admin portal orqali audio, video yoki fotolavha qoʻshilganda u bu yerda avtomatik koʻrinadi.
          </p>
        </Card>
      ) : (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const isThisAudioPlaying = activeAudioId === post.id && isPlaying;
            return (
              <StaggerCard key={post.id}>
                <Card elevated className="overflow-hidden h-full flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-video bg-[#04120D] overflow-hidden">
                      {post.type === 'video' && post.mediaUrl ? (
                        <video
                          src={post.mediaUrl}
                          poster={post.thumbnail || '/images/asaka_islamic_architecture_1793634657962.jpg'}
                          controls
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={post.thumbnail || post.mediaUrl || '/images/asaka_islamic_architecture_1793634657962.jpg'}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                        />
                      )}
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                        {post.type === 'audio' ? (
                          <Volume2 className="w-3.5 h-3.5" />
                        ) : post.type === 'video' ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5" />
                        )}
                        <span>{post.category || post.type}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-numbers">{post.publishedDate}</span>
                      </div>

                      <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug">
                        {post.title}
                      </h3>
                      {post.author && (
                        <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">{post.author}</p>
                      )}
                      {post.caption && (
                        <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] line-clamp-3 leading-relaxed">
                          {post.caption}
                        </p>
                      )}
                    </div>
                  </div>

                  {post.type === 'audio' && (
                    <div className="px-5 pb-5">
                      <Button
                        variant={isThisAudioPlaying ? 'primary' : 'emerald'}
                        onClick={() => handleToggleAudio(post)}
                        className="w-full"
                        disabled={!post.mediaUrl}
                      >
                        {isThisAudioPlaying ? (
                          <span className="inline-flex items-center gap-2">
                            <AudioWaveformBars isPlaying barCount={4} barClassName="bg-current" />
                            <span>Pauza qilish</span>
                          </span>
                        ) : (
                          'Audioni tinglash'
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              </StaggerCard>
            );
          })}
        </StaggerGrid>
      )}
    </div>
  );
};
