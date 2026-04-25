"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, UserRole } from "@/types";
import { authApi, clearTokens, isAuthenticated } from "@/lib/auth";

export function useAuth(requireAuth = true, requiredRole?: UserRole) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      if (requireAuth) router.replace("/auth/login");
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        // Если требуется роль student, а пользователь admin/reviewer — редиректим в /admin
        if (requiredRole === "student" && (u.role === "admin" || u.role === "reviewer")) {
          router.replace("/admin");
          return;
        }
        // Если требуется admin/reviewer, а пользователь student — редиректим в кабинет
        if (requiredRole === "admin" && u.role === "student") {
          router.replace("/cabinet");
          return;
        }
      })
      .catch(() => {
        clearTokens();
        if (requireAuth) router.replace("/auth/login");
      })
      .finally(() => setLoading(false));
  }, [requireAuth, requiredRole, router]);

  const logout = () => {
    clearTokens();
    setUser(null);
    router.replace("/auth/login");
  };

  return { user, loading, logout };
}
