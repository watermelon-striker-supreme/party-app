'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Song } from '@/types';

function FeedContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const searchParams = useSearchParams();
  const room = searchParams.get('room') || 'main';
    
  // 1. Fetch existing requests & subscribe to realtime
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

  // 2. Real-time search with debounce
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

  // 3. Submit request without leaving the page
  const submitRequest = async (song: Song) => {
    setIsRequesting(true);
    await supabase.from('requests').insert([{ 
      room_id: room, 
      title: song.title, 
      artist: song.artist, 
      album_art: song.albumArt 
    }]);
    
    // Clear search state so they can do it again
    setQuery('');
    setResults([]);
    setIsRequesting(false);
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">Live Requests</h1>
          <span className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-sm font-bold border border-purple-800">
            {room.toUpperCase()}
          </span>
        </div>

        {/* Search Bar & Dropdown */}
        <div className="relative mb-8 z-20">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search to request another..."
            disabled={isRequesting}
            className="w-full p-4 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-purple-500 relative z-20"
          />

          {/* Real-time Dropdown */}
          {query.trim().length > 1 && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-10 max-h-80 overflow-y-auto">
              {results.map((song) => (
                <button
                  key={song.id}
                  onClick={() => submitRequest(song)}
                  disabled={isRequesting}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition text-left border-b border-gray-700/50 last:border-b-0"
                >
                  <img src={song.albumArt} alt="" className="w-10 h-10 rounded object-cover" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate text-sm">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {isRequesting && <p className="text-center text-purple-400 mb-4 animate-pulse">Adding to queue...</p>}

        {/* Live Feed List */}
        <div className="space-y-3 relative z-0">
          {requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {req.album_art ? (
                <img src={req.album_art} alt="" className="w-14 h-14 rounded object-cover" />
              ) : (
                <div className="w-14 h-14 bg-gray-800 rounded flex items-center justify-center">🎵</div>
              )}
              <div className="overflow-hidden">
                <p className="font-bold truncate text-lg">{req.title}</p>
                <p className="text-sm text-gray-400 truncate">{req.artist}</p>
              </div>
            </div>
          ))}
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