import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { getCoverSrc } from '../utils/cover';
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
    isLoadingStream,
    streamError,
    isShuffle,
    repeatMode,
    preferredQuality,
    actualQuality,
    changeQuality,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = player;

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div className={`music-player ${currentSong ? 'active' : ''}`}>
      {/* Song Info */}
      <div className="player-song-info">
        <img
          src={getCoverSrc(currentSong)}
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
      <div className="player-center" style={{ position: 'relative' }}>
        {streamError && (
          <div style={{ position: 'absolute', top: '-25px', color: '#ff4b4b', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {streamError}
          </div>
        )}
        <div className="player-controls">
          <button onClick={toggleShuffle} className="ctrl-btn" disabled={!currentSong} title="Shuffle">
            <Shuffle size={18} color={isShuffle ? '#1db954' : '#fff'} />
          </button>
          <button id="prev-btn" onClick={playPrev} className="ctrl-btn" disabled={!currentSong}>
            <SkipBack size={20} />
          </button>
          <button id="play-pause-btn" onClick={togglePlay} className="ctrl-btn play-btn" disabled={!currentSong || streamError}>
            {isLoadingStream ? (
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : isPlaying ? (
              <Pause size={24} />
            ) : (
              <Play size={24} />
            )}
          </button>
          <button id="next-btn" onClick={() => playNext(false)} className="ctrl-btn" disabled={!currentSong}>
            <SkipForward size={20} />
          </button>
          <button onClick={toggleRepeat} className="ctrl-btn" disabled={!currentSong} title="Repeat">
            {repeatMode === 'REPEAT_ONE' ? (
              <Repeat1 size={18} color="#1db954" />
            ) : (
              <Repeat size={18} color={repeatMode === 'REPEAT_ALL' ? '#1db954' : '#fff'} />
            )}
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

      {/* Right Controls: Quality & Volume */}
      <div className="player-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {currentSong && (
          <div className="quality-pill" style={{ display: 'flex', background: '#181818', borderRadius: '12px', padding: '2px', border: '1px solid #3f3f4e' }}>
            <button
              onClick={() => changeQuality('standard')}
              style={{ background: preferredQuality === 'standard' ? '#3f3f4e' : 'transparent', color: actualQuality === 'standard' ? '#fff' : '#aaa', border: 'none', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: actualQuality === 'standard' ? 'bold' : 'normal' }}
              title={actualQuality === 'standard' ? 'Playing Standard' : 'Switch to Standard'}
            >
              STD
            </button>
            <button
              onClick={() => changeQuality('lossless')}
              disabled={!currentSong.audioVariants?.lossless?.b2Key}
              style={{ background: preferredQuality === 'lossless' ? '#3f3f4e' : 'transparent', color: actualQuality === 'lossless' ? '#1db954' : '#aaa', border: 'none', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', cursor: !currentSong.audioVariants?.lossless?.b2Key ? 'not-allowed' : 'pointer', opacity: !currentSong.audioVariants?.lossless?.b2Key ? 0.4 : 1, fontWeight: actualQuality === 'lossless' ? 'bold' : 'normal' }}
              title={!currentSong.audioVariants?.lossless?.b2Key ? 'Lossless unavailable' : actualQuality === 'lossless' ? 'Playing Lossless' : 'Switch to Lossless'}
            >
              FLAC
            </button>
          </div>
        )}
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
    </div>
  );
};

export default MusicPlayer;
