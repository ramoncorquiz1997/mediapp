import { clearSession, getStoredToken } from "./auth";

export async function apiFetch(input, init = {}) {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  return response;
}
