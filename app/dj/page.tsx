'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

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
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'requests' }, (payload) => {
        setRequests((prev) => prev.filter((req) => req.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  const deleteRequest = async (id: string) => {
    // Optimistic instant delete
    setRequests((prev) => prev.filter((req) => req.id !== id));
    await supabase.from('requests').delete().eq('id', id);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              bench<span className="text-red-500">.</span>
            </h1>
            <span className="text-gray-400 font-medium tracking-widest uppercase text-sm hidden md:inline-block">DJ Dashboard</span>
          </div>
        </div>
        
        {/* Grid (Updated to 4 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {requests.map((req) => (
            <div 
              key={req.id} 
              className="group relative flex items-center gap-4 p-4 bg-[#111111] rounded-xl border border-white/5 hover:border-red-500/30 shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.15)] transition-all duration-300"
            >
              {/* Trash Button */}
              <button 
                onClick={() => deleteRequest(req.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-lg z-20 backdrop-blur-sm"
                title="Remove request"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <img src={req.album_art} alt="" className="w-16 h-16 rounded-lg object-cover shadow-md" />
              <div className="overflow-hidden pr-6">
                <p className="font-bold text-lg truncate leading-tight text-white">{req.title}</p>
                <p className="text-gray-400 truncate text-sm mt-1">{req.artist}</p>
              </div>
            </div>
          ))}
        </div>
        
        {requests.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-col items-center justify-center mt-32 text-gray-500"
          >
            <div className="w-16 h-16 border-4 border-red-900/30 border-t-red-500 rounded-full animate-spin mb-6" />
            <p className="text-xl font-medium tracking-wide">Waiting for requests...</p>
          </motion.div>
        )}
      </div>
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