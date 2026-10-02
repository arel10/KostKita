/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_TAGLINE: string;
  readonly VITE_DEFAULT_MAP_LAT: string;
  readonly VITE_DEFAULT_MAP_LNG: string;
  readonly VITE_DEFAULT_MAP_ZOOM: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
