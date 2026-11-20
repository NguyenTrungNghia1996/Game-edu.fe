import { defineStore } from 'pinia'
import { apiRequest } from '~/services/api'
import { appStorage, STORAGE_KEYS } from '~/services/storage'
import type { AuthResponse, CreateProfileRequest, Profile, User } from '~/types/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    hydrated: false,
    accessToken: null as string | null,
    refreshToken: null as string | null,
    user: null as User | null,
    profiles: [] as Profile[],
    activeProfileId: null as string | null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    activeProfile: (state): Profile | null =>
      state.profiles.find((p) => p.id === state.activeProfileId) ?? null,
  },

  actions: {
    async hydrate(): Promise<void> {
      if (this.hydrated) return
      const [accessToken, refreshToken, rawUser, activeProfileId] = await Promise.all([
        appStorage.get(STORAGE_KEYS.ACCESS_TOKEN),
        appStorage.get(STORAGE_KEYS.REFRESH_TOKEN),
        appStorage.get(STORAGE_KEYS.USER),
        appStorage.get(STORAGE_KEYS.ACTIVE_PROFILE_ID),
      ])

      this.accessToken = accessToken
      this.refreshToken = refreshToken
      this.activeProfileId = activeProfileId
      if (rawUser) {
        try {
          this.user = JSON.parse(rawUser) as User
        } catch {
          this.user = null
        }
      }
      this.hydrated = true

      if (this.accessToken) {
        try {
          await this.fetchProfiles()
        } catch {
          // Token might be expired or backend offline; keep state until user acts
        }
      }
    },

    async saveAuthSession(resp: AuthResponse): Promise<void> {
      this.accessToken = resp.access_token
      this.refreshToken = resp.refresh_token
      this.user = resp.user
      await Promise.all([
        appStorage.set(STORAGE_KEYS.ACCESS_TOKEN, resp.access_token),
        appStorage.set(STORAGE_KEYS.REFRESH_TOKEN, resp.refresh_token),
        appStorage.set(STORAGE_KEYS.USER, JSON.stringify(resp.user)),
      ])
    },

    async login(email: string, password: string): Promise<void> {
      this.loading = true
      try {
        const resp = await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          skipAuth: true,
          body: { email, password },
        })
        await this.saveAuthSession(resp)
        await this.fetchProfiles()
      } finally {
        this.loading = false
      }
    },

    async register(email: string, password: string): Promise<void> {
      this.loading = true
      try {
        const resp = await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          skipAuth: true,
          body: { email, password },
        })
        await this.saveAuthSession(resp)
        await this.fetchProfiles()
      } finally {
        this.loading = false
      }
    },

    async fetchProfiles(): Promise<Profile[]> {
      const resp = await apiRequest<{ profiles: Profile[] }>('/profiles', {
        method: 'GET',
      })
      this.profiles = resp.profiles ?? []

      // Validate active profile still belongs to user
      if (
        this.activeProfileId &&
        !this.profiles.some((p) => p.id === this.activeProfileId)
      ) {
        this.activeProfileId = null
        await appStorage.remove(STORAGE_KEYS.ACTIVE_PROFILE_ID)
      }
      return this.profiles
    },

    async createProfile(payload: CreateProfileRequest): Promise<Profile> {
      const created = await apiRequest<Profile>('/profiles', {
        method: 'POST',
        body: payload,
      })
      this.profiles.push(created)
      await this.selectProfile(created.id)
      return created
    },

    async selectProfile(profileId: string): Promise<void> {
      this.activeProfileId = profileId
      await appStorage.set(STORAGE_KEYS.ACTIVE_PROFILE_ID, profileId)
    },

    applyRewardToActiveProfile(coinsDelta: number, starsDelta: number): void {
      const profile = this.profiles.find((p) => p.id === this.activeProfileId)
      if (!profile) return
      profile.coins += coinsDelta
      profile.total_stars += starsDelta
    },

    async logout(): Promise<void> {
      this.accessToken = null
      this.refreshToken = null
      this.user = null
      this.profiles = []
      this.activeProfileId = null
      await Promise.all([
        appStorage.remove(STORAGE_KEYS.ACCESS_TOKEN),
        appStorage.remove(STORAGE_KEYS.REFRESH_TOKEN),
        appStorage.remove(STORAGE_KEYS.USER),
        appStorage.remove(STORAGE_KEYS.ACTIVE_PROFILE_ID),
      ])
    },
  },
})
