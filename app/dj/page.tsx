'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function DJContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const room = searchParams.get('room') || 'main';

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase.from('requests').select('*').eq('room_id', room).order('created_at', { ascending: false });
      if (data) setRequests(data);
    };
    fetchRequests();

    const channel = supabase.channel('dj_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `room_id=eq.${room}` }, (payload) => {
        setRequests((prev) => [payload.new, ...prev]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-purple-500">DJ Dashboard</h1>
        <span className="bg-purple-900 px-4 py-2 rounded-full font-bold">Room: {room.toUpperCase()}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map((req) => (
          <div key={req.id} className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800 shadow-lg">
            <img src={req.album_art} alt="" className="w-16 h-16 rounded-lg" />
            <div className="overflow-hidden">
              <p className="font-bold text-lg truncate">{req.title}</p>
              <p className="text-gray-400 truncate">{req.artist}</p>
            </div>
          </div>
        ))}
      </div>
      {requests.length === 0 && <p className="text-gray-500 text-xl text-center mt-20">Waiting for requests...</p>}
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