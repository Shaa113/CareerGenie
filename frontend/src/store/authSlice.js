import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const refreshToken = localStorage.getItem('refreshToken');
const user = (() => {
  try {
    return localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  } catch {
    return null;
  }
})();

const initialState = {
  token: token || null,
  refreshToken: refreshToken || null,
  user: user || null,
  isAuthenticated: !!token,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || state.refreshToken;
      state.user = action.payload.user;
      state.error = null;
      localStorage.setItem('token', action.payload.token);
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    syncUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!state.token;
    },
    authFailure: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.error = action.payload;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    logout: (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
    sessionRestored: (state, action) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || state.refreshToken;
      state.user = action.payload.user || state.user;
      state.isAuthenticated = !!action.payload.token;
    }
  }
});

export const { authStart, authSuccess, authFailure, logout, clearError, syncUser, sessionRestored } = authSlice.actions;
export default authSlice.reducer;
