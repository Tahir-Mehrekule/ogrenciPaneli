"use client";

import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth hook'u yalnızca <AuthProvider> içinde kullanılabilir."
    );
  }

  return context;
}
