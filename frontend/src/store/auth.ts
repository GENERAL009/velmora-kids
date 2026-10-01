"use client";

import { create } from "zustand";
import Cookies from "js-cookie";
import { apiGet, apiPost } from "@/lib/api";
import type { User, AuthTokens } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!Cookies.get("access_token"),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const tokens = await apiPost<AuthTokens>("/auth/login", {
        email,
        password,
      });

      Cookies.set("access_token", tokens.access_token, {
        expires: 1,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      Cookies.set("refresh_token", tokens.refresh_token, {
        expires: 30,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      const user = await apiGet<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const tokens = await apiPost<AuthTokens>("/auth/register", data);

      Cookies.set("access_token", tokens.access_token, {
        expires: 1,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      Cookies.set("refresh_token", tokens.refresh_token, {
        expires: 30,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      const user = await apiGet<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    const token = Cookies.get("access_token");
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await apiGet<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
