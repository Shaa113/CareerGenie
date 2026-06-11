const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const SESSION_KEYS = {
  token: 'token',
  refreshToken: 'refreshToken',
  user: 'user'
};

const readStoredSession = () => ({
  token: localStorage.getItem(SESSION_KEYS.token),
  refreshToken: localStorage.getItem(SESSION_KEYS.refreshToken),
  user: (() => {
    try {
      return localStorage.getItem(SESSION_KEYS.user) ? JSON.parse(localStorage.getItem(SESSION_KEYS.user)) : null;
    } catch {
      return null;
    }
  })()
});

export const setStoredSession = ({ token, refreshToken, user }) => {
  if (token) localStorage.setItem(SESSION_KEYS.token, token);
  if (refreshToken) localStorage.setItem(SESSION_KEYS.refreshToken, refreshToken);
  if (user) localStorage.setItem(SESSION_KEYS.user, JSON.stringify(user));
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_KEYS.token);
  localStorage.removeItem(SESSION_KEYS.refreshToken);
  localStorage.removeItem(SESSION_KEYS.user);
};

const refreshSession = async () => {
  const { refreshToken } = readStoredSession();
  if (!refreshToken) {
    throw new Error('Session expired. Please sign in again.');
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearStoredSession();
    throw new Error(data.message || 'Session expired. Please sign in again.');
  }

  setStoredSession(data);
  return data;
};

export const apiCall = async (endpoint, method = 'GET', body = null, isMultipart = false) => {
  const performRequest = async (tokenOverride = null) => {
    const { token } = readStoredSession();
    const headers = {};

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    const accessToken = tokenOverride || token;
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config = { method, headers };

    if (body) {
      config.body = isMultipart ? body : JSON.stringify(body);
    }

    return fetch(`${BASE_URL}${endpoint}`, config);
  };

  let response = await performRequest();
  let data = await response.json().catch(() => ({}));

  if (response.status === 401 && endpoint !== '/auth/refresh') {
    const refreshed = await refreshSession();
    response = await performRequest(refreshed.token);
    data = await response.json().catch(() => ({}));
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  if (endpoint === '/auth/login' || endpoint === '/auth/register' || endpoint === '/auth/refresh') {
    setStoredSession(data);
  }

  return data;
};
