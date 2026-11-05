'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Song } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

function FeedContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const searchParams = useSearchParams();
  const room = searchParams.get('room') || 'main';

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

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 relative overflow-hidden">
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md mx-auto relative z-10 pt-4">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-black tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          >
            bench<span className="text-red-500">.</span>
          </motion.h1>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-10 z-50">
          <div className="absolute -inset-1 bg-gradient-to-br from-red-600/0 via-red-600/20 to-red-600/40 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition duration-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="request another song..."
            disabled={isRequesting}
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

        {isRequesting && <p className="text-center text-red-500 mb-4 animate-pulse text-sm font-bold uppercase tracking-widest">Adding to queue...</p>}

        {/* Active Requests Header */}
        <h2 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 pl-1">
          Active Requests:
        </h2>

        {/* Live Feed */}
        <div className="space-y-3">
          <AnimatePresence>
            {requests.map((req) => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                className="flex items-center gap-4 p-3 bg-[#111111] rounded-xl border border-white/5 shadow-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={req.album_art} alt="" className="w-14 h-14 rounded-lg object-cover shadow-md relative z-10" />
                <div className="overflow-hidden relative z-10">
                  <p className="font-bold truncate">{req.title}</p>
                  <p className="text-sm text-gray-400 truncate">{req.artist}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {requests.length === 0 && (
            <div className="text-center mt-10">
              <p className="text-gray-500">No requests yet. Be the first!</p>
            </div>
          )}
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