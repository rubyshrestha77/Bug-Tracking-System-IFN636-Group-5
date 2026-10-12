import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: ''  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axiosInstance.post('/api/auth/register', formData);
      alert('Registration successful. Please log in.');
      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded">
        <h1 className="text-2xl font-bold mb-4 text-center">Register</h1>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full mb-4 p-2 border rounded"
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full mb-4 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full mb-4 p-2 border rounded"
        />


        
        <div className="mb-4">
          <p className="mb-2 text-sm text-gray-700">I am a</p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="reporter"
                checked={formData.role === 'reporter'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
              Reporter
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="developer"
                checked={formData.role === 'developer'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
              Developer
            </label>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <p className=" mt-4 mb-4"> Have an account? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link></p>
        
        <button type="submit" className="w-full bg-[#F59457] text-white p-2 rounded">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;
