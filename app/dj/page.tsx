'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function DJContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const room = searchParams.get('room') || 'main';

  useEffect(() => {
    // Initial fetch
    const fetchRequests = async () => {
      const { data } = await supabase.from('requests').select('*').eq('room_id', room).order('created_at', { ascending: false });
      if (data) setRequests(data);
    };
    fetchRequests();

    // Subscribe to Realtime INSERTs and DELETEs
    const channel = supabase.channel('dj_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `room_id=eq.${room}` }, (payload) => {
        setRequests((prev) => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'requests' }, (payload) => {
        // Instantly remove from local state when deleted from db
        setRequests((prev) => prev.filter((req) => req.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  const deleteRequest = async (id: string) => {
    // Optimistic UI update (feels instant)
    setRequests((prev) => prev.filter((req) => req.id !== id));
    // Delete from database
    await supabase.from('requests').delete().eq('id', id);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-purple-500">DJ Dashboard</h1>
        <span className="bg-purple-900/50 text-purple-300 px-4 py-2 rounded-full font-bold border border-purple-800">
          Room: {room.toUpperCase()}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map((req) => (
          /* "group relative" is the magic Tailwind trick for hover reveals */
          <div key={req.id} className="group relative flex items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800 shadow-lg hover:border-gray-700 transition">
            
            {/* Trash Button (Hidden until hover) */}
            <button 
              onClick={() => deleteRequest(req.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-1.5 rounded-md"
              title="Remove request"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>

            <img src={req.album_art} alt="" className="w-16 h-16 rounded-lg object-cover" />
            <div className="overflow-hidden pr-6">
              <p className="font-bold text-lg truncate">{req.title}</p>
              <p className="text-gray-400 truncate">{req.artist}</p>
            </div>
          </div>
        ))}
      </div>
      
      {requests.length === 0 && (
        <p className="text-gray-500 text-xl text-center mt-20">Waiting for requests...</p>
      )}
    </main>
  );
}

export default function DJ() {
  return (
    <Suspense fallback={<div className="text-white text-center mt-10">Loading DJ Dashboard...</div>}>
      <DJContent />
    </Suspense>
  );
}