import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: './frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index:           resolve(__dirname, 'frontend/index.html'),
        dashboard:       resolve(__dirname, 'frontend/dashboard.html'),
        login:           resolve(__dirname, 'frontend/login.html'),
        register:        resolve(__dirname, 'frontend/register.html'),
        forgotPassword:  resolve(__dirname, 'frontend/forgot-password.html'),
        resetPassword:   resolve(__dirname, 'frontend/reset-password.html'),
        termos:          resolve(__dirname, 'frontend/termos.html'), // 👈 adiciona isso
      }
    }
  }
})