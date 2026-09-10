import { useState } from 'react';
import api from '../api/axios';
import { ListMusic, PlusCircle, Trash2, ChevronRight } from 'lucide-react';
import '../styles/Sidebar.css';

const Sidebar = ({ playlists, onRefresh, onSelectPlaylist, activePlaylist, onClearPlaylist }) => {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.post('/playlists', { name: newName.trim() });
      setNewName('');
      setCreating(false);
      onRefresh();
    } catch (err) {
      console.error('Create playlist failed', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/playlists/${id}`);
      if (activePlaylist?._id === id) onClearPlaylist();
      onRefresh();
    } catch (err) {
      console.error('Delete playlist failed', err);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <ListMusic size={20} />
        <span>Your Library</span>
      </div>

      <div className="sidebar-section">
        <div
          className={`sidebar-item all-songs ${!activePlaylist ? 'active' : ''}`}
          onClick={onClearPlaylist}
        >
          <span>🎵 All Songs</span>
          <ChevronRight size={14} />
        </div>
      </div>

      <div className="sidebar-playlists">
        <div className="sidebar-label">Playlists</div>
        {playlists.length === 0 && (
          <p className="sidebar-empty">No playlists yet</p>
        )}
        {playlists.map((pl) => (
          <div
            key={pl._id}
            className={`sidebar-item ${activePlaylist?._id === pl._id ? 'active' : ''}`}
            onClick={() => onSelectPlaylist(pl)}
          >
            <span className="pl-name" title={pl.name}>📋 {pl.name}</span>
            <div className="pl-actions">
              <span className="pl-count">{pl.songs.length}</span>
              <button
                id={`delete-pl-${pl._id}`}
                className="delete-pl-btn"
                onClick={(e) => handleDelete(e, pl._id)}
                title="Delete playlist"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-create">
        {creating ? (
          <form onSubmit={handleCreate} className="create-form">
            <input
              id="new-playlist-input"
              autoFocus
              type="text"
              placeholder="Playlist name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="create-actions">
              <button type="submit" className="btn-create">Create</button>
              <button type="button" className="btn-cancel" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button
            id="new-playlist-btn"
            className="new-playlist-btn"
            onClick={() => setCreating(true)}
          >
            <PlusCircle size={16} />
            New Playlist
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
