import axios from 'axios';

export const TOKEN_KEY = 'kostkita_admin_token';
export const USER_KEY = 'kostkita_admin_user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      const onLogin = window.location.pathname.startsWith('/admin/login');
      if (status === 401 && !onLogin) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export const errMsg = (err: any, fallback = 'Terjadi kesalahan.') =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

export default api;
