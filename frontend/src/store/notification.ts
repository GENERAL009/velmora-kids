import { create } from "zustand";
import { apiGet, apiPatch } from "@/lib/api";
import type { Notification } from "@/types";

interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  isLoading: boolean;
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  unreadCount: 0,
  notifications: [],
  isLoading: false,

  fetchUnreadCount: async () => {
    try {
      const data = await apiGet<{ count: number }>("/notifications/unread-count");
      set({ unreadCount: data.count });
    } catch {
      // silently fail - user might not be authenticated
    }
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await apiGet<Notification[]>("/notifications");
      set({ notifications: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiPatch(`/notifications/${id}/read`, {});
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // ignore
    }
  },

  markAllAsRead: async () => {
    try {
      await apiPatch("/notifications/read-all", {});
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // ignore
    }
  },
}));
