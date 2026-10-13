import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-800',
  developer: 'bg-blue-100 text-blue-800',
  reporter: 'bg-amber-100 text-amber-800',
};

const RoleBadge = ({ role }) =>
  role ? (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        ROLE_STYLES[role] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {role}
    </span>
  ) : (
    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 italic">
      No role
    </span>
  );

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-600' : 'bg-gray-500'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null); // user awaiting confirmation
  const [busyId, setBusyId] = useState(null); // user whose request is in flight

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get('/api/users', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setUsers(response.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to load users.');
      } finally {
        setLoading(false);
      }
    };
    if (user && user.role === 'admin') fetchUsers();
  }, [user]);

  // Mirrors the backend last-admin guard so the UI can explain why a button is locked.
  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === 'admin' && u.isActive !== false).length,
    [users]
  );

  const confirmToggle = async () => {
    const target = pending;
    setPending(null);
    if (!target) return;
    const next = target.isActive === false;

    setError('');
    setBusyId(target._id);
    try {
      const response = await axiosInstance.patch(
        `/api/users/${target._id}/status`,
        { isActive: next },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setUsers((list) => list.map((u) => (u._id === target._id ? response.data : u)));
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update account.');
    } finally {
      setBusyId(null);
    }
  };

  if (user && user.role !== 'admin') return <Navigate to="/bugs" replace />;
  if (loading) return <div className="text-center mt-20">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-[#413434]">User Management</h1>
        <p className="text-sm text-gray-500">
          {users.length} users · {activeAdminCount} active admin{activeAdminCount === 1 ? '' : 's'}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#413434] text-white uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const active = u.isActive !== false;
              const isSelf = u._id === user.id;
              const isLastAdmin = u.role === 'admin' && active && activeAdminCount <= 1;
              const locked = isSelf || isLastAdmin;
              const busy = busyId === u._id;

              let lockReason = '';
              if (isSelf) lockReason = 'You cannot change your own account';
              else if (isLastAdmin) lockReason = 'The last active admin cannot be deactivated';

              return (
                <tr key={u._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-500">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setPending(u)}
                      disabled={locked || busy}
                      title={lockReason}
                      className={`inline-block w-28 py-1.5 rounded text-sm font-medium text-center text-white transition ${
                        locked
                          ? 'bg-gray-300 cursor-not-allowed'
                          : busy
                          ? 'bg-gray-400 cursor-wait'
                          : active
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {busy ? 'Saving…' : active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeAdminCount <= 1 && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Reminder : admin user are added and removered internally. Please contact the system adminstrator if you need to add or remove an admin  user.
        </p>
      )}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-2">
              {pending.isActive === false ? 'Activate' : 'Deactivate'} account?
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              {pending.isActive === false
                ? `${pending.name} will be able to log in again.`
                : `${pending.name} will no longer be able to log in or use the system.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                className="w-24 py-1.5 rounded border text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                className={`w-24 py-1.5 rounded text-sm font-medium text-white ${
                  pending.isActive === false
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
