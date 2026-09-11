import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider, useGlobalPlayer } from './context/PlayerContext';
import MusicPlayer from './components/MusicPlayer';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import ContributorDashboard from './pages/ContributorDashboard';
import CreatorAnalytics from './pages/CreatorAnalytics';
import MySongs from './pages/MySongs';
import ContributorRoute from './components/ContributorRoute';
import AdminPanel from './pages/AdminPanel';
import AdminRoute from './components/AdminRoute';
import './index.css';

// Global Player Wrapper — renders the player if a song is active
const GlobalMusicPlayer = () => {
  const { player } = useGlobalPlayer();
  // Don't render the player UI until a song has been selected
  if (!player.currentSong) return null;
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
      <MusicPlayer player={player} />
    </div>
  );
};

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-center"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Public route — redirect to role portal if already logged in
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-center"><div className="spinner" /></div>;
  if (!user) return children;
  const role = user.role ?? 'listener';
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'contributor') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/home" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing landing page */}
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ContributorRoute>
            <ContributorDashboard />
          </ContributorRoute>
        }
      />
      <Route
        path="/dashboard/analytics"
        element={
          <ContributorRoute>
            <CreatorAnalytics />
          </ContributorRoute>
        }
      />
      <Route
        path="/dashboard/my-songs"
        element={
          <ContributorRoute>
            <MySongs />
          </ContributorRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <AppRoutes />
          <GlobalMusicPlayer />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
