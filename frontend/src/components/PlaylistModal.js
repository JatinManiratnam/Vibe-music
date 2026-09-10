import { useState } from 'react';
import api from '../api/axios';
import { X } from 'lucide-react';
import '../styles/PlaylistModal.css';

const PlaylistModal = ({ song, playlists, onClose, onRefresh }) => {
  const [status, setStatus] = useState('');

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
          <p className="modal-empty">
            No playlists yet. Create one from the sidebar!
          </p>
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
