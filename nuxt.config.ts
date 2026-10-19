import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Linde',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Linde is een lokaal marketingdashboard voor merk, social, SEO en outreach.' },
        { name: 'theme-color', content: '#004643' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Linde' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
  modules: ['@nuxtjs/i18n', '@nuxt/icon'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['motion-v', 'cropperjs', 'better-auth/vue'],
    },
  },
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('cropper-'),
    },
  },
  icon: {
    serverBundle: {
      collections: ['solar', 'emojione-v1'],
    },
  },
  i18n: {
    locales: [
      { code: 'nl', language: 'nl-NL', name: 'Nederlands', file: 'nl.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'nl',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    detectBrowserLanguage: false,
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'file:.data/app.db',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    aiProvider: process.env.AI_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4.1',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    imageProvider: process.env.IMAGE_PROVIDER || 'openai',
    openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID || '',
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    metaAppId: process.env.META_APP_ID || '',
    metaAppSecret: process.env.META_APP_SECRET || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    tiktokClientKey: process.env.TIKTOK_CLIENT_KEY || '',
    tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    tiktokPrivacy: process.env.TIKTOK_PRIVACY || 'SELF_ONLY',
    mailApiUrl: process.env.MAIL_API_URL || '',
    mailApiKey: process.env.MAIL_API_KEY || '',
    outreachDailyLimit: process.env.OUTREACH_DAILY_LIMIT || '50',
    public: {
      aiProvider: process.env.AI_PROVIDER || 'openai',
      imageProvider: process.env.IMAGE_PROVIDER || 'openai',
      appUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    },
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '* * * * *': ['social:publish', 'outreach:send'],
    },
  },
})
