import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, initialising } = useAuth();

  if (initialising) {
    return <div className="text-center mt-20">Loading…</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;