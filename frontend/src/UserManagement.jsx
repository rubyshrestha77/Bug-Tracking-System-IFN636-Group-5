import { useEffect, useState } from 'react';

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`, // match your key
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
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">User Management</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <table className="w-full text-left border">
        <thead className="bg-gray-100">
          <tr><th className="p-2">Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-t">
              <td className="p-2">{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.isActive ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}