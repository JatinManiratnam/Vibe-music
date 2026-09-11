import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCoverSrc } from '../utils/cover';
import UploadSongModal from '../components/UploadSongModal';
import {
  Music2,
  BarChart2,
  ListMusic,
  LayoutDashboard,
  LogOut,
  UploadCloud,
  Trash2,
  AlertCircle,
  Disc3,
} from 'lucide-react';
import '../styles/ContributorDashboard.css';
import '../styles/MySongs.css';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';

const formatDuration = (seconds) => {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const MySongs = () => {
  const { logout } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null); // song._id being deleted
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const fetchMySongs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/songs/mine');
      setSongs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your songs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMySongs();
  }, [fetchMySongs]);

  const handleDelete = async (song) => {
    const confirmed = window.confirm(
      `Delete "${song.title}" by ${song.artist}?\n\nThis will permanently remove the song and its audio file. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(song._id);
    try {
      await api.delete(`/songs/${song._id}`);
      setSongs((prev) => prev.filter((s) => s._id !== song._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete song. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleUploaded = () => {
    setUploadModalOpen(false);
    fetchMySongs(); // refresh the list after a new upload
  };

  return (
    <div className="dash-layout">
      {/* ── Sidebar (same as ContributorDashboard) ── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">
          <Music2 size={20} />
          <span>Vibe Music</span>
        </div>

        <nav className="dash-nav">
          <Link className="dash-nav-item" to="/dashboard">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <a className="dash-nav-item dash-nav-active" href="/dashboard/my-songs">
            <ListMusic size={16} />
            <span>My Songs</span>
          </a>
          <span className="dash-nav-item dash-nav-disabled">
            <BarChart2 size={16} />
            <span>Analytics</span>
          </span>
        </nav>

        <button className="dash-nav-logout" onClick={logout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="dash-main">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">My Songs</h1>
            <p className="dash-subtitle">
              {loading ? 'Loading…' : `${songs.length} song${songs.length !== 1 ? 's' : ''} uploaded`}
            </p>
          </div>
          <div className="dash-header-actions">
            <button
              className="dash-btn dash-btn-primary"
              onClick={() => setUploadModalOpen(true)}
              id="my-songs-upload-btn"
            >
              <UploadCloud size={16} />
              Upload Music
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="my-songs-content">
          {loading ? (
            <div className="my-songs-loading">
              <div className="spinner" />
              <p>Loading your songs…</p>
            </div>
          ) : error ? (
            <div className="my-songs-error">
              <AlertCircle size={28} />
              <p>{error}</p>
              <button className="dash-btn dash-btn-outline" onClick={fetchMySongs}>
                Try Again
              </button>
            </div>
          ) : songs.length === 0 ? (
            <div className="my-songs-empty">
              <Disc3 size={48} className="my-songs-empty-icon" />
              <h3>No songs yet</h3>
              <p>You haven't uploaded any songs yet.<br />Click <strong>Upload Music</strong> to get started.</p>
              <button
                className="dash-btn dash-btn-primary"
                onClick={() => setUploadModalOpen(true)}
              >
                <UploadCloud size={16} />
                Upload Music
              </button>
            </div>
          ) : (
            <div className="my-songs-list">
              {songs.map((song, index) => (
                <div key={song._id} className="my-song-row">
                  <span className="my-song-index">{index + 1}</span>

                  <img
                    className="my-song-cover"
                    src={getCoverSrc(song)}
                    alt={song.title}
                    onError={(e) => { e.target.src = DEFAULT_COVER; }}
                  />

                  <div className="my-song-info">
                    <span className="my-song-title">{song.title}</span>
                    <span className="my-song-artist">{song.artist}</span>
                  </div>

                  <span className="my-song-album">{song.album || '—'}</span>
                  <span className="my-song-genre">{song.genre || '—'}</span>
                  <span className="my-song-duration">{formatDuration(song.duration)}</span>

                  {song.b2Key && (
                    <span className="my-song-badge" title="Stored on Backblaze B2">B2</span>
                  )}

                  <button
                    id={`delete-song-${song._id}`}
                    className="my-song-delete-btn"
                    onClick={() => handleDelete(song)}
                    disabled={deleting === song._id}
                    title="Delete song"
                  >
                    {deleting === song._id ? (
                      <span className="upload-spinner" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {uploadModalOpen && (
        <UploadSongModal
          onClose={() => setUploadModalOpen(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
};

export default MySongs;
