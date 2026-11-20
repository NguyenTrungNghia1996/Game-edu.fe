import { Preferences } from '@capacitor/preferences'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'edugame_access_token',
  REFRESH_TOKEN: 'edugame_refresh_token',
  USER: 'edugame_user',
  ACTIVE_PROFILE_ID: 'edugame_active_profile_id',
  AUDIO_SETTINGS: 'edugame_audio_settings',
} as const

export const appStorage = {
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value })
  },
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key })
    return value
  },
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key })
  },
}
