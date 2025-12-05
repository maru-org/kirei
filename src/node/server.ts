import type { CreateWsServerOptions } from './ws'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import process from 'node:process'
import { H3, serveStatic } from 'h3'
import { toNodeHandler } from 'h3/node'
import { lookup } from 'mrmime'
import { distDir } from '../dirs'
import { createWsServer } from './ws'

export async function createHostServer(options?: CreateWsServerOptions) {
  const app = new H3()

  const ws = await createWsServer(options || { root: process.cwd() })

  const fileMap = new Map<string, Promise<string | undefined>>()
  const readCachedFile = (id: string) => {
    if (!fileMap.has(id))
      fileMap.set(id, readFile(id, 'utf-8').catch(() => undefined))
    return fileMap.get(id)
  }

  app.get('/api/metadata.json', async (event) => {
    event.res.headers.set('Content-Type', 'application/json')
    return ws.getMetadata()
  })

  app.all('/**', async (event) => {
    const result = await serveStatic(event, {
      fallthrough: true,
      getContents: id => readCachedFile(join(distDir, id)),
      getMeta: async (id) => {
        const stats = await stat(join(distDir, id)).catch(() => {})
        if (!stats || !stats.isFile())
          return
        return {
          type: lookup(id),
          size: stats.size,
          mtime: stats.mtimeMs,
        }
      },
    })
    if (result === undefined) {
      event.res.headers.set('Content-Type', 'text/html')
      return readCachedFile(join(distDir, 'index.html'))
    }
    return result
  })

  return createServer(toNodeHandler(app))
}
