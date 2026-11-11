import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { feedbackPlugin } from './scripts/feedback-plugin'
import { poiVotesPlugin } from './scripts/poi-votes-plugin'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [react(), feedbackPlugin(), poiVotesPlugin()],
  build: { rollupOptions: { input: {
    map: fileURLToPath(new URL('./index.html', import.meta.url)),
    review: fileURLToPath(new URL('./poi-review.html', import.meta.url)),
  } } },
})
