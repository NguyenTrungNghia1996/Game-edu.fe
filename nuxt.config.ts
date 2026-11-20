export default defineNuxtConfig({
  ssr: false, // Bắt buộc: Capacitor đóng gói static HTML/JS chạy trong WebView
  compatibilityDate: '2025-07-01',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
      assetCdnUrl: process.env.NUXT_PUBLIC_ASSET_CDN_URL || 'https://assets.yourdomain.com',
    },
  },

  app: {
    head: {
      title: 'Rừng Chữ Cái - Phiêu Lưu Học Tập',
      htmlAttrs: {
        lang: 'vi',
      },
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        },
        {
          name: 'theme-color',
          content: '#1b3b2b',
        },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Quicksand:wght@600;700&display=swap',
        },
      ],
      script: [
        {
          src: '/runtime-config.js',
        },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
