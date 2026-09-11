import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ContributorRoute — allows only contributors.
 *
 * Not logged in  → /login
 * contributor    → render children
 * admin          → /admin  (admin has their own portal)
 * listener       → /home
 */
const ContributorRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="full-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role ?? 'listener';
  if (role === 'contributor') return children;
  if (role === 'admin') return <Navigate to="/admin" replace />;

  // listener or unknown — back to listener home
  return <Navigate to="/home" replace />;
};

export default ContributorRoute;
