import { Song } from '@/types';

export async function searchSongs(query: string): Promise<Song[]> {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`
  );
  const data = await response.json();
  
  return data.results.map((track: any) => ({
    id: track.trackId.toString(),
    title: track.trackName,
    artist: track.artistName,
    albumArt: track.artworkUrl100?.replace('100x100', '600x600') || '',
  }));
}