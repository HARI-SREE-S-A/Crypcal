/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOMESERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
