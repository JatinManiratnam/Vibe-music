import { useAuth } from '../context/AuthContext';
import { Search, LogOut, Music } from 'lucide-react';
import '../styles/Navbar.css';

/**
 * Navbar — Listener portal only.
 *
 * This is the navigation bar for the /home music experience.
 * Contributor and admin portals have their own dedicated sidebar navigation
 * inside ContributorDashboard and AdminPanel respectively.
 *
 * No role-specific items appear here. Upload, Dashboard, and Admin
 * links live exclusively within their own portals.
 */
const Navbar = ({ search, setSearch }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Music size={22} />
        <span>Vibe Music</span>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          id="search-input"
          type="text"
          placeholder="Search songs, artists, albums..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="navbar-user">
        <span className="user-name">👋 {user?.name}</span>
        <button
          id="logout-btn"
          className="logout-btn"
          onClick={logout}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
