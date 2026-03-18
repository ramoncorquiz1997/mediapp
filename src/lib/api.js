import { clearOwnerSession, clearSession, getStoredOwnerToken, getStoredToken } from "./auth";

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

export async function ownerApiFetch(input, init = {}) {
  const token = getStoredOwnerToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearOwnerSession();
    window.dispatchEvent(new CustomEvent("owner:unauthorized"));
  }

  return response;
}
