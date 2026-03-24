/**
 * useAuth — Yetki Bilgisine Kısa Yoldan Erişim Hook'u
 *
 * Ne işe yarar:
 *   Herhangi bir bileşende `const { user, login, logout } = useAuth()`
 *   yazarak kullanıcı oturum bilgilerine ve işlevlerine anında erişim sağlar.
 *
 * Dikkat edilen noktalar:
 *   - AuthContext dışında kullanılırsa anlamlı hata mesajı verir.
 *   - "use client" direktifi ile işaretlenmiştir çünkü React hook'larını
 *     yalnızca Client Component'lerde kullanabiliriz.
 */

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
