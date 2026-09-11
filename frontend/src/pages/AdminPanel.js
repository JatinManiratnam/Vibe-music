import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import { useGlobalPlayer } from '../context/PlayerContext';
import api from '../api/axios';
import { getCoverSrc } from '../utils/cover';
import {
  Users, Music2, UserCheck, Trash2, ShieldCheck,
  LogOut, LayoutDashboard, RefreshCw, ChevronDown,
  ListMusic, Search, Play, Plus, Minus
} from 'lucide-react';
import '../styles/AdminPanel.css';

/* ── Stat card ─────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="ap-stat-card">
    <div className="ap-stat-icon" style={{ color }}>
      <Icon size={22} />
    </div>
    <div className="ap-stat-body">
      <span className="ap-stat-value">{value ?? '—'}</span>
      <span className="ap-stat-label">{label}</span>
    </div>
  </div>
);

/* ── Role badge ─────────────────────────────────── */
const RoleBadge = ({ role }) => (
  <span className={`ap-role-badge ap-role-${role}`}>{role}</span>
);

/* ── AdminPanel ─────────────────────────────────── */
const AdminPanel = () => {
  const { user, logout } = useAuth();
  const { player, setQueue, setPlaySource } = useGlobalPlayer();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  
  const [roleUpdating, setRoleUpdating] = useState(null);
  const [songDeleting, setSongDeleting] = useState(null);
  
  // Playlist Management State
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [allLibrarySongs, setAllLibrarySongs] = useState([]);  // full library for the picker
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState(new Set()); // multi-select state
  const [isAddingSelected, setIsAddingSelected] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showMsg = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  /* ── Fetchers ───────────────────────────────── */
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (e) {
      showMsg('error', 'Failed to load stats');
    } finally { setLoadingStats(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (e) {
      showMsg('error', 'Failed to load users');
    } finally { setLoadingUsers(false); }
  }, []);

  const fetchSongs = useCallback(async () => {
    setLoadingSongs(true);
    try {
      const { data } = await api.get('/admin/songs');
      setSongs(data);
    } catch (e) {
      showMsg('error', 'Failed to load songs');
    } finally { setLoadingSongs(false); }
  }, []);

  const fetchPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const { data } = await api.get('/playlists');
      // Admin sees all public and their own playlists, filter just to curated public
      setPlaylists(data.filter(p => p.isPublic));
      
      setSelectedPlaylist(prev => {
        if (!prev) return prev;
        const updated = data.find(p => p._id === prev._id);
        return updated || prev;
      });
    } catch (e) {
      showMsg('error', 'Failed to load playlists');
    } finally { setLoadingPlaylists(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'songs') fetchSongs();
    if (activeTab === 'playlists') fetchPlaylists();
  }, [activeTab, fetchUsers, fetchSongs, fetchPlaylists]);

  // Debounced filtering still uses the query string, but we load the full library once
  // when entering the playlists tab — search only filters the visible list client-side.
  useEffect(() => {
    if (activeTab === 'playlists' && allLibrarySongs.length === 0) {
      const loadLibrary = async () => {
        setLoadingLibrary(true);
        try {
          const { data } = await api.get('/songs');
          setAllLibrarySongs(data);
        } catch (err) {
          console.error('[AdminPanel] Failed to load song library:', err);
        } finally {
          setLoadingLibrary(false);
        }
      };
      loadLibrary();
    }
  }, [activeTab, allLibrarySongs.length]);

  // Derived: filtered view of the library based on the search query (client-side, no debounce needed)
  // Uses a debounce anyway to avoid lag on fast typing.
  const [filteredLibrary, setFilteredLibrary] = useState([]);
  useEffect(() => {
    const q = songSearchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredLibrary(allLibrarySongs);
      return;
    }
    const delay = setTimeout(() => {
      setFilteredLibrary(
        allLibrarySongs.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album || '').toLowerCase().includes(q) ||
          (s.genre || '').toLowerCase().includes(q)
        )
      );
    }, 300);
    return () => clearTimeout(delay);
  }, [songSearchQuery, allLibrarySongs]);

  /* ── Actions ────────────────────────────────── */
  const handleRoleChange = async (userId, newRole) => {
    setRoleUpdating(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      fetchStats();
      showMsg('success', `Role updated to ${newRole}`);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to update role');
    } finally { setRoleUpdating(null); }
  };

  const handleDeleteSong = async (songId) => {
    if (!window.confirm('Delete this song? This cannot be undone.')) return;
    setSongDeleting(songId);
    try {
      await api.delete(`/admin/songs/${songId}`);
      setSongs((prev) => prev.filter((s) => s._id !== songId));
      fetchStats();
      showMsg('success', 'Song deleted');
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to delete song');
    } finally { setSongDeleting(null); }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      await api.post('/playlists', { name: newPlaylistName.trim(), isPublic: true });
      setNewPlaylistName('');
      fetchPlaylists();
      showMsg('success', 'Playlist created');
    } catch (e) {
      showMsg('error', 'Failed to create playlist');
    }
  };

  const handleDeletePlaylist = async (id) => {
    if (!window.confirm('Delete this curated playlist?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      if (selectedPlaylist?._id === id) setSelectedPlaylist(null);
      fetchPlaylists();
      showMsg('success', 'Playlist deleted');
    } catch (e) {
      showMsg('error', 'Failed to delete playlist');
    }
  };

  // Add all currently selected songs to the playlist sequentially.
  // The backend already prevents duplicates (400) — we skip those silently.
  const handleAddSelected = async () => {
    if (!selectedPlaylist || selectedSongIds.size === 0) return;
    setIsAddingSelected(true);
    let added = 0;
    let skipped = 0;
    for (const songId of selectedSongIds) {
      try {
        await api.put(`/playlists/${selectedPlaylist._id}/songs`, { songId });
        added++;
      } catch (e) {
        if (e.response?.status === 400) {
          skipped++; // already in playlist — not an error
        } else {
          console.error('[AdminPanel] Failed to add song', songId, e.message);
        }
      }
    }
    await fetchPlaylists();
    setSelectedSongIds(new Set()); // clear selection
    setIsAddingSelected(false);
    if (added > 0 || skipped > 0) {
      showMsg('success', `Added ${added} song${added !== 1 ? 's' : ''}${skipped ? ` (${skipped} already in playlist)` : ''}`);
    }
  };

  const toggleSelectSong = (songId) => {
    setSelectedSongIds(prev => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSongIds.size === filteredLibrary.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(filteredLibrary.map(s => s._id)));
    }
  };

  const handleRemoveSongFromPlaylist = async (songId) => {
    if (!selectedPlaylist) return;
    try {
      await api.delete(`/playlists/${selectedPlaylist._id}/songs/${songId}`);
      fetchPlaylists();
      showMsg('success', 'Song removed');
    } catch (e) {
      showMsg('error', 'Failed to remove song');
    }
  };

  // Admin preview always requests standard quality — never FLAC.
  // We explicitly call changeQuality('standard') before each play so that
  // if the listener had switched to FLAC, the admin context switches back.
  // The listener can switch quality again at any time from MusicPlayer controls.
  const playSongAdmin = (song, queue) => {
    const index = queue.findIndex(s => s._id === song._id);
    if (index !== -1) {
      setQueue(queue);
      setPlaySource(() => () => 'direct');
      // Enforce standard quality for admin preview
      if (player.preferredQuality !== 'standard') {
        player.changeQuality('standard');
      }
      player.playSong(index);
    }
  };

  /* ── Render ─────────────────────────────────── */
  return (
    <div className="ap-layout">
      {/* Sidebar */}
      <aside className="ap-sidebar">
        <div className="ap-sidebar-brand">
          <ShieldCheck size={20} />
          <span>Admin</span>
        </div>
        <nav className="ap-nav">
          {[
            { id: 'overview',  icon: LayoutDashboard, label: 'Overview' },
            { id: 'users',     icon: Users,           label: 'Users' },
            { id: 'songs',     icon: Music2,          label: 'Songs' },
            { id: 'playlists', icon: ListMusic,       label: 'Playlists' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`ap-nav-item ${activeTab === id ? 'ap-nav-active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="ap-sidebar-footer">
          <button className="ap-nav-item ap-nav-logout" onClick={logout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ap-main">
        {/* Header */}
        <div className="ap-header">
          <div>
            <h1 className="ap-title">Admin Panel</h1>
            <p className="ap-subtitle">Signed in as <strong>{user?.name}</strong> · {user?.email}</p>
          </div>
          <button className="ap-refresh-btn" onClick={() => { fetchStats(); if (activeTab === 'users') fetchUsers(); if (activeTab === 'songs') fetchSongs(); }}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {/* Global messages */}
        {success && <div className="ap-msg ap-msg-success">{success}</div>}
        {error   && <div className="ap-msg ap-msg-error">{error}</div>}

        {/* ── Overview Tab ─────────────────────── */}
        {activeTab === 'overview' && (
          <div className="ap-section">
            <h2 className="ap-section-title">Overview</h2>
            {loadingStats ? (
              <div className="ap-loading"><div className="spinner" /></div>
            ) : (
              <div className="ap-stats-grid">
                <StatCard icon={Users}     label="Total Users"        value={stats?.totalUsers}        color="#4F7942" />
                <StatCard icon={UserCheck} label="Contributors"        value={stats?.totalContributors} color="#3b82f6" />
                <StatCard icon={Music2}    label="Total Songs"         value={stats?.totalSongs}        color="#f59e0b" />
              </div>
            )}
          </div>
        )}

        {/* ── Users Tab ────────────────────────── */}
        {activeTab === 'users' && (
          <div className="ap-section">
            <h2 className="ap-section-title">User Management</h2>
            <p className="ap-section-desc">Promote listeners to contributors or revoke contributor access.</p>
            {loadingUsers ? (
              <div className="ap-loading"><div className="spinner" /></div>
            ) : (
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className={u._id === user?._id ? 'ap-row-self' : ''}>
                        <td>{u.name}</td>
                        <td className="ap-email">{u.email}</td>
                        <td><RoleBadge role={u.role} /></td>
                        <td className="ap-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          {u._id === user?._id || u.role === 'admin' ? (
                            <span className="ap-no-action">—</span>
                          ) : (
                            <div className="ap-role-select-wrap">
                              <select
                                className="ap-role-select"
                                value={u.role}
                                disabled={roleUpdating === u._id}
                                onChange={(e) => handleRoleChange(u._id, e.target.value)}
                              >
                                <option value="listener">listener</option>
                                <option value="contributor">contributor</option>
                              </select>
                              <ChevronDown size={12} className="ap-select-arrow" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Songs Tab ────────────────────────── */}
        {activeTab === 'songs' && (
          <div className="ap-section">
            <h2 className="ap-section-title">Music Management</h2>
            <p className="ap-section-desc">View and remove any song in the catalogue.</p>
            {loadingSongs ? (
              <div className="ap-loading"><div className="spinner" /></div>
            ) : (
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Artist</th>
                      <th>Uploaded By</th>
                      <th>Added</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((s) => (
                      <tr key={s._id}>
                        <td>{s.title}</td>
                        <td>{s.artist}</td>
                        <td className="ap-email">
                          {s.addedBy ? `${s.addedBy.name} (${s.addedBy.role})` : '—'}
                        </td>
                        <td className="ap-date">{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="ap-delete-btn"
                            onClick={() => handleDeleteSong(s._id)}
                            disabled={songDeleting === s._id}
                            title="Delete song"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Playlists Tab ─────────────────────── */}
        {activeTab === 'playlists' && (
          <div className="ap-section" style={{ display: 'flex', gap: '20px', minHeight: '600px' }}>

            {/* Left column — playlist list + create form */}
            <div style={{ flex: '1', minWidth: '220px', background: '#1c1c1e', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>Curated Playlists</h3>
              <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New playlist name"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #333', background: '#2c2c2e', color: '#fff', fontSize: '13px' }}
                />
                <button type="submit" style={{ padding: '8px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Create</button>
              </form>

              {loadingPlaylists ? <div className="spinner" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                  {playlists.length === 0 && <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>No curated playlists yet.</p>}
                  {playlists.map(pl => (
                    <div
                      key={pl._id}
                      onClick={() => { setSelectedPlaylist(pl); setSelectedSongIds(new Set()); setSongSearchQuery(''); }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: selectedPlaylist?._id === pl._id ? '#3a3a3c' : '#2c2c2e',
                        border: `1px solid ${selectedPlaylist?._id === pl._id ? '#3b82f6' : '#333'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{pl.name}</div>
                        <div style={{ color: '#666', fontSize: '11px' }}>{pl.songs.length} songs</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(pl._id); }}
                        title="Delete playlist"
                        style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px', lineHeight: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column — song library picker + current songs */}
            <div style={{ flex: '3', background: '#1c1c1e', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
              {!selectedPlaylist ? (
                <div style={{ color: '#555', textAlign: 'center', marginTop: '120px', fontSize: '14px' }}>← Select a playlist to manage its songs</div>
              ) : (
                <>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#fff' }}>{selectedPlaylist.name}</h3>
                      <p style={{ margin: '2px 0 0', color: '#888', fontSize: '12px' }}>{selectedPlaylist.songs.length} songs in playlist</p>
                    </div>
                    {selectedSongIds.size > 0 && (
                      <button
                        id="add-selected-btn"
                        onClick={handleAddSelected}
                        disabled={isAddingSelected}
                        style={{ padding: '8px 16px', background: '#1db954', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={14} />
                        {isAddingSelected ? 'Adding…' : `Add Selected (${selectedSongIds.size})`}
                      </button>
                    )}
                  </div>

                  {/* Two-pane layout: library picker | current playlist contents */}
                  <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                    {/* Library picker */}
                    <div style={{ flex: '3', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                      {/* Search bar */}
                      <div style={{ position: 'relative' }}>
                        <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none' }} />
                        <input
                          type="text"
                          placeholder="Filter songs…"
                          value={songSearchQuery}
                          onChange={(e) => setSongSearchQuery(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '6px', border: '1px solid #333', background: '#2c2c2e', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Select-all row */}
                      {filteredLibrary.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                          <input
                            id="select-all-songs"
                            type="checkbox"
                            checked={filteredLibrary.length > 0 && selectedSongIds.size === filteredLibrary.length}
                            onChange={toggleSelectAll}
                            style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#3b82f6' }}
                          />
                          <label htmlFor="select-all-songs" style={{ color: '#aaa', fontSize: '12px', cursor: 'pointer' }}>
                            {selectedSongIds.size === filteredLibrary.length ? 'Deselect all' : `Select all (${filteredLibrary.length})`}
                          </label>
                        </div>
                      )}

                      {/* Song list */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {loadingLibrary ? (
                          <div className="ap-loading"><div className="spinner" /></div>
                        ) : filteredLibrary.length === 0 ? (
                          <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
                            {songSearchQuery ? 'No songs match your filter.' : 'No songs in the library yet.'}
                          </p>
                        ) : (
                          filteredLibrary.map(song => {
                            const inPlaylist = selectedPlaylist.songs.some(s => (s._id || s) === song._id);
                            const isSelected = selectedSongIds.has(song._id);
                            const isNowPlaying = player.currentSong?._id === song._id;
                            return (
                              <div
                                key={song._id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '6px 8px',
                                  borderRadius: '5px',
                                  background: isSelected ? '#1e3a5f' : 'transparent',
                                  border: `1px solid ${isSelected ? '#3b82f6' : 'transparent'}`,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s',
                                }}
                                onClick={() => !inPlaylist && toggleSelectSong(song._id)}
                              >
                                {/* Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={inPlaylist}
                                  onChange={() => !inPlaylist && toggleSelectSong(song._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: '14px', height: '14px', cursor: inPlaylist ? 'default' : 'pointer', accentColor: '#3b82f6', flexShrink: 0 }}
                                />
                                {/* Cover thumbnail */}
                                <img
                                  src={getCoverSrc(song)}
                                  alt=""
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                  style={{ width: '32px', height: '32px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
                                />
                                {/* Title + artist */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: isNowPlaying ? '#1db954' : '#e5e5e5', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {song.title}
                                  </div>
                                  <div style={{ color: '#777', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                                </div>
                                {/* Already-in-playlist badge */}
                                {inPlaylist && (
                                  <span style={{ fontSize: '10px', color: '#1db954', background: '#0d2d18', padding: '2px 6px', borderRadius: '10px', flexShrink: 0, whiteSpace: 'nowrap' }}>In playlist</span>
                                )}
                                {/* Play preview */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); playSongAdmin(song, filteredLibrary); }}
                                  title="Preview"
                                  style={{ background: 'transparent', border: 'none', color: isNowPlaying ? '#1db954' : '#555', cursor: 'pointer', padding: '4px', lineHeight: 0, flexShrink: 0 }}
                                >
                                  <Play size={16} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Current playlist contents */}
                    <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                      <h4 style={{ margin: 0, color: '#aaa', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Playlist</h4>
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {selectedPlaylist.songs.length === 0 ? (
                          <p style={{ color: '#555', fontSize: '13px', marginTop: '20px', textAlign: 'center' }}>No songs yet.<br />Select from the library and click Add Selected.</p>
                        ) : (
                          selectedPlaylist.songs.map((song, idx) => {
                            const isNowPlaying = player.currentSong?._id === (song._id || song);
                            return (
                              <div
                                key={song._id || song}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '5px', background: isNowPlaying ? '#0d2d18' : '#252527' }}
                              >
                                <span style={{ color: '#555', fontSize: '11px', minWidth: '18px' }}>{idx + 1}</span>
                                <img
                                  src={getCoverSrc(song)}
                                  alt=""
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                  style={{ width: '28px', height: '28px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: isNowPlaying ? '#1db954' : '#e5e5e5', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title || '…'}</div>
                                  <div style={{ color: '#666', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist || ''}</div>
                                </div>
                                <button
                                  onClick={() => playSongAdmin(song, selectedPlaylist.songs)}
                                  title="Preview"
                                  style={{ background: 'transparent', border: 'none', color: isNowPlaying ? '#1db954' : '#444', cursor: 'pointer', padding: '2px', lineHeight: 0, flexShrink: 0 }}
                                >
                                  <Play size={13} />
                                </button>
                                <button
                                  onClick={() => handleRemoveSongFromPlaylist(song._id || song)}
                                  title="Remove from playlist"
                                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '2px', lineHeight: 0, flexShrink: 0 }}
                                >
                                  <Minus size={13} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
