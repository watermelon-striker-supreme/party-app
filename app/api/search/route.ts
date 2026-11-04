import { NextResponse } from 'next/server';
import { searchSongs } from '@/lib/itunes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  try {
    const songs = await searchSongs(query);
    return NextResponse.json(songs);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}