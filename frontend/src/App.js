import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import NewBug from './pages/NewBug';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import UserManagement from './pages/UserManagement';
import ProtectedRoute from './components/ProtectedRoutes';
import ActivityLog from './pages/ActivityLog';
import axiosInstance from './axiosConfig';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    if (process.env.REACT_APP_INSTANCE) {
      console.log('Instance name:', process.env.REACT_APP_INSTANCE);
      return;
    }
    axiosInstance
      .get('/health')
      .then((response) => {
        console.log('Instance name:', response.data.instance);
      })
      .catch((error) => {
        console.error('Failed to fetch instance name:', error);
      });
  }, []);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/bugs" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/bugs/new" element={<ProtectedRoute><NewBug /></ProtectedRoute>} />
        <Route path="/bugs" element={<ProtectedRoute><Bugs/></ProtectedRoute>}/>
        <Route path="/bugs/:id" element={<ProtectedRoute><BugDetail /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
        <Route path="*" element={
          <div className="text-center mt-20">
            <p className="text-gray-600 mb-4">Page not found.</p>
            <a href="/bugs" className="text-blue-600">Return</a>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
