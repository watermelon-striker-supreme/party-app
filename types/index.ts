export interface Song {
    id: string;
    title: string;
    artist: string;
    albumArt: string;
  }
  
  export interface Request extends Song {
    room_id: string;
    created_at: string;
  }