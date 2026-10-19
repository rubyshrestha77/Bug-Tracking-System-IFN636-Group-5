import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosConfig";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axiosInstance.get("/notifications", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      // leave the list as-is on failure
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id) => {
    await axiosInstance.patch(
      `/notifications/${id}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${user.token}` },
      },
    );
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
  };

  const markAllRead = async () => {
    await axiosInstance.patch(
      "/notifications/read-all",
      {},
      {
        headers: { Authorization: `Bearer ${user.token}` },
      },
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  };
};
