import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import '../styles/MusicPlayer.css';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const MusicPlayer = ({ player }) => {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
  } = player;

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div className={`music-player ${currentSong ? 'active' : ''}`}>
      {/* Song Info */}
      <div className="player-song-info">
        <img
          src={currentSong?.coverImage || DEFAULT_COVER}
          alt={currentSong?.title || 'No song'}
          className="player-cover"
          onError={(e) => { e.target.src = DEFAULT_COVER; }}
        />
        <div className="player-meta">
          <p className="player-title">{currentSong?.title || 'No song playing'}</p>
          <p className="player-artist">{currentSong?.artist || '—'}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="player-center">
        <div className="player-controls">
          <button id="prev-btn" onClick={playPrev} className="ctrl-btn" disabled={!currentSong}>
            <SkipBack size={20} />
          </button>
          <button id="play-pause-btn" onClick={togglePlay} className="ctrl-btn play-btn" disabled={!currentSong}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button id="next-btn" onClick={playNext} className="ctrl-btn" disabled={!currentSong}>
            <SkipForward size={20} />
          </button>
        </div>

        <div className="player-progress">
          <span className="time">{formatTime(progress)}</span>
          <input
            id="progress-bar"
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            step={0.5}
            onChange={(e) => seek(Number(e.target.value))}
            className="progress-slider"
            style={{ '--progress': `${progressPercent}%` }}
          />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="player-volume">
        <Volume2 size={16} />
        <input
          id="volume-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="volume-slider"
          style={{ '--progress': `${volume * 100}%` }}
        />
      </div>
    </div>
  );
};

export default MusicPlayer;
