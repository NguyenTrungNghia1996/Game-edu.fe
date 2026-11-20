import { defineStore } from 'pinia'
import { gameEventBus } from '~/game/eventBus'
import { extractEquippedGear, type EquippedGear } from '~/game/heroTexture'
import { apiRequest } from '~/services/api'
import { useAuthStore } from './auth'
import type {
  ProfileInventory,
  SanitizedChallenge,
  StageMapNodeResponse,
  StartStageResponse,
  SubmitAnswerResponse,
  WorldMapResponse,
  WorldSummaryResponse,
} from '~/types/api'

export interface PendingStageReward {
  stageId: string
  stageName: string
  starsEarned: number
  firstTimeClear: boolean
  coinsEarned: number
  item: { id: string; name: string; icon_url: string } | null
  explanation: string
  nextStageId: string | null
  nextWorldId: string | null
}

export const useGameStore = defineStore('game', {
  state: () => ({
    worlds: [] as WorldSummaryResponse[],
    currentWorldMap: null as WorldMapResponse | null,
    activeStageNode: null as StageMapNodeResponse | null,
    activeAttempt: null as StartStageResponse | null,
    currentChallengeIndex: 0,
    pendingReward: null as PendingStageReward | null,
    inventory: [] as ProfileInventory[],
    loadingWorlds: false,
    loadingMap: false,
    loadingStage: false,
    loadingInventory: false,
    submittingAnswer: false,
  }),

  getters: {
    currentChallenge(state): SanitizedChallenge | null {
      if (!state.activeAttempt) return null
      return state.activeAttempt.challenges[state.currentChallengeIndex] ?? null
    },
    equippedItems(state): ProfileInventory[] {
      return state.inventory.filter((entry) => entry.is_equipped)
    },
    equippedGear(state): EquippedGear {
      return extractEquippedGear(state.inventory)
    },
    stages(state): StageMapNodeResponse[] {
      return state.currentWorldMap?.stages ?? []
    },
  },

  actions: {
    async fetchWorlds(): Promise<WorldSummaryResponse[]> {
      this.loadingWorlds = true
      try {
        const resp = await apiRequest<{ worlds: WorldSummaryResponse[] }>('/worlds', {
          method: 'GET',
          requireProfile: true,
        })
        this.worlds = resp.worlds ?? []
        return this.worlds
      } finally {
        this.loadingWorlds = false
      }
    },

    async fetchWorldMap(worldId: string): Promise<WorldMapResponse> {
      this.loadingMap = true
      try {
        const resp = await apiRequest<WorldMapResponse>(`/worlds/${worldId}/map`, {
          method: 'GET',
          requireProfile: true,
        })
        this.currentWorldMap = resp
        return resp
      } finally {
        this.loadingMap = false
      }
    },

    async startStage(stageId: string): Promise<StartStageResponse> {
      this.loadingStage = true
      try {
        const resp = await apiRequest<StartStageResponse>(`/stages/${stageId}/start`, {
          method: 'POST',
          requireProfile: true,
        })
        this.activeAttempt = resp
        this.currentChallengeIndex = 0
        this.pendingReward = null
        this.activeStageNode =
          this.currentWorldMap?.stages.find((st) => st.id === stageId) ?? null
        return resp
      } finally {
        this.loadingStage = false
      }
    },

    async submitAnswer(
      stageId: string,
      challengeId: string,
      answer: string | Record<string, string>,
    ): Promise<SubmitAnswerResponse> {
      if (!this.activeAttempt) {
        throw new Error('Không tìm thấy phiên làm bài hiện tại')
      }
      this.submittingAnswer = true
      try {
        const resp = await apiRequest<SubmitAnswerResponse>(`/stages/${stageId}/submit`, {
          method: 'POST',
          requireProfile: true,
          body: {
            attempt_id: this.activeAttempt.attempt_id,
            challenge_id: challengeId,
            answer,
          },
        })

        if (resp.is_correct && !resp.stage_completed) {
          this.currentChallengeIndex += 1
        }

        if (resp.stage_completed) {
          const starsEarned = resp.stars_earned ?? 3
          const firstTimeClear = resp.first_time_clear ?? false
          const coinsEarned = resp.rewards?.coins ?? 0
          const previousStars = this.activeStageNode?.stars ?? 0
          const starsDelta = firstTimeClear
            ? starsEarned
            : Math.max(0, starsEarned - previousStars)

          const authStore = useAuthStore()
          authStore.applyRewardToActiveProfile(coinsEarned, starsDelta)

          this.pendingReward = {
            stageId,
            stageName: this.activeAttempt.stage.name,
            starsEarned,
            firstTimeClear,
            coinsEarned,
            item: resp.rewards?.item ?? null,
            explanation: resp.explanation ?? '',
            nextStageId: resp.unlocks?.next_stage_id ?? null,
            nextWorldId: resp.unlocks?.next_world_id ?? null,
          }

          // Refresh map & inventory in background so next return to map shows unlocked stage & stars
          if (this.currentWorldMap) {
            void this.fetchWorldMap(this.currentWorldMap.world.id)
          }
          if (resp.rewards?.item) {
            void this.fetchInventory()
          }
        }

        return resp
      } finally {
        this.submittingAnswer = false
      }
    },

    clearActiveAttempt(): void {
      this.activeAttempt = null
      this.currentChallengeIndex = 0
    },

    clearPendingReward(): void {
      this.pendingReward = null
    },

    async fetchInventory(): Promise<ProfileInventory[]> {
      this.loadingInventory = true
      try {
        const resp = await apiRequest<{ items: ProfileInventory[] }>('/inventory', {
          method: 'GET',
          requireProfile: true,
        })
        this.inventory = resp.items ?? []
        gameEventBus.emit('hero:equipment-changed', { gear: this.equippedGear })
        return this.inventory
      } finally {
        this.loadingInventory = false
      }
    },

    async toggleEquipItem(itemId: string, isEquipped?: boolean): Promise<ProfileInventory> {
      const updated = await apiRequest<ProfileInventory>(`/inventory/${itemId}/equip`, {
        method: 'PATCH',
        requireProfile: true,
        body: isEquipped === undefined ? {} : { is_equipped: isEquipped },
      })
      await this.fetchInventory()
      return updated
    },

    reset(): void {
      this.worlds = []
      this.currentWorldMap = null
      this.activeStageNode = null
      this.activeAttempt = null
      this.currentChallengeIndex = 0
      this.pendingReward = null
      this.inventory = []
    },
  },
})
