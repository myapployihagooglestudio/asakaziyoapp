import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MediaPost } from '../../../types';
import { getStoredMediaPosts, subscribeToDatabase } from '../../../utils/databaseService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Play, Pause, Volume2, Video, Image as ImageIcon, Search, Clock, Headphones } from 'lucide-react';

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
    <div className="space-y-8">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      {/* Header */}
      <section className="rounded-3xl bg-[#03170F] text-[#FFF8E8] border border-[#DFBD69]/35 p-6 sm:p-8 shadow-xl">
        <p className="text-xs font-semibold tracking-widest uppercase text-[#DFBD69]">
          Audio maʼruzalar · Video suhbatlar · Reels va Fotolenta
        </p>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 text-balance">
          ASAKA ZIYO Media Markazi
        </h1>
        <p className="text-sm sm:text-base text-[#E6DFCE]/85 mt-2 max-w-2xl leading-relaxed">
          Maʼmuriyat tomonidan Firestore bazasiga yuklangan barcha rasmiy audio maʼruzalar, tilovatlar, video suhbatlar va maʼrifiy lavhalar.
        </p>
      </section>

      {/* Active Mini Audio Player */}
      {activeAudioPost && (
        <Card className="p-4 sm:p-5 bg-[#063D32] text-[#FFF8E8] border border-[#DFBD69]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => handleToggleAudio(activeAudioPost)}
              className="w-11 h-11 rounded-full bg-[#DFBD69] text-[#010906] flex items-center justify-center shrink-0 cursor-pointer"
              aria-label={isPlaying ? 'Pauza' : 'Ijro etish'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div className="min-w-0">
              <div className="text-xs text-[#DFBD69] font-semibold">Ijro etilmoqda</div>
              <div className="text-sm font-bold truncate">{activeAudioPost.title}</div>
              <div className="text-xs text-[#E6DFCE]/80 truncate">{activeAudioPost.author}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-[#DFBD69] text-[#010906]'
                    : 'bg-[#092E1F] text-[#E6DFCE]'
                }`}
              >
                {rate}x
              </button>
            ))}

            <select
              aria-label="Uyqu taymeri"
              value={sleepTimerMin}
              onChange={(e) => setSleepTimerMin(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-[#092E1F] border border-[#DFBD69]/35 text-xs text-[#FFF8E8]"
            >
              <option value={0}>Taymer: Oʻchiq</option>
              <option value={15}>15 daqiqa</option>
              <option value={30}>30 daqiqa</option>
              <option value={60}>60 daqiqa</option>
            </select>
          </div>
        </Card>
      )}

      {/* Search & Type Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#526B62] dark:text-[#9CB5AC] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Maʼruza, video yoki muallif boʻyicha qidirish..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#041D13] border border-[#063D32]/15 dark:border-[#DFBD69]/25 text-sm text-[#03170F] dark:text-[#FFF8E8] focus:outline-none focus:border-[#DFBD69]"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#F1EBDD] dark:bg-[#041D13] p-1 rounded-xl">
          {[
            { id: 'all' as const, label: 'Barchasi' },
            { id: 'audio' as const, label: 'Audio' },
            { id: 'video' as const, label: 'Video' },
            { id: 'photo' as const, label: 'Fotolavha' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === f.id
                  ? 'bg-white dark:bg-[#092E1F] text-[#03170F] dark:text-[#FFF6C8] shadow-xs'
                  : 'text-[#526B62] dark:text-[#9CB5AC]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {filteredPosts.length === 0 ? (
        <Card className="p-10 text-center space-y-2">
          <Headphones className="w-10 h-10 text-[#DFBD69] mx-auto" />
          <h3 className="text-base font-bold text-[#03170F] dark:text-[#FFF8E8]">
            Hozircha media materiallar topilmadi
          </h3>
          <p className="text-sm text-[#526B62] dark:text-[#9CB5AC] max-w-md mx-auto">
            Admin portal orqali audio, video yoki fotolavha qoʻshilganda u bu yerda avtomatik koʻrinadi.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const isThisAudioPlaying = activeAudioId === post.id && isPlaying;
            return (
              <Card
                key={post.id}
                className="overflow-hidden flex flex-col justify-between border border-[#063D32]/12 dark:border-[#DFBD69]/22"
              >
                <div>
                  <div className="relative aspect-video bg-[#041D13] overflow-hidden">
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
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#8A6621] dark:text-[#DFBD69] font-semibold">
                      {post.type === 'audio' ? (
                        <Volume2 className="w-3.5 h-3.5" />
                      ) : post.type === 'video' ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{post.category || post.type}</span>
                      <span>·</span>
                      <span className="tabular-nums">{post.publishedDate}</span>
                    </div>

                    <h3 className="text-base font-bold text-[#03170F] dark:text-[#FFF8E8] leading-snug">
                      {post.title}
                    </h3>
                    {post.author && (
                      <p className="text-xs text-[#526B62] dark:text-[#9CB5AC]">{post.author}</p>
                    )}
                    {post.caption && (
                      <p className="text-sm text-[#1E3F35] dark:text-[#E6DFCE] line-clamp-3 leading-relaxed">
                        {post.caption}
                      </p>
                    )}
                  </div>
                </div>

                {post.type === 'audio' && (
                  <div className="px-5 pb-5">
                    <Button
                      onClick={() => handleToggleAudio(post)}
                      className="w-full"
                      disabled={!post.mediaUrl}
                    >
                      {isThisAudioPlaying ? 'Pauza qilish' : 'Audioni tinglash'}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
