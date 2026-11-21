import type { User } from "../types";

export function getServerUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  // Vite development uses a separate API server; production is same-origin.
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3100`;
  }
  return `${window.location.origin}/play/go`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getServerUrl()}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload as T;
}

export const register = (username: string, password: string) =>
  request<{ token: string; user: User }>("/api/auth/register", {
    method: "POST", body: JSON.stringify({ username, password })
  });

export const login = (username: string, password: string) =>
  request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST", body: JSON.stringify({ username, password })
  });

export const getMe = (token: string) =>
  request<{ user: User }>("/api/me", { headers: { Authorization: `Bearer ${token}` } });
