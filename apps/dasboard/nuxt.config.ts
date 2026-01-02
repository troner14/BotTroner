import "@bot/env"
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  typescript: {
    typeCheck: false,
  },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxt/hints',
    '@nuxt/icon',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils',
  ],

  runtimeConfig: {
    oauth: {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID || '',
        clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
        redirectURL: process.env.DISCORD_REDIRECT_URL || ''
      }
    }
  },
})