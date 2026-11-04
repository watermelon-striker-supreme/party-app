'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Song } from '@/types';

function HomeContent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  
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
        setResults([]); // Clear if less than 2 chars
      }
    }, 400); // Wait 400ms after user stops typing

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
    
    // Instantly route to the feed
    router.push(`/feed?room=${room}`);
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center pt-24">
      <div className="w-full max-w-md relative">
        <h1 className="text-4xl font-bold mb-2 text-center text-purple-500">Request a Song</h1>
        <p className="text-center text-gray-400 mb-8">Room: {room.toUpperCase()}</p>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search..."
            disabled={isRequesting}
            className="w-full p-4 rounded-lg bg-gray-900 border border-gray-700 text-white text-lg focus:outline-none focus:border-purple-500 relative z-20"
          />

          {/* Real-time Dropdown */}
          {query.trim().length > 1 && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-10 max-h-96 overflow-y-auto">
              {results.map((song) => (
                <button
                  key={song.id}
                  onClick={() => submitRequest(song)}
                  disabled={isRequesting}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition text-left border-b border-gray-700/50 last:border-b-0"
                >
                  <img src={song.albumArt} alt="" className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate text-sm">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {isRequesting && <p className="text-center text-purple-400 mt-4 animate-pulse">Sending to DJ...</p>}
      </div>
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