interface WindowAppConfig {
  apiBaseUrl?: string
  assetCdnUrl?: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: WindowAppConfig
  }
}

export function getPublicRuntimeConfig(): { apiBaseUrl: string; assetCdnUrl: string } {
  const nuxtConfig = useRuntimeConfig()
  const runtimeOverride = typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined

  const apiBaseUrl = (
    runtimeOverride?.apiBaseUrl ||
    (nuxtConfig.public.apiBaseUrl as string) ||
    ''
  ).replace(/\/+$/, '')

  const assetCdnUrl = (
    runtimeOverride?.assetCdnUrl ||
    (nuxtConfig.public.assetCdnUrl as string) ||
    ''
  ).replace(/\/+$/, '')

  return { apiBaseUrl, assetCdnUrl }
}
