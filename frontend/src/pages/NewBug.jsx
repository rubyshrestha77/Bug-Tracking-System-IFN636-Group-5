import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const NewBug = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stepsToReproduce: '',
    severity: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axiosInstance.post('/api/bugs', formData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      navigate('/bugs');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit bug.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded">
        <h1 className="text-2xl font-bold mb-4">Report a Bug</h1>

        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full mb-4 p-2 border rounded"
        />

        <textarea
          rows="3"
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full mb-4 p-2 border rounded"
        />

        <textarea
          rows="3"
          placeholder="Steps to Reproduce"
          value={formData.stepsToReproduce}
          onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
          className="w-full mb-4 p-2 border rounded"
        />

        <select
          value={formData.severity}
          onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
          className="w-full mb-4 p-2 border rounded"
        >
          <option value="">Select severity</option>
          <option value="Critical">Critical</option>
          <option value="Major">Major</option>
          <option value="Minor">Minor</option>
          <option value="Trivial">Trivial</option>
        </select>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button type="submit" className="w-full bg-[#F59457] text-white p-2 rounded">
          Submit Bug
        </button>
      </form>
    </div>
  );
};

export default NewBug;