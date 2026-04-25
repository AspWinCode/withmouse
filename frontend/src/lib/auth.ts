import { api } from "./api";
import { TokenResponse, User } from "@/types";

export const authApi = {
  register: (data: { name: string; phone: string; password: string }) =>
    api.post<TokenResponse>("/auth/register", data).then((r) => r.data),

  login: (data: { phone: string; password: string }) =>
    api.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  me: () => api.get<User>("/auth/me").then((r) => r.data),

  updateMe: (data: { name?: string; password?: string }) =>
    api.patch<User>("/auth/me", data).then((r) => r.data),
};

export function saveTokens(response: TokenResponse) {
  localStorage.setItem("access_token", response.access_token);
  localStorage.setItem("refresh_token", response.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}
