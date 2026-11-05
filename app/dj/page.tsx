'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

function DJContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const [pulsingSongs, setPulsingSongs] = useState<{ [key: string]: boolean }>({});
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, (payload) => {
        setRequests((prev) => prev.map(req => req.id === payload.new.id ? payload.new : req));
        
        setPulsingSongs(prev => ({ ...prev, [payload.new.id]: true }));
        setTimeout(() => {
          setPulsingSongs(prev => ({ ...prev, [payload.new.id]: false }));
        }, 600); 
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'requests' }, (payload) => {
        setRequests((prev) => prev.filter((req) => req.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  const deleteRequest = async (id: string) => {
    setRequests((prev) => prev.filter((req) => req.id !== id));
    await supabase.from('requests').delete().eq('id', id);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-8 relative overflow-hidden">
      
      {/* FADED BACKGROUND LOGO */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <motion.div 
          animate={{ 
            y: [0, -15, 0], 
            opacity: [0.02, 0.04, 0.02] 
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <img 
            src="/bench-logo.png" 
            alt="" 
            className="w-[120vw] max-w-[1000px] blur-[3px] object-contain" 
          />
        </motion.div>
      </div>

      {/* INCREASED BACKGROUND GLOW */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-red-600/15 blur-[120px] rounded-full pointer-events-none z-0" />

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
        
        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {requests.map((req) => {
            const likeIntensity = Math.min(req.likes || 0, 20); 
            
            const r = 17 + (likeIntensity * 4); 
            const bgColor = `rgb(${r}, 17, 17)`; 

            const borderOpacity = 0.1 + (likeIntensity * 0.04); 
            const shadowSpread = likeIntensity * 3; 
            const shadowOpacity = likeIntensity * 0.05; 

            return (
              <div 
                key={req.id} 
                style={{
                  backgroundColor: bgColor, 
                  borderColor: `rgba(255, 255, 255, ${borderOpacity})`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 ${shadowSpread}px rgba(239,68,68,${shadowOpacity})`
                }}
                className="group relative flex items-center gap-4 p-4 rounded-xl border transition-colors duration-300"
              >
                
                {/* PULSE OVERLAY */}
                {pulsingSongs[req.id] && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-0 rounded-xl pointer-events-none border border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.9)] z-0"
                  />
                )}

                <button 
                  onClick={() => deleteRequest(req.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-lg z-20 backdrop-blur-sm"
                  title="Remove request"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <img src={req.album_art} alt="" className="w-16 h-16 rounded-lg object-cover shadow-md relative z-10" />
                <div className="overflow-hidden pr-6 relative z-10">
                  <p className="font-bold text-lg truncate leading-tight text-white">{req.title}</p>
                  <p className="text-gray-400 truncate text-sm mt-1">{req.artist}</p>
                </div>
              </div>
            );
          })}
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