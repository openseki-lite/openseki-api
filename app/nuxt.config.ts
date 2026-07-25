// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/ark-ui.css', '~/assets/css/tailwind.css'],
  runtimeConfig: {
    public: {
      cacheApiBase: process.env.NUXT_PUBLIC_CACHE_API_BASE || 'https://cdn.yourdomain.com',
      cacheApiToken: process.env.NUXT_PUBLIC_CACHE_API_TOKEN || ''
    }
  }
})
