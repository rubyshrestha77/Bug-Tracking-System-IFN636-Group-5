import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const statusColour = {
  'New': 'bg-gray-200 text-gray-800',
  'Assigned': 'bg-blue-200 text-blue-800',
  'In Progress': 'bg-yellow-200 text-yellow-800',
  'Resolved': 'bg-green-200 text-green-800',
  'Closed': 'bg-gray-300 text-gray-600',
  'Reopened': 'bg-orange-200 text-orange-800',
};

const severityColour = {
  'Critical': 'bg-red-200 text-red-800',
  'Major': 'bg-orange-200 text-orange-800',
  'Minor': 'bg-yellow-200 text-yellow-800',
  'Trivial': 'bg-gray-200 text-gray-800',
};

const Badge = ({ text, className }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>{text}</span>
);

const BugList = ({ bugs, hasActiveFilters, onClearFilters }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (bugs.length === 0) {
    return (
      <div className="bg-white p-8 shadow-md rounded text-center">
        {hasActiveFilters ? (
          <>
            <p className="text-gray-600 mb-4">No bugs match the selected filters.</p>
            <button onClick={onClearFilters} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded">
              Clear filters
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">No bugs have been reported yet.</p>
            {user.role === 'reporter' ? (
              <button
                onClick={() => navigate('/bugs/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Report the first bug
              </button>
            ) : (
              <p className="text-sm text-gray-500">
                New bug reports will appear here for review.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="p-3">Title</th>
            <th className="p-3">Status</th>
            <th className="p-3">Severity</th>
            <th className="p-3">Priority</th>
            <th className="p-3">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug) => (
            <tr
              key={bug._id}
              onClick={() => navigate(`/bugs/${bug._id}`)}
              className="border-t hover:bg-gray-50 cursor-pointer"
            >
              <td className="p-3">{bug.title}</td>
              <td className="p-3">
                <Badge text={bug.status} className={statusColour[bug.status]} />
              </td>
              <td className="p-3">
                <Badge text={bug.severity} className={severityColour[bug.severity]} />
              </td>
              <td className="p-3 text-sm">{bug.priority || '—'}</td>
              <td className="p-3 text-sm">{bug.assignee?.name || 'Unassigned'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BugList;