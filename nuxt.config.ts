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
  routeRules: {
    '/elections/**/ballot-box/**': { ssr: false },
  },
  modules: ['@nuxt/eslint', 'vuetify-nuxt-module', '@nuxtjs/supabase'],
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/about', '/register'],
      saveRedirectToCookie: true,
    },
    cookiePrefix: 'sb',
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  vuetify: {
    vuetifyOptions: {
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#4F46E5',
              secondary: '#06B6D4',
              background: '#F8FAFC',
              surface: '#FFFFFF',
              'on-surface': '#0F172A',
              'surface-variant': '#F1F5F9',
              'on-surface-variant': '#1E293B',
              success: '#10B981',
              error: '#EF4444',
              warning: '#F59E0B',
              info: '#3B82F6',
            },
          },
          dark: {
            colors: {
              primary: '#818CF8',
              secondary: '#67E8F9',
              background: '#0F172A',
              surface: '#1E293B',
              'on-surface': '#F8FAFC',
              'surface-variant': '#334155',
              'on-surface-variant': '#F8FAFC',
              success: '#34D399',
              error: '#F87171',
              warning: '#FBBF24',
              info: '#60A5FA',
            },
          },
        },
      },
    },
  },
})
