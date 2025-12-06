import process from 'node:process'
import { defineNuxtConfig } from 'nuxt/config'

const isProd = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: {
    enabled: false,
  },
  logLevel: 'verbose',
  experimental: {
    typedPages: true,
    clientNodeCompat: true,
  },
  features: {
    inlineStyles: false,
  },
  css: [
  ],
  nitro: {
    preset: isProd ? 'node-server' : undefined,
    output: isProd ? { dir: '../dist' } : undefined,
    sourceMap: false,
  },
  // App Config
  app: {
    // In dev, use absolute base to avoid relative asset/manifest resolution issues on nested routes
    baseURL: isProd ? './' : '/',
    head: {
      title: 'Kirei Clean You Computer',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      htmlAttrs: {
        lang: 'en',
        class: 'bg-dots',
      },
    },
  },
})
