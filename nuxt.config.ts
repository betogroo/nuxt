// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devServer: {
    host: '127.0.0.1',
    port: 3000,
  },
  alias: {
    cookie: 'cookie-es',
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', 'vuetify-nuxt-module', '@nuxtjs/supabase'],
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/about', '/register'],
    },
  },
  vuetify: {
    vuetifyOptions: {
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#3451D9',
              secondary: '#2F29B0',
              background: '#F8F9FC',
              surface: '#FFFFFF',
            },
          },
          dark: {
            colors: {
              primary: '#859FFF',
              secondary: '#A5B4FC',
              background: '#0B0E14',
              surface: '#151920',
            },
          },
        },
      },
    },
  },
})
