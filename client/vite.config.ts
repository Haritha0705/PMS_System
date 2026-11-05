import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Absolute paths, so nested URLs like /users/new can still load the assets
  base: '/',
})
