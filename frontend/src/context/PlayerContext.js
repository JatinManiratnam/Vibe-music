import { createContext, useContext, useState, useRef, useCallback } from 'react';
import usePlayer from '../hooks/usePlayer';

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

  return (
    <PlayerContext.Provider value={{ player, queue, setQueue, setPlaySource }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const useGlobalPlayer = () => useContext(PlayerContext);
