'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Song } from '@/types';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

function FeedContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const [hearts, setHearts] = useState<{ id: string, songId: string, xOffset: number, yOffset: number, color: string }[]>([]);
  const [userLikes, setUserLikes] = useState<{ [key: string]: number }>({});
  
  const searchParams = useSearchParams();
  const room = searchParams.get('room') || 'main';

  // --- SCROLL LOGIC FOR HIDING HEADER ---
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 50) {
      setHidden(true); // Scrolling down -> hide
    } else {
      setHidden(false); // Scrolling up -> show
    }
  });

  useEffect(() => {
    const savedLikes = localStorage.getItem(`bench_likes_${room}`);
    if (savedLikes) {
      try {
        setUserLikes(JSON.parse(savedLikes));
      } catch (e) {}
    }
  }, [room]);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase.from('requests').select('*').eq('room_id', room).order('created_at', { ascending: false });
      if (data) setRequests(data);
    };
    fetchRequests();

    const channel = supabase.channel('room_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `room_id=eq.${room}` }, (payload) => {
        setRequests((prev) => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, (payload) => {
        setRequests((prev) => prev.map(req => req.id === payload.new.id ? payload.new : req));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'requests' }, (payload) => {
        setRequests((prev) => prev.filter((req) => req.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data);
        } catch (err) {
          console.error(err);
        }
      } else {
        setResults([]); 
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const submitRequest = async (song: Song) => {
    setIsRequesting(true);
    await supabase.from('requests').insert([{ 
      room_id: room, 
      title: song.title, 
      artist: song.artist, 
      album_art: song.albumArt 
    }]);
    setQuery('');
    setResults([]);
    setIsRequesting(false);
  };

  const handleLike = async (songId: string) => {
    const currentLikes = userLikes[songId] || 0;
    
    const heartColors = ['#f472b6', '#fb7185', '#f87171', '#ec4899', '#f43f5e'];
    
    const newHeart = { 
      id: Math.random().toString(), 
      songId, 
      xOffset: Math.random() * 40 - 50, 
      yOffset: -(50 + Math.random() * 50), 
      color: heartColors[Math.floor(Math.random() * heartColors.length)]
    };
    setHearts(prev => [...prev, newHeart]);

    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1000);

    if (currentLikes < 5) {
      const newLikes = { ...userLikes, [songId]: currentLikes + 1 };
      setUserLikes(newLikes);
      localStorage.setItem(`bench_likes_${room}`, JSON.stringify(newLikes));
      
      await supabase.rpc('increment_like', { song_id: songId });
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-6 relative overflow-hidden">
      
      {/* INCREASED BACKGROUND GLOW */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-red-600/15 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/15 blur-[100px] rounded-full pointer-events-none z-0" />

      <div className="max-w-md mx-auto relative z-10">
        
        {/* STICKY HEADER WITH AUTO-HIDE */}
        <motion.div 
          animate={{ y: hidden ? -120 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-xl pt-6 px-6 pb-4 -mx-0"
        >
          <div className="flex justify-between items-center mb-6">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-black tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            >
              bench<span className="text-red-500">.</span>
            </motion.h1>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-br from-red-600/0 via-red-600/20 to-red-600/40 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition duration-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="request another song..."
              disabled={isRequesting}
              style={{ fontFamily: 'var(--font-space)' }}
              className="relative w-full p-4 rounded-2xl bg-[#111111] border border-red-900/30 text-white placeholder:text-red-500/30 placeholder:font-medium focus:outline-none focus:border-red-900/50 transition-all shadow-[10px_10px_30px_-10px_rgba(220,38,38,0.2)]"
            />

            <AnimatePresence>
              {query.trim().length > 1 && results.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-[#111111]/95 backdrop-blur-xl border border-red-900/30 rounded-2xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden"
                >
                  {results.map((song, index) => (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={song.id}
                      onClick={() => submitRequest(song)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-red-500/10 transition-colors text-left border-b border-red-900/20 last:border-b-0 group/item"
                    >
                      <img src={song.albumArt} alt="" className="w-10 h-10 rounded object-cover shadow-md" />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold truncate text-sm group-hover/item:text-red-400 transition-colors">{song.title}</p>
                        <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="px-6">
          {isRequesting && <p className="text-center text-red-500 mb-4 animate-pulse text-sm font-bold uppercase tracking-widest">Adding to queue...</p>}

          <h2 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 pl-1 mt-2">
            Active Requests:
          </h2>

          <div className="space-y-3">
            <AnimatePresence>
              {requests.map((req) => {
                const userLikeCount = userLikes[req.id] || 0;
                const isLiked = userLikeCount > 0;

                return (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    onClick={() => handleLike(req.id)}
                    style={{
                      backgroundColor: isLiked ? '#151515' : '#111111', 
                      borderColor: isLiked ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.05)',
                      boxShadow: isLiked ? '0 0 20px rgba(239,68,68,0.25)' : 'none'
                    }}
                    className={`flex items-center gap-4 p-3 rounded-xl border shadow-lg relative group select-none cursor-pointer hover:bg-[#151515] transition-colors duration-300`}
                  >
                    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <img src={req.album_art} alt="" className="w-14 h-14 rounded-lg object-cover shadow-md relative z-10 pointer-events-none" />
                    <div className="overflow-hidden relative z-10 pointer-events-none">
                      <p className="font-bold truncate">{req.title}</p>
                      <p className="text-sm text-gray-400 truncate">{req.artist}</p>
                    </div>

                    <div className="absolute right-10 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                      <AnimatePresence>
                        {hearts.filter(h => h.songId === req.id).map((heart) => (
                          <motion.div
                            key={heart.id}
                            initial={{ opacity: 0, y: 0, scale: 0.5, x: heart.xOffset }}
                            animate={{ opacity: 1, y: heart.yOffset, scale: 1.2 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.8, ease: "easeOut" }} 
                            className="absolute"
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 24 24" 
                              fill="currentColor" 
                              style={{ color: heart.color }}
                              className="w-10 h-10 drop-shadow-[0_0_15px_rgba(244,114,182,0.8)]"
                            >
                              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Feed() {
  return (
    <Suspense fallback={<div className="text-white text-center mt-10">Loading...</div>}>
      <FeedContent />
    </Suspense>
  );
}