import process from 'node:process'

export default defineEventHandler(async () => {
  const platform = process.platform

  return {
    platform,
    isMacOS: platform === 'darwin',
  }
})
