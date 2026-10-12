import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const statusColour = {
  'New': 'bg-gray-200 text-gray-800',
  'Assigned': 'bg-blue-200 text-blue-800',
  'In Progress': 'bg-yellow-200 text-yellow-800',
  'Resolved': 'bg-green-200 text-green-800',
  'Closed': 'bg-gray-300 text-gray-600',
  'Reopened': 'bg-orange-200 text-orange-800',
};

const formatDate = (d) =>
  new Date(d).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const BugDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bug, setBug] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState('');
  const [actionError, setActionError] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const handleAssign = async () => {
  setActionError('');
  try {
    const response = await axiosInstance.patch(
      `/api/bugs/${id}/assign`,
      { priority },
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    setBug(response.data);
  } catch (error) {
    setActionError(error.response?.data?.message || 'Failed to assign bug.');
  }
  };

  const handleStartWork = async () => {
    setActionError('');
    try {
      const response = await axiosInstance.patch(
        `/api/bugs/${id}/start`, {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setBug(response.data);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to start work.');
    }
  };

  const handleResolve = async () => {
    setActionError('');
    try {
      const response = await axiosInstance.patch(
        `/api/bugs/${id}/resolve`,
        { resolutionNote },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setBug(response.data);
      setResolutionNote('');
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to resolve bug.');
    }
  };

  const handleVerify = async () => {
    setActionError('');
    try {
      const response = await axiosInstance.patch(
        `/api/bugs/${id}/verify`, {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setBug(response.data);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to verify bug.');
    }
  };

  const handleReopen = async () => {
    setActionError('');
    try {
      const response = await axiosInstance.patch(
        `/api/bugs/${id}/reopen`,
        { reopenReason },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setBug(response.data);
      setReopenReason('');
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to reopen bug.');
    }
  };

  const handleDelete = async () => {
  if (!window.confirm('Delete this bug report? This cannot be undone.')) return;
  setActionError('');
  try {
    await axiosInstance.delete(`/api/bugs/${id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    navigate('/bugs');
  } catch (error) {
    setActionError(error.response?.data?.message || 'Failed to delete bug.');
  }
};

  useEffect(() => {
    const fetchBug = async () => {
      try {
        const response = await axiosInstance.get(`/api/bugs/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setBug(response.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to load bug.');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchBug();
  }, [id, user]);

  if (loading) return <div className="text-center mt-20">Loading…</div>;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-20 text-center">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => navigate('/bugs')} className="bg-blue-600 text-white px-4 py-2 rounded">
          Back to bug list
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate('/bugs')} className="text-m text-blue-600 font-semibold mb-4">
        ← Back to list
      </button>

      <div className="bg-white p-6 shadow-md rounded">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">{bug.title}</h1>
          <span className={`px-3 py-1 rounded text-sm font-medium ${statusColour[bug.status]}`}>
            {bug.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-6 text-gray-700">
          <p><span className="font-medium">Severity:</span> {bug.severity}</p>
          <p><span className="font-medium">Priority:</span> {bug.priority || 'Not set'}</p>
          <p><span className="font-medium">Reported by:</span> {bug.reporter?.name || 'Unknown'}</p>
          <p><span className="font-medium">Assigned to:</span> {bug.assignee?.name || 'Unassigned'}</p>
          <p><span className="font-medium">Reported:</span> {formatDate(bug.createdAt)}</p>
          <p><span className="font-medium">Last updated:</span> {formatDate(bug.updatedAt)}</p>
        </div>

        <h2 className="font-semibold mb-1">Description</h2>
        <p className="mb-4 text-gray-700 whitespace-pre-line">{bug.description}</p>

        <h2 className="font-semibold mb-1">Steps to Reproduce</h2>
        <p className="mb-4 text-gray-700 whitespace-pre-line">{bug.stepsToReproduce}</p>

        {bug.resolutionNote && (
          <>
            <h2 className="font-semibold mb-1">Resolution Note</h2>
            <p className="mb-4 text-gray-700 whitespace-pre-line">{bug.resolutionNote}</p>
          </>
        )}

        {bug.reopenReason && (
          <>
            <h2 className="font-semibold mb-1">Reopen Reason</h2>
            <p className="mb-4 text-gray-700 whitespace-pre-line">{bug.reopenReason}</p>
          </>
        )}
        
        {user.role === 'developer' && bug.status === 'New' && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-3">Review and Assign</h2>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full mb-3 p-2 border rounded"
            >
              <option value="">Select priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
            <button
              onClick={handleAssign}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Assign to me
            </button>
          </div>
        )}

        {user.role === 'developer' &&
        bug.assignee?._id === user.id &&
        (bug.status === 'Assigned' || bug.status === 'Reopened') && (
          <div className="border-t pt-4 mt-4">
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
            <button onClick={handleStartWork} className="bg-yellow-600 text-white px-4 py-2 rounded">
              Start Work
            </button>
          </div>
        )}

        {user.role === 'developer' &&
        bug.assignee?._id === user.id &&
        bug.status === 'In Progress' && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-3">Resolve Bug</h2>
            <textarea
              rows="3"
              placeholder="What did you change to fix this?"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="w-full mb-3 p-2 border rounded"
            />
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
            <button onClick={handleResolve} className="bg-green-600 text-white px-4 py-2 rounded">
              Mark as Resolved
            </button>
          </div>
        )}

        {user.role === 'reporter' &&
        bug.reporter?._id === user.id &&
        bug.status === 'Resolved' && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-3">Verify Fix</h2>
            <p className="text-sm text-gray-600 mb-3">
              Confirm the defect is resolved, or reopen it if the problem persists.
            </p>
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
            <button onClick={handleVerify} className="bg-green-600 text-white px-4 py-2 rounded">
              Verify and Close
            </button>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Still not fixed?</p>
              <textarea
                rows="2"
                placeholder="Why are you reopening this bug?"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full mb-3 p-2 border rounded"
              />
              <button onClick={handleReopen} className="bg-orange-600 text-white px-4 py-2 rounded">
                Reopen Bug
              </button>
            </div>
          </div>
        )}

        {user.role === 'reporter' &&
        bug.reporter?._id === user.id &&
        bug.status === 'New' && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-2">Withdraw Report</h2>
            <p className="text-sm text-gray-600 mb-3">
              You can delete this report while no developer has picked it up.
            </p>
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
            <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded">
              Delete Bug
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BugDetail;