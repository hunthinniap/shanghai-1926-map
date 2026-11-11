import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { createPoiVotesMiddleware } from './lib/poi-votes.mjs'

export function poiVotesPlugin(): Plugin {
  let root: string
  const middleware = createPoiVotesMiddleware({
    loadCandidates: async () => JSON.parse(await readFile(resolve(root, 'public/data/heritage-poi-review.json'), 'utf8')),
    loadVotes: async () => {
      try { return JSON.parse(await readFile(resolve(root, '.local/poi-candidate-votes.json'), 'utf8')) }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error }
    },
    saveVotes: async (votes: unknown) => {
      await mkdir(resolve(root, '.local'), { recursive: true })
      const target = resolve(root, '.local/poi-candidate-votes.json')
      await writeFile(`${target}.tmp`, JSON.stringify(votes, null, 2) + '\n')
      await rename(`${target}.tmp`, target)
    },
  })
  return {
    name: 'local-poi-candidate-votes',
    configResolved(config) { root = config.root },
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}
