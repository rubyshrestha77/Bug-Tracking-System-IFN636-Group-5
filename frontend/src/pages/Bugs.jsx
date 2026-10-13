import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import BugList from '../components/BugList';

const Bugs = () => {
  const { user } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
  status: '', severity: '', priority: '', assignedToMe: false,
  });
  const hasActiveFilters =
  filters.status || filters.severity || filters.priority || filters.assignedToMe;

  useEffect(() => {
    const fetchBugs = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.severity) params.severity = filters.severity;
        if (filters.priority) params.priority = filters.priority;
        if (filters.assignedToMe) params.assignedToMe = 'true';

        const response = await axiosInstance.get('/api/bugs', {
          headers: { Authorization: `Bearer ${user.token}` },
          params,
        });
        setBugs(response.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to load bugs.');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchBugs();
  }, [user, filters]);

  useEffect(() => {
    const fetchBugs = async () => {
      try {
        const response = await axiosInstance.get('/api/bugs', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setBugs(response.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to load bugs.');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchBugs();
  }, [user]);

  if (loading) return <div className="text-center mt-20">Loading…</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Bugs</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="bg-white p-4 shadow-md rounded mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="p-2 border rounded text-sm"
        >
          <option value="">All statuses</option>
          <option value="New">New</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
          <option value="Reopened">Reopened</option>
        </select>

        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="p-2 border rounded text-sm"
        >
          <option value="">All severities</option>
          <option value="Critical">Critical</option>
          <option value="Major">Major</option>
          <option value="Minor">Minor</option>
          <option value="Trivial">Trivial</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="p-2 border rounded text-sm"
        >
          <option value="">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {user.role === 'developer' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.assignedToMe}
              onChange={(e) => setFilters({ ...filters, assignedToMe: e.target.checked })}
            />
            Assigned to me
          </label>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ status: '', severity: '', priority: '', assignedToMe: false })}
            className="text-sm text-blue-600 ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>
      {/* <BugList bugs={bugs} /> */}
      <BugList bugs={bugs} hasActiveFilters={hasActiveFilters} onClearFilters={() => setFilters({ status: '', severity: '', priority: '', assignedToMe: false })} />
    </div>
  );
};

export default Bugs;