"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      containerStyle={{
        top: 20,
        right: 20,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#FAF9F7",
          color: "#3D3835",
          border: "1px solid #E8E5E0",
          borderRadius: "12px",
          padding: "14px 18px",
          fontSize: "14px",
          fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
          boxShadow:
            "0 4px 25px -5px rgba(45, 41, 38, 0.08), 0 10px 30px -5px rgba(45, 41, 38, 0.04)",
          maxWidth: "380px",
        },
        success: {
          iconTheme: {
            primary: "#7DAF8E",
            secondary: "#E8F4ED",
          },
        },
        error: {
          iconTheme: {
            primary: "#C77D7D",
            secondary: "#F9E8E8",
          },
        },
      }}
    />
  );
}
