import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import UploadSongModal from '../components/UploadSongModal';
import { getCoverSrc } from '../utils/cover';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  UploadCloud,
  Music2,
  BarChart2,
  Users,
  Heart,
  Play,
  ListMusic,
  TrendingUp,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import '../styles/ContributorDashboard.css';

/* ── Stat card ──────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="dash-stat-card">
    <div className="dash-stat-icon" style={{ '--icon-color': color }}>
      <Icon size={22} />
    </div>
    <div className="dash-stat-body">
      <span className="dash-stat-value">{value}</span>
      <span className="dash-stat-label">{label}</span>
    </div>
  </div>
);

/* ── Dashboard ───────────────────────────────────────────────── */
const ContributorDashboard = () => {
  const { user, logout } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalSongs: 0,
    totalPlays: 0,
    totalLikes: 0,
    totalListeners: 0,
    topSongs: [],
    recentSongs: [],
    playsOverTime: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const analyticsRes = await api.get('/songs/analytics');
      setAnalytics(analyticsRes.data);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = [
    { icon: Music2,   label: 'Total Songs',     value: loading ? '...' : analytics.totalSongs, color: '#4F7942' },
    { icon: Play,     label: 'Total Plays',      value: loading ? '...' : analytics.totalPlays, color: '#3b82f6' },
    { icon: Heart,    label: 'Total Likes',      value: loading ? '...' : analytics.totalLikes, color: '#ec4899' },
    { icon: Users,    label: 'Unique Listeners', value: loading ? '...' : analytics.totalListeners, color: '#f59e0b' },
  ];

  const getChartData = () => {
    if (!analytics.playsOverTime) return [];
    
    const chartData = [];
    const today = new Date();
    const playMap = {};
    
    analytics.playsOverTime.forEach(p => {
      playMap[p.date] = p.plays;
    });

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      chartData.push({
        date: displayDate,
        fullDate: dateString,
        plays: playMap[dateString] || 0
      });
    }
    return chartData;
  };

  const chartData = getChartData();

  return (
    <div className="dash-layout">
      {/* ── Sidebar ───────────────────────────── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">
          <Music2 size={20} />
          <span>Vibe Music</span>
        </div>

        <nav className="dash-nav">
          <a className="dash-nav-item dash-nav-active" href="/dashboard">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </a>
          <Link className="dash-nav-item" to="/dashboard/my-songs">
            <ListMusic size={16} />
            <span>My Songs</span>
          </Link>
          <Link className="dash-nav-item" to="/dashboard/analytics">
            <BarChart2 size={16} />
            <span>Analytics</span>
          </Link>
        </nav>

        <button className="dash-nav-logout" onClick={logout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* ── Main content ──────────────────────── */}
      <main className="dash-main">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Creator Dashboard</h1>
            <p className="dash-subtitle">
              Track your music performance.
            </p>
          </div>
          <div className="dash-header-actions">
            <Link to="/dashboard/my-songs" className="dash-btn dash-btn-outline">
              <ListMusic size={16} />
              My Songs
            </Link>
            <button
              className="dash-btn dash-btn-primary"
              onClick={() => setUploadModalOpen(true)}
              id="dashboard-upload-btn"
            >
              <UploadCloud size={16} />
              Upload Music
            </button>
          </div>
        </div>

        {/* Welcome strip */}
        <div className="dash-welcome">
          <span>👋</span>
          <span>Welcome back, <strong>{user?.name}</strong>!</span>
        </div>

        {analytics.totalSongs === 0 && !loading && !error && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
            <UploadCloud size={48} style={{ color: '#888', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0' }}>No music yet</h3>
            <p style={{ color: '#aaa', margin: '0 0 1.5rem 0' }}>Upload your first song to start tracking performance.</p>
            <button className="dash-btn dash-btn-primary" onClick={() => setUploadModalOpen(true)}>
              Upload Music
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="dash-stats-grid">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Sections */}
        <div className="dash-sections">
          <div className="dash-placeholder-section" style={{ padding: '1.5rem', textAlign: 'left', gridColumn: '1 / -1' }}>
            <div className="dash-placeholder-header" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
              <BarChart2 size={18} />
              <h3 style={{ margin: 0 }}>Performance (Last 7 Days)</h3>
            </div>
            <div className="dash-placeholder-body" style={{ alignItems: 'stretch' }}>
              {loading ? (
                <p>Loading analytics...</p>
              ) : error ? (
                <p>Unable to load data.</p>
              ) : analytics.totalPlays === 0 ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#888' }}>Performance data will appear as listeners play your music.</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1db954" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#1db954" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#2c2c35', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#1db954' }}
                      />
                      <Area type="monotone" dataKey="plays" stroke="#1db954" strokeWidth={2} fillOpacity={1} fill="url(#colorPlays)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
          
          <div className="dash-placeholder-section" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <div className="dash-placeholder-header" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
              <TrendingUp size={18} />
              <h3 style={{ margin: 0 }}>Top Songs</h3>
            </div>
            <div className="dash-placeholder-body" style={{ alignItems: 'stretch' }}>
              {loading ? (
                <p>Loading...</p>
              ) : error ? (
                <p>Error</p>
              ) : analytics.topSongs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>No plays yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {analytics.topSongs.map(song => (
                    <div key={song._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <img src={getCoverSrc(song)} alt={song.title} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#b3b3b3' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Play size={12}/> {song.playCount}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Heart size={12}/> {song.likeCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dash-placeholder-section" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <div className="dash-placeholder-header" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
              <Music2 size={18} />
              <h3 style={{ margin: 0 }}>Recent Uploads</h3>
            </div>
            <div className="dash-placeholder-body" style={{ alignItems: 'stretch' }}>
              {loading ? (
                <p>Loading...</p>
              ) : error ? (
                <p>Error</p>
              ) : analytics.recentSongs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>No uploads.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {analytics.recentSongs.map((song) => (
                    <div key={song._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <img src={getCoverSrc(song)} alt={song.title} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#b3b3b3' }}>{new Date(song.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <UploadSongModal
          onClose={() => setUploadModalOpen(false)}
          onUploaded={() => {
            setUploadModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default ContributorDashboard;
