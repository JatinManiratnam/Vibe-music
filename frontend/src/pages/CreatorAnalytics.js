import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getCoverSrc } from '../utils/cover';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Music2, BarChart2, ListMusic, LogOut, LayoutDashboard,
  Play, Heart, TrendingUp, ChevronDown
} from 'lucide-react';
import '../styles/ContributorDashboard.css';

/* ── Lightweight area chart ──────────────────────────────────── */
const PlayChart = ({ data, gradientId = 'cpDefault', height = 280 }) => (
  <div style={{ width: '100%', height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#1db954" stopOpacity={0.75} />
            <stop offset="95%" stopColor="#1db954" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          stroke="#888"
          tick={{ fill: '#888', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          stroke="#888"
          tick={{ fill: '#888', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#2c2c35', border: 'none', borderRadius: '8px', color: '#fff' }}
          itemStyle={{ color: '#1db954' }}
        />
        <Area
          type="monotone"
          dataKey="plays"
          stroke="#1db954"
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

/* ── Stat badge ──────────────────────────────────────────────── */
const MetaBadge = ({ icon: Icon, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '6px 14px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 700, color }}>
    <Icon size={14} />
    <span>{value}</span>
  </div>
);

/* ── Build zero-filled 30-day array from backend playsOverTime ── */
function fill30Days(playsOverTime = []) {
  const map = {};
  playsOverTime.forEach(p => { map[p.date] = p.plays; });
  const result = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    result.push({
      date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      plays: map[iso] || 0,
    });
  }
  return result;
}

/* ── Build zero-filled 30-day array from per-song dailyPlays ── */
function formatSongDailyPlays(dailyPlays = []) {
  // backend already zero-fills; just reformat dates for display
  return dailyPlays.map(p => ({
    date: new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    plays: p.plays,
  }));
}

/* ═══════════════════════════════════════════════════════════════ */
const CreatorAnalytics = () => {
  const { logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/songs/analytics');
      setAnalytics(data);
      // Auto-select top song if available
      if (data.songs && data.songs.length > 0) {
        setSelectedSongId(data.songs[0]._id);
      }
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const overallChartData = useMemo(
    () => fill30Days(analytics?.playsOverTime),
    [analytics]
  );

  const selectedSong = useMemo(
    () => (analytics?.songs || []).find(s => s._id === selectedSongId) || null,
    [analytics, selectedSongId]
  );

  const selectedChartData = useMemo(
    () => selectedSong ? formatSongDailyPlays(selectedSong.dailyPlays) : [],
    [selectedSong]
  );

  /* ── Sidebar ─────────────────────────────────────────────── */
  const sidebar = (
    <aside className="dash-sidebar">
      <div className="dash-sidebar-brand">
        <Music2 size={20} />
        <span>Vibe Music</span>
      </div>
      <nav className="dash-nav">
        <Link className="dash-nav-item" to="/dashboard">
          <LayoutDashboard size={16} /><span>Dashboard</span>
        </Link>
        <Link className="dash-nav-item" to="/dashboard/my-songs">
          <ListMusic size={16} /><span>My Songs</span>
        </Link>
        <a className="dash-nav-item dash-nav-active" href="/dashboard/analytics">
          <BarChart2 size={16} /><span>Analytics</span>
        </a>
      </nav>
      <button className="dash-nav-logout" onClick={logout}>
        <LogOut size={16} /><span>Sign Out</span>
      </button>
    </aside>
  );

  /* ── Loading / Error ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="dash-layout">
        {sidebar}
        <main className="dash-main">
          <div className="dash-header">
            <div><h1 className="dash-title">Analytics</h1></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888' }}>
            Loading analytics…
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-layout">
        {sidebar}
        <main className="dash-main">
          <div className="dash-header">
            <div><h1 className="dash-title">Analytics</h1></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888', gap: '1rem' }}>
            <p>Unable to load analytics.</p>
            <button className="dash-btn dash-btn-outline" onClick={fetchData}>Retry</button>
          </div>
        </main>
      </div>
    );
  }

  const hasSongs = analytics.totalSongs > 0;
  const hasSongList = (analytics.songs || []).length > 0;

  const sectionCard = (icon, title, children) => (
    <div className="dash-placeholder-section">
      <div className="dash-placeholder-header" style={{ justifyContent: 'flex-start' }}>
        {icon}
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{title}</h3>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="dash-layout">
      {sidebar}

      <main className="dash-main">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Analytics</h1>
            <p className="dash-subtitle">30-day performance overview for your music.</p>
          </div>
        </div>

        {/* Empty state */}
        {!hasSongs && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#888' }}>
            <Music2 size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p>Upload your first song to start tracking performance.</p>
          </div>
        )}

        {hasSongs && (
          <>
            {/* ── A. Overview stats ───────────────────────── */}
            <div className="dash-stats-grid">
              <div className="dash-stat-card">
                <div className="dash-stat-icon"><Music2 size={22} /></div>
                <div className="dash-stat-body">
                  <span className="dash-stat-value">{analytics.totalSongs}</span>
                  <span className="dash-stat-label">Total Songs</span>
                </div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-icon"><Play size={22} /></div>
                <div className="dash-stat-body">
                  <span className="dash-stat-value">{analytics.totalPlays}</span>
                  <span className="dash-stat-label">Total Plays</span>
                </div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-icon"><Heart size={22} /></div>
                <div className="dash-stat-body">
                  <span className="dash-stat-value">{analytics.totalLikes}</span>
                  <span className="dash-stat-label">Total Likes</span>
                </div>
              </div>
            </div>

            <div className="dash-sections">
              {/* ── B. Overall 30-day chart ──────────────── */}
              {sectionCard(
                <BarChart2 size={17} />,
                'Overall Plays — Last 30 Days',
                analytics.totalPlays === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#888', fontSize: '0.9rem' }}>
                    Performance data will appear as listeners play your music.
                  </div>
                ) : (
                  <PlayChart data={overallChartData} gradientId="cpOverall" height={260} />
                )
              )}

              {/* ── C. Song Performance list ─────────────── */}
              {sectionCard(
                <TrendingUp size={17} />,
                'Song Performance',
                hasSongList ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '0 0.5rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <span>Song</span>
                      <span style={{ textAlign: 'center' }}>Plays</span>
                      <span style={{ textAlign: 'center' }}>Likes</span>
                    </div>
                    {(analytics.songs || []).map(song => (
                      <div
                        key={song._id}
                        onClick={() => setSelectedSongId(song._id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 80px',
                          alignItems: 'center',
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedSongId === song._id ? 'rgba(29,185,84,0.08)' : 'transparent',
                          border: selectedSongId === song._id ? '1px solid rgba(29,185,84,0.25)' : '1px solid transparent',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <img
                            src={getCoverSrc(song)}
                            alt={song.title}
                            style={{ width: '38px', height: '38px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#888' }}>{song.artist}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 700, color: '#1db954', fontSize: '0.95rem' }}>{song.totalPlays}</div>
                        <div style={{ textAlign: 'center', fontWeight: 700, color: '#ec4899', fontSize: '0.95rem' }}>{song.totalLikes}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No songs uploaded yet.</p>
                )
              )}

              {/* ── D. Individual Song Graph ─────────────── */}
              {hasSongList && sectionCard(
                <BarChart2 size={17} />,
                'Individual Song Analytics',
                <div>
                  {/* Song selector */}
                  <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '340px' }}>
                    <select
                      id="song-selector"
                      value={selectedSongId}
                      onChange={e => setSelectedSongId(e.target.value)}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        padding: '10px 40px 10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {(analytics.songs || []).map(s => (
                        <option key={s._id} value={s._id} style={{ background: '#2c2c35' }}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }}
                    />
                  </div>

                  {selectedSong ? (
                    <>
                      {/* Selected song info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <img
                          src={getCoverSrc(selectedSong)}
                          alt={selectedSong.title}
                          style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedSong.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>{selectedSong.artist}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                          <MetaBadge icon={Play}  value={`${selectedSong.totalPlays} plays`} color="#1db954" />
                          <MetaBadge icon={Heart} value={`${selectedSong.totalLikes} likes`} color="#ec4899" />
                        </div>
                      </div>

                      {/* Chart label */}
                      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Plays — Last 30 Days
                      </p>

                      {selectedSong.totalPlays === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#888', fontSize: '0.9rem' }}>
                          Performance data will appear as listeners play this song.
                        </div>
                      ) : (
                        <PlayChart data={selectedChartData} gradientId="cpSong" height={240} />
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#888' }}>Select a song above to see its analytics.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default CreatorAnalytics;
