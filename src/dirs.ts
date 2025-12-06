import { fileURLToPath } from 'node:url'

export const distDir = fileURLToPath(new URL('../dist/public', import.meta.url))
export const serverDir = fileURLToPath(new URL('../dist/server', import.meta.url))
