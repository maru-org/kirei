import c from 'ansis'
import cac from 'cac'
import { getPort } from 'get-port-please'
import open from 'open'
import { name } from '../../package.json'
import { MARK_GIT } from './constants'
import { createHostServer } from './server'

const cli = cac(name)

cli
  .command('', 'Run Kirei')
  .action(async () => {
    // const root = process.cwd()
    const host = '127.0.0.1'
    const port = await getPort({ port: 7777, portRange: [7777, 9000], host })

    console.log(c.green`${MARK_GIT} Starting Kirei at`, c.green(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`), '\n')

    const server = await createHostServer()

    server.listen(port, host, async () => {
      await open(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`)
    })
  })

cli.help()
cli.parse()
