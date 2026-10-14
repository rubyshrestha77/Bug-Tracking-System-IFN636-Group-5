import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const NotificationBell = () => {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef(null);

  // Close when clicking outside the panel
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = async (notification) => {
    if (!notification.isRead) await markRead(notification._id);
    setOpen(false);
    if (notification.bug?._id) navigate(`/bugs/${notification.bug._id}`);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative px-3 py-2"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 bg-red-600 text-white text-xs
                           rounded-full h-5 w-5 flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 bg-white text-gray-800
                        rounded shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          <div className="flex justify-between items-center p-3 border-b">
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-sm text-blue-600">
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">
              No notifications yet.
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleSelect(n)}
                className={`block w-full text-left p-3 border-b hover:bg-gray-50
                            ${n.isRead ? "" : "bg-blue-50"}`}
              >
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {timeAgo(n.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
