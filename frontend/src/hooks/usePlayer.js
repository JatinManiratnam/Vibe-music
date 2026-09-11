import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * usePlayer — manages audio playback for the Vibe Music app.
 *
 * Audio source resolution:
 *  - B2-backed songs  (song.b2Key != null): fetch a short-lived presigned URL
 *    from GET /api/songs/:id/stream-url, then set audio.src to that URL.
 *    B2 serves the audio directly — Render bandwidth is NOT consumed.
 *  - Legacy local songs (song.url, no b2Key): set audio.src = song.url directly.
 *
 * Play origin tracking:
 *  - getPlaySource: optional callback () => 'direct' | 'recommendation' | 'playlist'
 *    The callback is called at the moment the 10-second threshold is reached so it
 *    reflects whatever queue is active at that instant — not at song-load time.
 *    Using a ref keeps the timeupdate effect stable (no re-subscription on every render).
 *
 * All other player behaviour (play/pause, next/prev, seek, volume, queue)
 * is unchanged.
 */
const usePlayer = (songs, getPlaySource) => {
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('OFF'); // 'OFF', 'REPEAT_ALL', 'REPEAT_ONE'
  const [preferredQuality, setPreferredQuality] = useState('standard');
  const [actualQuality, setActualQuality] = useState(null);
  
  const audioRef = useRef(new Audio());
  const recordedPlayForSongId = useRef(null);
  const currentLoadIdRef = useRef(null);
  const shuffleHistory = useRef([]);
  // Stable ref to the getPlaySource callback — updated every render so the
  // timeupdate handler always reads the latest value without re-subscribing.
  const getPlaySourceRef = useRef(getPlaySource);
  
  // Refs for smooth quality switching
  const isQualitySwitchRef = useRef(false);
  const cachedTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);

  // Keep the getPlaySource ref in sync with the latest prop on every render.
  getPlaySourceRef.current = getPlaySource;

  const currentSong = currentIndex !== null ? songs[currentIndex] : null;

  // ── Global Cleanup on Unmount ────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      currentLoadIdRef.current = null; // Prevent pending async fetches from starting playback after logout
    };
  }, []);

  // ── Load new song whenever currentIndex changes or quality preference changes ──
  useEffect(() => {
    if (!currentSong) return;

    const isSwitching = isQualitySwitchRef.current;
    isQualitySwitchRef.current = false; // Consume the flag immediately

    if (!isSwitching) {
      recordedPlayForSongId.current = null; // Reset 10s tracker ONLY for new song, not for quality switch
    }

    const loadSong = async () => {
      setIsLoadingStream(true);
      setStreamError(null);
      
      const loadId = `${currentSong._id}-${preferredQuality}-${Date.now()}`;
      currentLoadIdRef.current = loadId;

      let src;
      let returnedQuality = 'standard';

      if (currentSong.b2Key || currentSong.audioVariants) {
        // B2-backed song: fetch a presigned URL from the backend
        try {
          const { data } = await api.get(`/songs/${currentSong._id}/stream-url?quality=${preferredQuality}`);
          src = data.streamUrl;
          returnedQuality = data.quality || 'standard';
        } catch (err) {
          console.error('[usePlayer] Failed to get B2 stream URL:', err.message);
          if (currentLoadIdRef.current === loadId) {
            setStreamError('Failed to load audio stream');
            setIsLoadingStream(false);
            if (!isSwitching) setIsPlaying(false);
          }
          return; // Cannot load this song
        }
      } else {
        // Legacy local song: use the stored URL directly
        src = currentSong.url;
        returnedQuality = 'standard';
      }

      if (currentLoadIdRef.current !== loadId) {
        // Race condition: user switched songs or quality before URL was fetched
        return;
      }

      setActualQuality(returnedQuality);

      audioRef.current.src = src;
      audioRef.current.load();
      
      if (isSwitching) {
        audioRef.current.currentTime = cachedTimeRef.current;
        setProgress(cachedTimeRef.current);
        if (wasPlayingRef.current) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        if (isPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
      
      setIsLoadingStream(false);
    };

    loadSong();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, preferredQuality]);

  // ── Sync volume ──────────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const playNext = useCallback((isAuto = false) => {
    if (songs.length === 0 || currentIndex === null) return;
    
    // REPEAT_ONE auto-advance behavior
    if (isAuto === true && repeatMode === 'REPEAT_ONE') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      recordedPlayForSongId.current = null; // Reset 10s tracker for the new playback
      setProgress(0);
      return;
    }

    let nextIndex;

    if (isShuffle) {
      if (songs.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * songs.length);
        } while (nextIndex === currentIndex);
      } else {
        nextIndex = currentIndex;
      }
      shuffleHistory.current.push(currentIndex);
    } else {
      if (currentIndex === songs.length - 1) {
        if (isAuto === true && repeatMode === 'OFF') {
          setIsPlaying(false);
          return;
        }
        nextIndex = 0;
      } else {
        nextIndex = currentIndex + 1;
      }
      shuffleHistory.current = [];
    }

    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  }, [songs, currentIndex, isShuffle, repeatMode]);

  // ── Progress tracking ────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    
    const updateProgress = () => {
      setProgress(audio.currentTime);
      
      // Track play if current time > 10s OR reached the end of a short song.
      // The source is resolved at this moment (not at song-load time) so that
      // switching queue type before the 10s mark records the correct origin.
      // Quality switches reset the load ID but keep recordedPlayForSongId intact,
      // so a STD↔FLAC switch never creates a second Play record for the same song.
      if (currentSong && recordedPlayForSongId.current !== currentSong._id) {
        if (audio.currentTime >= 10 || (audio.duration > 0 && audio.currentTime >= audio.duration)) {
          recordedPlayForSongId.current = currentSong._id;
          const source = typeof getPlaySourceRef.current === 'function'
            ? getPlaySourceRef.current()
            : 'direct';
          api.post(`/songs/${currentSong._id}/play`, { source }).catch((err) => {
            console.error('[usePlayer] Failed to record play:', err.message);
          });
        }
      }
    };
    
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext(true);
    const handleError = (e) => {
      console.error('[usePlayer] Native audio error:', e);
      setStreamError('Audio playback error');
      setIsPlaying(false);
      setIsLoadingStream(false);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentSong, playNext]);

  const playSong = useCallback(
    (index) => {
      if (index === currentIndex) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        setCurrentIndex(index);
        setIsPlaying(true);
      }
    },
    [currentIndex, isPlaying]
  );

  const togglePlay = () => {
    if (!currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying((prev) => !prev);
  };

  const playPrev = useCallback(() => {
    if (songs.length === 0 || currentIndex === null) return;
    
    let prevIndex;
    if (isShuffle && shuffleHistory.current.length > 0) {
      prevIndex = shuffleHistory.current.pop();
    } else {
      prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    }
    
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
  }, [songs, currentIndex, isShuffle]);

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const clearSong = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setCurrentIndex(null);
    setIsPlaying(false);
    setProgress(0);
    currentLoadIdRef.current = null;
  }, []);

  const changeQuality = useCallback((newQuality) => {
    if (newQuality === preferredQuality) return;
    
    // Capture state for seamless mid-stream switching
    isQualitySwitchRef.current = true;
    wasPlayingRef.current = !audioRef.current.paused;
    cachedTimeRef.current = audioRef.current.currentTime;
    
    setPreferredQuality(newQuality);
  }, [preferredQuality]);

  return {
    currentSong,
    currentIndex,
    isPlaying,
    progress,
    duration,
    volume,
    isLoadingStream,
    streamError,
    preferredQuality,
    actualQuality,
    changeQuality,
    playSong,
    togglePlay,
    playNext,
    playPrev,
    seek,
    clearSong,
    setVolume,
    toggleShuffle: () => setIsShuffle(prev => !prev),
    toggleRepeat: () => setRepeatMode(prev => prev === 'OFF' ? 'REPEAT_ALL' : prev === 'REPEAT_ALL' ? 'REPEAT_ONE' : 'OFF'),
  };
};

export default usePlayer;
