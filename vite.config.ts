import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { feedbackPlugin } from './scripts/feedback-plugin'

export default defineConfig({
  base: './',
  plugins: [react(), feedbackPlugin()],
})
