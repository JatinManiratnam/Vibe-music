import { useState, useRef, useEffect, useCallback } from 'react';

const usePlayer = (songs) => {
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef(new Audio());

  const currentSong = currentIndex !== null ? songs[currentIndex] : null;

  // Load new song whenever currentIndex changes
  useEffect(() => {
    if (currentSong) {
      audioRef.current.src = currentSong.url;
      audioRef.current.load();
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Sync volume
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, songs]);

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
        // The useEffect above will load and play
        setTimeout(() => audioRef.current.play().catch(() => {}), 100);
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

  const playNext = useCallback(() => {
    if (songs.length === 0) return;
    setCurrentIndex((prev) => (prev === null ? 0 : (prev + 1) % songs.length));
    setIsPlaying(true);
    setTimeout(() => audioRef.current.play().catch(() => {}), 100);
  }, [songs]);

  const playPrev = useCallback(() => {
    if (songs.length === 0) return;
    setCurrentIndex((prev) =>
      prev === null ? 0 : (prev - 1 + songs.length) % songs.length
    );
    setIsPlaying(true);
    setTimeout(() => audioRef.current.play().catch(() => {}), 100);
  }, [songs]);

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  return {
    currentSong,
    currentIndex,
    isPlaying,
    progress,
    duration,
    volume,
    playSong,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
  };
};

export default usePlayer;
