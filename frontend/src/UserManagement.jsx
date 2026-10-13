import { useEffect, useState } from 'react';

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/users', { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load users');
        setUsers(data);
      } catch (e) { 
        setError(e.message); 
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  const toggle = async (u) => {
    const next = !u.isActive;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${u.name}?`)) return;
    setError('');
    
    try {
      const res = await fetch(`/api/users/${u._id}/status`, {
        method: 'PATCH', 
        headers: headers(), 
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      
      setUsers((list) => list.map((x) => (x._id === u._id ? data : x)));
    } catch (e) {
      setError('An error occurred while updating status.');
    }
  };

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">User Management</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <table className="w-full text-left border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-t">
              <td className="p-2">{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.isActive ? 'Active' : 'Inactive'}</td>
              <td className="p-2">
                <button 
                  onClick={() => toggle(u)} 
                  className="px-3 py-1 border rounded bg-white hover:bg-gray-50 text-sm"
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}