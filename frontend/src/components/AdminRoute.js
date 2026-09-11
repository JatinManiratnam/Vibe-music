import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminRoute — allows only admins.
 *
 * Not logged in  → /login
 * admin          → render children
 * contributor    → /dashboard  (contributor has their own portal)
 * listener       → /home
 */
const AdminRoute = ({ children }) => {
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
  if (role === 'admin') return children;
  if (role === 'contributor') return <Navigate to="/dashboard" replace />;

  // listener or unknown — back to listener home
  return <Navigate to="/home" replace />;
};

export default AdminRoute;
