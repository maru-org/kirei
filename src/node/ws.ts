import type { ChannelOptions } from 'birpc'
import type { WebSocket } from 'ws'
import type { Metadata } from '../types'
import process from 'node:process'
import c from 'ansis'
import { createBirpcGroup } from 'birpc'
import { consola } from 'consola'
import { parse, stringify } from 'flatted'
import { getPort } from 'get-port-please'
import { WebSocketServer } from 'ws'
import { MARK_CHECK } from './constants'
import { createServerFunctions } from './rpc'

export interface CreateWsServerOptions {
  root: string
}

let rpcInstance: any = null

export async function createWsServer(options: CreateWsServerOptions) {
  const port = await getPort({ port: 7811, random: true })
  const wss = new WebSocketServer({
    port,
  })
  const wsClients = new Set<WebSocket>()

  const serverFunctions = createServerFunctions()

  if (!rpcInstance) {
    rpcInstance = createBirpcGroup(
      serverFunctions,
      [],
      {
        onError(error, name) {
          console.error(
            c.yellow(`[kirei] RPC error on executing "${c.bold(name)}":\n`)
            + c.red(error?.message || ''),
          )
        },
        timeout: 120_000,
      },
    )
  }

  const watchers: any[] = []

  wss.on('connection', (ws) => {
    wsClients.add(ws)
    const channel: ChannelOptions = {
      post: d => ws.send(d),
      on: (fn) => {
        ws.on('message', (data) => {
          fn(data)
        })
      },
      serialize: stringify,
      deserialize: parse,
    }
    rpcInstance.updateChannels((c: any) => {
      c.push(channel)
    })
    ws.on('close', () => {
      wsClients.delete(ws)
      rpcInstance.updateChannels((c: any) => {
        const index = c.indexOf(channel)
        if (index >= 0)
          c.splice(index, 1)
      })
    })

    consola.log(MARK_CHECK, 'WebSocket client connected')
  })

  const getMetadata = async (): Promise<Metadata> => {
    return {
      cwd: options.root,
      websocket: port,
    }
  }

  // Cleanup function
  const cleanup = () => {
    watchers.forEach((watcher) => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close()
      }
    })
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  return {
    port,
    wss,
    getMetadata,
    cleanup,
  }
}
