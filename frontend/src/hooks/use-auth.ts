"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    setUser,
  } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user && !isLoading) {
      refreshUser();
    }
  }, [isAuthenticated, user, isLoading, refreshUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    setUser,
  };
}
