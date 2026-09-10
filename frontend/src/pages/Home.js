import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SongCard from '../components/SongCard';
import MusicPlayer from '../components/MusicPlayer';
import PlaylistModal from '../components/PlaylistModal';
import UploadSongModal from '../components/UploadSongModal';
import usePlayer from '../hooks/usePlayer';
import '../styles/Home.css';

const Home = () => {
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const player = usePlayer(
    activePlaylist ? activePlaylist.songs : songs
  );

  // Fetch songs on search change
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/songs${search ? `?search=${search}` : ''}`);
        setSongs(data);
      } catch (err) {
        console.error('Failed to fetch songs', err);
      } finally {
        setLoading(false);
      }
    };
    const delay = setTimeout(fetchSongs, 300); // debounce
    return () => clearTimeout(delay);
  }, [search]);

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
          onUploadClick={() => setShowUploadModal(true)}
        />

        <div className="home-content">
          <h2 className="section-title">
            {activePlaylist ? `📋 ${activePlaylist.name}` : '🎵 All Songs'}
          </h2>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading songs...</p>
            </div>
          ) : displaySongs.length === 0 ? (
            <div className="empty-state">
              <span>🎧</span>
              <p>
                {activePlaylist
                  ? 'This playlist is empty. Add songs from the library!'
                  : search
                  ? `No songs found for "${search}"`
                  : 'No songs yet. Add songs via the API to get started!'}
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

      {showUploadModal && (
        <UploadSongModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => {
            setSearch('');
            // re-trigger song fetch by nudging search state
            setSongs([]);
            setLoading(true);
            api.get('/songs').then(({ data }) => setSongs(data)).finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
};

export default Home;
