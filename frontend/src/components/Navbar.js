import { useAuth } from '../context/AuthContext';
import { Search, LogOut, Music, UploadCloud } from 'lucide-react';
import '../styles/Navbar.css';

const Navbar = ({ search, setSearch, onUploadClick }) => {
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
          id="upload-btn"
          className="upload-nav-btn"
          onClick={onUploadClick}
          title="Upload Song"
        >
          <UploadCloud size={18} />
          <span>Upload</span>
        </button>
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
