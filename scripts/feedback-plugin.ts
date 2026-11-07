import { appendFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

export function feedbackPlugin(): Plugin {
  let directory: string
  function middleware(request: IncomingMessage, response: ServerResponse, next: () => void) {
    if (request.method !== 'POST' || request.url !== '/' || request.headers['x-map-feedback'] !== '1') { next(); return }
    const reply = (status: number, message: string) => {
      response.statusCode = status
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ message }))
    }
    void (async () => {
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk)
        if (size > 24000) { reply(413, '反馈内容过长'); return }
        chunks.push(Buffer.from(chunk))
      }
      const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
      if (form.get('form-name') !== 'map-feedback') { reply(400, '未知表单'); return }
      if (form.get('bot-field')) { reply(200, '已接收'); return }
      if (!form.get('message')?.trim() || !form.get('place-id') || !['road', 'building'].includes(form.get('place-type') || '')) {
        reply(400, '请填写地点和问题说明'); return
      }
      const fields = ['place-id', 'place-type', 'place-name', 'modern-name', 'address', 'year', 'page-url', 'category', 'message', 'email']
      const record = { id: randomUUID(), receivedAt: new Date().toISOString(), ...Object.fromEntries(fields.map(key => [key, form.get(key) || ''])) }
      await mkdir(directory, { recursive: true })
      await appendFile(resolve(directory, 'feedback.ndjson'), JSON.stringify(record) + '\n', 'utf8')
      response.setHeader('X-Map-Feedback', 'local')
      reply(201, '已保存到本机')
    })().catch(() => reply(500, '暂时无法保存反馈'))
  }
  return {
    name: 'local-map-feedback',
    configResolved(config) { directory = resolve(config.root, '.local') },
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}
