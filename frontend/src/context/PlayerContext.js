import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import usePlayer from '../hooks/usePlayer';
import { useAuth } from './AuthContext';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  
  // We keep a ref to the current source resolver so that different pages
  // (like Home or AdminPanel) can dynamically inject their source logic
  // without triggering a re-render of the player context.
  const getPlaySourceRef = useRef(() => 'direct');
  
  const setPlaySource = useCallback((fn) => {
    getPlaySourceRef.current = fn;
  }, []);

  const getPlaySource = useCallback(() => {
    return getPlaySourceRef.current();
  }, []);

  const player = usePlayer(queue, getPlaySource);

  // ── Logout cleanup ───────────────────────────────────────────────────────
  // Watch the authenticated user. When a previously authenticated session
  // transitions to null (logout), stop audio and clear all player state.
  // We use a ref to avoid reacting to the initial hydration null (the
  // brief window before AuthContext rehydrates from localStorage).
  const { user, loading } = useAuth();
  const prevUserRef = useRef(undefined); // undefined = not yet observed

  useEffect(() => {
    // Skip until auth has finished hydrating from localStorage
    if (loading) return;

    const prev = prevUserRef.current;
    prevUserRef.current = user;

    // prev === undefined: first observation after hydration — not a logout
    // prev !== null && user === null: genuine logout transition
    if (prev !== undefined && prev !== null && user === null) {
      player.clearSong();
      setQueue([]);
    }
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  // player.clearSong and setQueue are stable references; intentionally omitted
  // to avoid a dependency loop since player is recreated by usePlayer each render.

  return (
    <PlayerContext.Provider value={{ player, queue, setQueue, setPlaySource }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const useGlobalPlayer = () => useContext(PlayerContext);
