import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const ACTION_TYPES = ['ASSIGN', 'START', 'RESOLVE', 'VERIFY', 'REOPEN', 'DELETE'];
const EMPTY_FILTERS = { actor: '', actionType: '', dateFrom: '', dateTo: '' };

const ACTION_STYLES = {
  ASSIGN: 'bg-blue-100 text-blue-800',
  START: 'bg-indigo-100 text-indigo-800',
  RESOLVE: 'bg-green-100 text-green-800',
  VERIFY: 'bg-purple-100 text-purple-800',
  REOPEN: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
};

const ActionBadge = ({ type }) => (
  <span
    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
      ACTION_STYLES[type] || 'bg-gray-100 text-gray-700'
    }`}
  >
    {type}
  </span>
);

const ActivityLog = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS); 
  const [applied, setApplied] = useState(EMPTY_FILTERS); 
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ entries: [], total: 0, totalPages: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    axiosInstance
      .get('/users', { headers: { Authorization: `Bearer ${user.token}` } })
      .then((res) => setUsers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setUsers([]));
  }, [isAdmin, user]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      Object.entries(applied).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const response = await axiosInstance.get('/activity-log', {
        params,
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the activity log.');
      setData({ entries: [], total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [applied, page, isAdmin, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(filters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  if (user && user.role !== 'admin') return <Navigate to="/bugs" replace />;

  const hasFilters = Object.values(applied).some(Boolean);
  const field = 'mt-1 w-full rounded border px-2 py-1.5 text-sm';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-[#413434]">Activity Log</h1>
        <p className="text-sm text-gray-500">
          Read-only record of every bug state change · dates are filtered in UTC
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="bg-white shadow-md rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <label className="text-sm text-gray-700">
          Actor
          <select name="actor" value={filters.actor} onChange={handleChange} className={field}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Action
          <select name="actionType" value={filters.actionType} onChange={handleChange} className={field}>
            <option value="">All actions</option>
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          From
          <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleChange} className={field} />
        </label>
        <label className="text-sm text-gray-700">
          To
          <input type="date" name="dateTo" value={filters.dateTo} onChange={handleChange} className={field} />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 py-1.5 rounded bg-[#413434] text-white text-sm font-medium hover:opacity-90"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="flex-1 py-1.5 rounded border text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 flex items-start justify-between rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {loading && <div className="text-center mt-10 text-gray-600">Loading…</div>}

      {!loading && !error && data.entries.length === 0 && (
        <div className="bg-white shadow-md rounded-lg p-8 text-center text-gray-600">
          <p className="mb-2">
            {hasFilters ? 'No entries match these filters.' : 'No activity has been recorded yet.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm font-medium text-blue-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && data.entries.length > 0 && (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#413434] text-white uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Bug</th>
                  <th className="px-4 py-3">Status change</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.actor?.name || 'Unknown user'}</td>
                    <td className="px-4 py-3"><ActionBadge type={entry.actionType} /></td>
                    <td className="px-4 py-3">
                      {entry.actionType === 'DELETE' ? (
                        <span className="text-gray-600">{entry.bugTitle || '(deleted bug)'}</span>
                      ) : (
                        <Link to={`/bugs/${entry.entityId}`} className="text-blue-600 hover:underline">
                          {entry.bugTitle || entry.entityId}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.previousValue || '—'} → {entry.newValue || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
            <span>{data.total} entries</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded border font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span>Page {page} of {data.totalPages}</span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded border font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLog;