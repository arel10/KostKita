/**
 * URL portal juragan / pemilik kost (Owner Portal).
 * Default ke port 5176 (atau port dev owner yang aktif), dapat dikonfigurasi melalui .env
 */
export const OWNER_URL: string =
  (import.meta.env.VITE_OWNER_APP_URL as string) || 'http://localhost:5174';

export const OWNER_ROUTES = {
  login: `${OWNER_URL}/login`,
  register: `${OWNER_URL}/register`,
  dashboard: `${OWNER_URL}/`,
  plans: `${OWNER_URL}/subscription`,
};
