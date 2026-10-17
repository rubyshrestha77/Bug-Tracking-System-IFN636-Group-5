import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#413434] text-white p-4 flex justify-between items-center">
      {/* <Link to="/" className="text-2xl font-bold ">BugTrax</Link> */}
      <Link to="/"><img src="/logo.png" alt="BugTrax" className="h-10" /></Link>
      <div>
        {user ? (
          <div className="flex items-center">
            <Link to="/bugs" className="mr-4">Home</Link>
            {user.role === 'reporter' && <Link to="/bugs/new" className="mr-4">Add Bug</Link>}
            {user.role === 'admin' && <Link to="/admin/users" className="mr-4">Users</Link>}
            {user.role === 'admin' && <Link to="/admin/activity-log" className="mr-4">Activity Log</Link>}
            {user.role !== 'admin' && <NotificationBell />}
            <Link to="/profile" className="mr-4">
              <span className="text-sm">
                {user.name} ({user.role})
              </span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="bg-[#F59457] px-4 py-2 rounded hover:bg-[#b57248]"
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" className="mr-4 bg-[#F59457] px-4 py-2 rounded hover:bg-[#b57248]">Login</Link>
            <Link
              to="/register"
              className="bg-[#F59457] px-4 py-2 rounded hover:bg-[#b57248]"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
