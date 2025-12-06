import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import process from 'node:process'
import c from 'ansis'
import cac from 'cac'
import { getPort } from 'get-port-please'
import open from 'open'
import { name } from '../../package.json'
import { distDir } from '../dirs'
import { MARK_GIT } from './constants'

const cli = cac(name)

cli
  .command('', 'Run Kirei')
  .action(async () => {
    const host = '127.0.0.1'
    const port = await getPort({ port: 7777, portRange: [7777, 9000], host })

    console.log(c.green`${MARK_GIT} Starting Kirei at`, c.green(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`), '\n')

    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.txt': 'text/plain',
    }

    const server = createServer(async (req, res) => {
      try {
        let urlPath = req.url || '/'

        // 处理 API 请求
        if (urlPath === '/api/metadata.json') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ cwd: process.cwd() }))
          return
        }

        // 去除查询参数
        urlPath = urlPath.split('?')[0]

        // 默认使用 index.html
        if (urlPath === '/' || urlPath === '') {
          urlPath = '/index.html'
        }

        const filePath = join(distDir, urlPath)

        // 检查文件是否存在
        const stats = await stat(filePath).catch(() => null)

        if (!stats || !stats.isFile()) {
          // 如果文件不存在，返回 index.html (SPA fallback)
          const indexPath = join(distDir, 'index.html')
          const indexContent = await readFile(indexPath, 'utf-8')
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(indexContent)
          return
        }

        // 获取文件扩展名和 MIME 类型
        const ext = urlPath.substring(urlPath.lastIndexOf('.'))
        const mimeType = mimeTypes[ext] || 'application/octet-stream'

        const content = await readFile(filePath)
        res.writeHead(200, { 'Content-Type': mimeType })
        res.end(content)
      }
      catch (error) {
        res.writeHead(500)
        res.end('Internal Server Error', error)
      }
    })

    server.listen(port, host, async () => {
      await open(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`)
    })
  })

cli.help()
cli.parse()
