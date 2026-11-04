'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Song } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

function HomeContent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const room = searchParams.get('room') || 'main';

  // Real-time search with debounce
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
    setSelectedSong(song); 
    setResults([]); 
    setQuery('');

    await supabase.from('requests').insert([{ 
      room_id: room, 
      title: song.title, 
      artist: song.artist, 
      album_art: song.albumArt 
    }]);
  };

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Abstract Asymmetric Red Background Glow */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-red-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            bench<span className="text-red-500">.</span>
          </motion.h1>
        </div>

        {/* Search Input Container */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-br from-red-600/0 via-red-600/20 to-red-600/40 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition duration-500" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="request a song"
            disabled={isRequesting}
            className="relative w-full p-5 rounded-2xl bg-[#111111] border border-red-900/30 text-white text-lg placeholder:text-red-500/30 placeholder:font-medium focus:outline-none focus:border-red-900/50 transition-all shadow-[10px_10px_30px_-10px_rgba(220,38,38,0.2)]"
          />

          {/* Dropdown Results */}
          <AnimatePresence>
            {query.trim().length > 1 && results.length > 0 && !selectedSong && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-[#111111]/95 backdrop-blur-xl border border-red-900/30 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto overflow-x-hidden"
              >
                {results.map((song, index) => (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={song.id}
                    onClick={() => submitRequest(song)}
                    disabled={isRequesting}
                    className="w-full flex items-center gap-4 p-4 hover:bg-red-500/10 transition-colors text-left border-b border-red-900/20 last:border-b-0 group/item"
                  >
                    <img src={song.albumArt} alt="" className="w-12 h-12 rounded object-cover shadow-md group-hover/item:scale-105 transition-transform" />
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold truncate text-white group-hover/item:text-red-400 transition-colors">{song.title}</p>
                      <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* THE THROW ANIMATION OVERLAY */}
      <AnimatePresence>
        {selectedSong && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 100, rotate: -90, opacity: 0 }}
              animate={{
                scale: [0.8, 1, 1, 0.95, 0.3],
                y: [100, 0, 0, 30, -1500], 
                rotate: [-90, 0, 0, 180, 900], // Continuous spin through the wind-up
                opacity: [0, 1, 1, 1, 0]
              }}
              transition={{
                duration: 3.2, 
                times: [0, 0.25, 0.4, 0.6, 1], 
                // Default physics for Y and Scale (smooth crouch)
                ease: ["easeOut", "linear", "easeOut", "easeIn"],
                // Override physics for Rotation to keep it continuous
                rotate: {
                  duration: 3.2, 
                  times: [0, 0.25, 0.4, 0.6, 1], 
                  ease: ["easeOut", "linear", "linear", "easeIn"] 
                }
              }}
              onAnimationComplete={() => {
                router.push(`/feed?room=${room}`);
              }}
              className="relative"
            >
              {/* Soft glow */}
              <div className="absolute -inset-4 bg-red-600/30 blur-2xl rounded-full" />
              
              <img 
                src={selectedSong.albumArt} 
                alt={selectedSong.title} 
                className="w-72 h-72 md:w-80 md:h-80 rounded-2xl object-cover shadow-2xl border border-white/10 relative z-10" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="text-white text-center mt-10">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}