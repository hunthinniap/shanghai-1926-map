import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { JSDOM } from 'jsdom'
import { parseWikipediaHeritageList } from './lib/wikipedia-heritage-list.mjs'

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data/shanghai-excellent-historical-buildings/wikipedia')
if (process.argv.length > 2) throw new Error('Usage: collect-shanghai-heritage-wikipedia-list.mjs')
const requestedUrl = 'https://zh.wikipedia.org/zh-hans/上海市优秀历史建筑'
const fetchUrl = 'https://api.wikimedia.org/core/v1/wikipedia/zh/page/上海市优秀历史建筑/html'
const args = ['--fail', '--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https',
  '--connect-timeout', '20', '--max-time', '50', '--retry', '2', '--retry-delay', '8',
  '--user-agent', 'ShanghaiHistoricalMapResearch/1.0 (local archival research)']
let proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
if (!proxy && process.platform === 'darwin') {
  try {
    const settings = execFileSync('scutil', ['--proxy'], { encoding: 'utf8' })
    for (const prefix of ['HTTPS', 'HTTP']) {
      const host = settings.match(new RegExp(`${prefix}Proxy\\s*:\\s*(\\S+)`))?.[1]
      const port = settings.match(new RegExp(`${prefix}Port\\s*:\\s*(\\d+)`))?.[1]
      if (new RegExp(`${prefix}Enable\\s*:\\s*1`).test(settings) && host && port) { proxy = `http://${host}:${port}`; break }
    }
  } catch { /* Use direct access if no system proxy is available. */ }
}
if (proxy) args.push('--proxy', proxy)
args.push(fetchUrl)
const { stdout: bytes } = await promisify(execFile)('curl', args, { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 })
const dom = new JSDOM(bytes.toString('utf8'))
const document = dom.window.document
const revisionId = document.documentElement.getAttribute('about')?.match(/\/revision\/(\d+)/u)?.[1]
if (document.title !== '上海市优秀历史建筑' || !revisionId) throw new Error('Unexpected Wikipedia HTML response; snapshot was not replaced')
const source = { requestedUrl, fetchUrl, localPath: 'raw/list.html', retrievedAt: new Date().toISOString(),
  byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), revisionId,
  modifiedAt: document.querySelector('meta[property="dc:modified"]')?.getAttribute('content') ?? null,
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }
dom.window.close()
const parsed = parseWikipediaHeritageList(bytes.toString('utf8'), source)
const counts = [1, 2, 3, 4, 5].map((batch) => parsed.records.filter((r) => r.batch === batch).length)
if (counts.join(',') !== '61,175,162,234,426') throw new Error(`Wikipedia batch counts changed (${counts}); review before replacing snapshots`)
let previous = null
try { previous = JSON.parse(await fs.readFile(path.join(directory, 'list-source.json'), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
if (previous?.sha256 === source.sha256) {
  console.log(`Wikipedia revision ${revisionId} unchanged; original retrieval provenance retained.`)
} else if (previous?.revisionId === revisionId) {
  // Parsoid may regenerate IDs/metadata without a new editorial revision.
  console.log(`Wikipedia revision ${revisionId} unchanged; retaining the existing verified snapshot bytes.`)
} else {
  await fs.mkdir(path.join(directory, 'raw'), { recursive: true })
  await fs.writeFile(path.join(directory, source.localPath), bytes)
  await fs.writeFile(path.join(directory, 'list-source.json'), `${JSON.stringify(source, null, 2)}\n`)
  console.log(`Saved Wikipedia revision ${revisionId}: ${parsed.recordCount} listings. Review crosswalk/scope revisions before enriching a changed list.`)
}
