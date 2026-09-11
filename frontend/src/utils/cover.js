const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';

export const getCoverSrc = (song) => {
  if (!song) return DEFAULT_COVER;
  
  if (song.coverB2Key) {
    return `${API_URL}/songs/${song._id}/cover-url`;
  }
  
  if (song.coverImage) {
    return song.coverImage;
  }
  
  return DEFAULT_COVER;
};
