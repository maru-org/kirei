import { fork } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'
import c from 'ansis'
import { defineCommand, runMain } from 'citty'
import { getPort } from 'get-port-please'
import open from 'open'
import { description, name, version } from '../../package.json'
import { serverDir } from '../dirs'
import { MARK_GIT } from './constants'
import { runScannerAction } from './scanner'

const main = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  args: {
    // --- Server options ---
    host: {
      type: 'string',
      description: 'Host to listen on',
      default: '127.0.0.1',
    },
    port: {
      type: 'string',
      description: 'Port to listen on',
      default: '7777',
    },
    open: {
      type: 'boolean',
      description: 'Open browser on start',
      default: true,
    },

    // --- Scanner options ---
    scan: {
      type: 'boolean',
      description: 'Run junk scan',
      default: false,
    },

    // --- Cleaning options ---
    mode: {
      type: 'string',
      description: 'Deletion mode: "soft" (trash) or "hard" (rm -rf)',
      default: 'soft',
    },
  },
  async run({ args }) {
    const host = args.host
    const port = await getPort({
      port: Number.parseInt(args.port),
      portRange: [7777, 9000],
      host,
    })

    console.log(c.green`${MARK_GIT} Starting Kirei at`, c.green(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`), '\n')

    // Delegate scanning logic to the scanner module
    await runScannerAction({
      scan: args.scan,
      mode: args.mode,
    })

    const serverEntry = join(serverDir, 'index.mjs')

    const child = fork(serverEntry, [], {
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
        NITRO_HOST: host,
        NITRO_PORT: String(port),
      },
      stdio: 'inherit',
    })

    if (args.open) {
      setTimeout(async () => {
        await open(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`)
      }, 1000)
    }

    child.on('error', (error) => {
      console.error(c.red`Failed to start server:`, error)
      process.exit(1)
    })

    child.on('exit', (code) => {
      process.exit(code ?? 0)
    })
  },
})

runMain(main)
