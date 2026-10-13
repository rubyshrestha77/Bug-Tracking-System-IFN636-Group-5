import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import NewBug from './pages/NewBug';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import ProtectedRoute from './components/ProtectedRoutes';

function App() {
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
