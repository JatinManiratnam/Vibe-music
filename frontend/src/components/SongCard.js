import { Play, Pause, PlusCircle } from 'lucide-react';
import '../styles/SongCard.css';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';

const formatDuration = (seconds) => {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SongCard = ({ song, index, isPlaying, isActive, onPlay, onAddToPlaylist }) => {
  return (
    <div className={`song-card ${isActive ? 'active' : ''}`}>
      <div className="song-cover-wrap" onClick={onPlay}>
        <img
          src={song.coverImage || DEFAULT_COVER}
          alt={song.title}
          className="song-cover"
          onError={(e) => { e.target.src = DEFAULT_COVER; }}
        />
        <div className="song-overlay">
          {isPlaying ? (
            <Pause size={28} className="play-icon" />
          ) : (
            <Play size={28} className="play-icon" />
          )}
        </div>
        {isPlaying && <div className="playing-indicator" />}
      </div>

      <div className="song-info">
        <p className="song-title" title={song.title}>{song.title}</p>
        <p className="song-artist" title={song.artist}>{song.artist}</p>
        <p className="song-meta">
          <span>{song.album}</span>
          <span>{formatDuration(song.duration)}</span>
        </p>
      </div>

      <button
        id={`add-playlist-${song._id}`}
        className="add-btn"
        onClick={onAddToPlaylist}
        title="Add to playlist"
      >
        <PlusCircle size={18} />
      </button>
    </div>
  );
};

export default SongCard;
