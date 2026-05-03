import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On stilgar the SPA is mounted at /apps/kanooptorrentd/ via nginx with
// strip_prefix:true, so every browser-derived URL — assets, router routes,
// fetch targets — must include this prefix. Vite plumbs `base` into
// import.meta.env.BASE_URL so the rest of the app stays self-describing.
const BASE = '/apps/kanooptorrentd/'

export default defineConfig({
  base: BASE,
  plugins: [react()],
  server: {
    proxy: {
      // Match the prefixed API URL the client now produces, then strip the
      // prefix when forwarding to the FastAPI dev server (which expects /api/...).
      [`${BASE}api`]: {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/apps\/kanooptorrentd/, ''),
      },
    },
  },
})
