import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SongCard from '../components/SongCard';
import PlaylistModal from '../components/PlaylistModal';
import { useGlobalPlayer } from '../context/PlayerContext';
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
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState(false);
  const [activeQueueType, setActiveQueueType] = useState('all'); // 'all', 'playlist', 'recommendations', 'liked'
  const { user, updateUser } = useAuth();
  const { player, setQueue, setPlaySource } = useGlobalPlayer();

  // The subset of songs displayed on the screen right now
  let displaySongs = songs;
  if (activeQueueType === 'liked') {
    displaySongs = songs.filter(s => user?.likedSongs?.includes(s._id));
  } else if (activePlaylist) {
    displaySongs = activePlaylist.songs;
  }

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

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setRecsLoading(true);
        setRecsError(false);
        const { data } = await api.get('/recommendations');
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Failed to fetch recommendations', err);
        setRecsError(true);
      } finally {
        setRecsLoading(false);
      }
    };
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

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

  // Removed displaySongs from here, it's computed above

  return (
    <div className="home-layout">
      <Sidebar
        playlists={playlists}
        onRefresh={fetchPlaylists}
        onSelectPlaylist={(playlist) => {
          setActiveQueueType('playlist');
          handleSelectPlaylist(playlist);
        }}
        activePlaylist={activePlaylist}
        onClearPlaylist={() => {
          setActiveQueueType('all');
          setActivePlaylist(null);
        }}
        onSelectLikedSongs={() => {
          setActiveQueueType('liked');
          setActivePlaylist(null);
        }}
        activeQueueType={activeQueueType}
      />

      <div className="home-main">
        <Navbar
          search={search}
          setSearch={setSearch}
        />

        <div className="home-content" style={{ paddingBottom: '120px' }}>
          {!activePlaylist && activeQueueType !== 'liked' && !search && (
            <div className="recommendations-section" style={{ marginBottom: '3rem' }}>
              <h2 className="section-title">✨ Recommended for You</h2>
              {recsLoading ? (
                <div className="loading-state">
                  <p style={{ color: '#b3b3b3' }}>Loading recommendations...</p>
                </div>
              ) : recsError ? (
                <div className="error-state">
                  <p style={{ color: '#ff4b4b' }}>Unable to load recommendations.</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="empty-state">
                  <p style={{ color: '#b3b3b3' }}>Keep listening to get personalized recommendations!</p>
                </div>
              ) : (
                <div className="song-grid">
                  {recommendations.map((song, index) => (
                    <SongCard
                      key={`rec-${song._id}`}
                      song={song}
                      index={index}
                      isPlaying={activeQueueType === 'recommendations' && player.currentIndex === index && player.isPlaying}
                      isActive={activeQueueType === 'recommendations' && player.currentIndex === index}
                      isLiked={user?.likedSongs?.includes(song._id)}
                      onLike={user ? handleLike : undefined}
                      onPlay={() => {
                        setActiveQueueType('recommendations');
                        setQueue(recommendations);
                        setPlaySource(() => () => 'recommendation');
                        player.playSong(index);
                      }}
                      onAddToPlaylist={() => handleAddToPlaylist(song)}
                      reason={song.reason}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 className="section-title">
            {activePlaylist 
              ? `📋 ${activePlaylist.name}` 
              : activeQueueType === 'liked' 
              ? '❤️ Liked Songs'
              : search 
              ? '🔍 Search Results' 
              : '🎵 All Songs'}
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
                  : activeQueueType === 'liked'
                  ? 'You haven\'t liked any songs yet.'
                  : search
                  ? 'No songs found.'
                  : 'No music available yet.'}
              </p>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>
                {activePlaylist
                  ? ''
                  : activeQueueType === 'liked'
                  ? 'Click the heart icon on any song to add it here.'
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
                    (activeQueueType === 'all' || activeQueueType === 'playlist') && 
                    player.currentIndex === index && player.isPlaying
                  }
                  isActive={(activeQueueType === 'all' || activeQueueType === 'playlist') && player.currentIndex === index}
                  isLiked={user?.likedSongs?.includes(song._id)}
                  onLike={user ? handleLike : undefined}
                  onPlay={() => {
                    setActiveQueueType(activePlaylist ? 'playlist' : activeQueueType === 'liked' ? 'liked' : 'all');
                    setQueue(displaySongs);
                    setPlaySource(() => () => activePlaylist ? 'playlist' : 'direct');
                    player.playSong(index);
                  }}
                  onAddToPlaylist={() => handleAddToPlaylist(song)}
                />
              ))}
            </div>
          )}
        </div>

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
