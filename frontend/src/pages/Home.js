import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SongCard from '../components/SongCard';
import MusicPlayer from '../components/MusicPlayer';
import PlaylistModal from '../components/PlaylistModal';
import usePlayer from '../hooks/usePlayer';
import '../styles/Home.css';

const Home = () => {
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [likeLoading, setLikeLoading] = useState({});
  const { user, updateUser } = useAuth();

  const player = usePlayer(
    activePlaylist ? activePlaylist.songs : songs
  );

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        setError(false);
        const { data } = await api.get(`/songs${search ? `?search=${search}` : ''}`);
        setSongs(data);
      } catch (err) {
        console.error('Failed to fetch songs', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    const delay = setTimeout(fetchSongs, 300); // debounce
    return () => clearTimeout(delay);
  }, [search, retryTrigger]);

  // Fetch playlists
  const fetchPlaylists = async () => {
    try {
      const { data } = await api.get('/playlists');
      setPlaylists(data);
    } catch (err) {
      console.error('Failed to fetch playlists', err);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleAddToPlaylist = (song) => {
    setSelectedSong(song);
    setShowModal(true);
  };

  const handleSelectPlaylist = (playlist) => {
    setActivePlaylist(playlist);
  };

  const handleLike = async (songId) => {
    if (!user) return; // User must be logged in to like
    if (likeLoading[songId]) return; // Prevent rapid duplicate requests

    try {
      setLikeLoading((prev) => ({ ...prev, [songId]: true }));
      const { data } = await api.post(`/songs/${songId}/like`);
      updateUser({ likedSongs: data.likedSongs });
    } catch (err) {
      console.error('Failed to toggle like', err);
    } finally {
      setLikeLoading((prev) => ({ ...prev, [songId]: false }));
    }
  };

  const displaySongs = activePlaylist ? activePlaylist.songs : songs;

  return (
    <div className="home-layout">
      <Sidebar
        playlists={playlists}
        onRefresh={fetchPlaylists}
        onSelectPlaylist={handleSelectPlaylist}
        activePlaylist={activePlaylist}
        onClearPlaylist={() => setActivePlaylist(null)}
      />

      <div className="home-main">
        <Navbar
          search={search}
          setSearch={setSearch}
        />

        <div className="home-content">
          <h2 className="section-title">
            {activePlaylist ? `📋 ${activePlaylist.name}` : '🎵 All Songs'}
          </h2>

          {loading ? (
            <div className="loading-state" style={{ textAlign: 'center', marginTop: '4rem' }}>
              <p style={{ color: '#b3b3b3' }}>Loading songs...</p>
            </div>
          ) : error ? (
            <div className="error-state" style={{ textAlign: 'center', marginTop: '4rem' }}>
              <p style={{ color: '#ff4b4b', marginBottom: '1rem' }}>Unable to load songs.</p>
              <button 
                onClick={() => setRetryTrigger(prev => prev + 1)} 
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #ff4b4b', color: '#ff4b4b', borderRadius: '4px', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : displaySongs.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', marginTop: '4rem' }}>
              <p style={{ color: '#b3b3b3', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {activePlaylist
                  ? 'This playlist is empty. Add songs from the library!'
                  : search
                  ? 'No songs found.'
                  : 'No music available yet.'}
              </p>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>
                {activePlaylist
                  ? ''
                  : search
                  ? 'Try adjusting your search terms.'
                  : 'Songs will appear here once they are uploaded to the platform.'}
              </p>
            </div>
          ) : (
            <div className="song-grid">
              {displaySongs.map((song, index) => (
                <SongCard
                  key={song._id}
                  song={song}
                  index={index}
                  isPlaying={
                    player.currentIndex === index && player.isPlaying
                  }
                  isActive={player.currentIndex === index}
                  isLiked={user?.likedSongs?.includes(song._id)}
                  onLike={user ? handleLike : undefined}
                  onPlay={() => player.playSong(index)}
                  onAddToPlaylist={() => handleAddToPlaylist(song)}
                />
              ))}
            </div>
          )}
        </div>

        <MusicPlayer player={player} />
      </div>

      {showModal && (
        <PlaylistModal
          song={selectedSong}
          playlists={playlists}
          onClose={() => setShowModal(false)}
          onRefresh={fetchPlaylists}
        />
      )}
    </div>
  );
};

export default Home;
