import { useState } from 'react';
import api from '../api/axios';
import { X } from 'lucide-react';
import '../styles/PlaylistModal.css';

const PlaylistModal = ({ song, playlists, onClose, onRefresh }) => {
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.post('/playlists', { name: newName.trim() });
      setNewName('');
      setCreating(false);
      onRefresh();
    } catch (err) {
      setStatus(err.response?.data?.message || 'Failed to create playlist');
    }
  };

  const handleAdd = async (playlistId) => {
    try {
      await api.put(`/playlists/${playlistId}/songs`, { songId: song._id });
      setStatus('✔ Added successfully!');
      onRefresh();
      setTimeout(onClose, 1200);
    } catch (err) {
      setStatus(err.response?.data?.message || 'Failed to add song');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Playlist</h3>
          <button id="modal-close" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-song-info">
          <strong>{song?.title}</strong>
          <span> by {song?.artist}</span>
        </div>

        {status && <p className="modal-status">{status}</p>}

        {playlists.length === 0 ? (
          <div className="modal-empty">
            <p>No playlists yet</p>
            <p style={{ fontSize: '0.9rem', color: '#b3b3b3', margin: '0.5rem 0 1.5rem' }}>
              Create your first playlist to start organizing your music.
            </p>
            {creating ? (
              <form onSubmit={handleCreate} className="create-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Playlist name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #3f3f4e', background: '#2c2c35', color: '#fff' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ padding: '0.5rem 1rem', background: '#1db954', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}>Create</button>
                  <button type="button" onClick={() => setCreating(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#fff', border: '1px solid #3f3f4e', borderRadius: '4px', cursor: 'pointer', flex: 1 }}>Cancel</button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setCreating(true)}
                style={{ padding: '0.5rem 1rem', background: '#1db954', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Create Playlist
              </button>
            )}
          </div>
        ) : (
          <ul className="modal-playlist-list">
            {playlists.map((pl) => (
              <li key={pl._id}>
                <button
                  id={`add-to-${pl._id}`}
                  className="modal-pl-btn"
                  onClick={() => handleAdd(pl._id)}
                >
                  <span>📋 {pl.name}</span>
                  <span className="pl-count">{pl.songs.length} songs</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PlaylistModal;
