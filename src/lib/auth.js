const STORAGE_KEY = "Paupediente_session";
const OWNER_STORAGE_KEY = "MyCliniq_owner_session";

export const getStoredSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveSession = (session) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getStoredOwnerSession = () => {
  try {
    const raw = localStorage.getItem(OWNER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveOwnerSession = (session) => {
  localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(session));
};

export const clearOwnerSession = () => {
  localStorage.removeItem(OWNER_STORAGE_KEY);
};

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(normalized + padding);
};

export const decodeJwt = (token) => {
  try {
    const [, payload] = String(token || "").split(".");
    return payload ? JSON.parse(decodeBase64Url(payload)) : null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
};

export const getStoredToken = () => {
  const session = getStoredSession();
  if (!session?.token) return null;
  if (isTokenExpired(session.token)) {
    clearSession();
    return null;
  }
  return session.token;
};

export const getStoredOwnerToken = () => {
  const session = getStoredOwnerSession();
  if (!session?.token) return null;
  if (isTokenExpired(session.token)) {
    clearOwnerSession();
    return null;
  }
  return session.token;
};
