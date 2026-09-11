import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Users, Music2, UserCheck, Trash2, ShieldCheck,
  LogOut, LayoutDashboard, RefreshCw, ChevronDown,
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
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(null); // userId being updated
  const [songDeleting, setSongDeleting] = useState(null); // songId being deleted
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

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'songs') fetchSongs();
  }, [activeTab, fetchUsers, fetchSongs]);

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
            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
            { id: 'users',    icon: Users,           label: 'Users' },
            { id: 'songs',    icon: Music2,           label: 'Songs' },
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
      </main>
    </div>
  );
};

export default AdminPanel;
