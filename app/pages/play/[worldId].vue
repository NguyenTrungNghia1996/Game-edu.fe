<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gameEventBus } from '~/game/eventBus'
import type { WorldMapSceneData } from '~/game/types'
import { ApiError } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'
import { useGameStore } from '~/stores/game'
import type ChallengeModalComponent from '~/components/game/ChallengeModal.vue'

definePageMeta({
  middleware: ['auth'],
  requireProfile: true,
})

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const audioStore = useAudioStore()
const gameStore = useGameStore()

const worldId = computed(() => String(route.params.worldId || ''))
const assetCdnUrl = computed(() => (config.public.assetCdnUrl as string).replace(/\/+$/, ''))

const phaserReady = ref(false)
const inStage = ref(false)
const showChallengeModal = ref(false)
const showRewardModal = ref(false)
const showInventoryModal = ref(false)
const showParentGateModal = ref(false)
const challengeError = ref('')
const pageError = ref('')

const challengeModalRef = ref<InstanceType<typeof ChallengeModalComponent> | null>(null)

function buildWorldSceneData(): WorldMapSceneData | null {
  const map = gameStore.currentWorldMap
  if (!map) return null
  return {
    worldId: map.world.id,
    worldCode: map.world.code,
    worldName: map.world.name,
    mapBgUrl: map.world.map_bg_url,
    assetCdnUrl: assetCdnUrl.value,
    equippedGear: gameStore.equippedGear,
    stages: map.stages.map((st) => ({
      id: st.id,
      order_index: st.order_index,
      name: st.name,
      obstacle_type: st.obstacle_type,
      pos_x: st.pos_x,
      pos_y: st.pos_y,
      status: st.status,
      stars: st.stars,
    })),
  }
}

function pushWorldToPhaser() {
  if (!phaserReady.value) return
  const payload = buildWorldSceneData()
  if (payload) {
    gameEventBus.emit('game:load-world', payload)
  }
}

async function loadWorld(id: string) {
  pageError.value = ''
  inStage.value = false
  showChallengeModal.value = false
  showRewardModal.value = false
  gameStore.clearActiveAttempt()
  gameStore.clearPendingReward()

  let map
  try {
    map = await gameStore.fetchWorldMap(id)
  } catch (err) {
    console.error('[loadWorld] fetchWorldMap failed:', err)
    pageError.value =
      err instanceof ApiError ? err.detail : 'Không thể tải dữ liệu bản đồ vùng đất.'
    return
  }

  // Tải túi đồ độc lập để không chặn hiển thị bản đồ nếu lỗi phụ
  void gameStore.fetchInventory().catch(() => {})

  if (map.world.bgm_url) {
    audioStore.playBgm(map.world.bgm_url)
  }
  pushWorldToPhaser()
}

function onGameReady() {
  phaserReady.value = true
  gameEventBus.emit('audio:toggle-mute', { muted: audioStore.muted })
  pushWorldToPhaser()
}

// 1. Bé chọn 1 màn trên WorldMapScene -> chuyển sang StageScene
function handleWorldSelectStage({ stageId }: { stageId: string }) {
  const node = gameStore.stages.find((s) => s.id === stageId)
  if (!node) return

  audioStore.playSfx('click')
  inStage.value = true
  showChallengeModal.value = false
  showRewardModal.value = false
  challengeError.value = ''

  gameEventBus.emit('game:enter-stage', {
    stageId: node.id,
    stageName: node.name,
    obstacleType: node.obstacle_type,
    worldCode: gameStore.currentWorldMap?.world.code,
    assetCdnUrl: assetCdnUrl.value,
    equippedGear: gameStore.equippedGear,
    worldData: buildWorldSceneData(),
  })
}

// 2. Nhân vật đi tới sát cây cầu gãy / chướng ngại vật -> gọi POST /stages/:stageId/start & mở ChallengeModal
async function handleReachedObstacle({ stageId }: { stageId: string; obstacleType: string }) {
  challengeError.value = ''
  try {
    await gameStore.startStage(stageId)
    showChallengeModal.value = true
  } catch (err) {
    challengeError.value =
      err instanceof ApiError ? err.detail : 'Không thể bắt đầu màn chơi lúc này.'
    showChallengeModal.value = true
  }
}

// 3. Bé chọn đáp án trong ChallengeModal -> gọi POST /stages/:stageId/submit
async function handleSubmitAnswer(answer: string | Record<string, string>) {
  const attempt = gameStore.activeAttempt
  const challenge = gameStore.currentChallenge
  if (!attempt || !challenge) return

  challengeError.value = ''
  try {
    const resp = await gameStore.submitAnswer(attempt.stage.id, challenge.id, answer)

    if (!resp.is_correct) {
      gameEventBus.emit('challenge:answered-wrong', { stageId: attempt.stage.id })
      challengeModalRef.value?.showWrongFeedback(
        resp,
        typeof answer === 'string' ? answer : undefined,
      )
      return
    }

    audioStore.playSfx('correct')

    if (resp.stage_completed) {
      audioStore.stopVoice()
      showChallengeModal.value = false
      audioStore.playSfx('hammer')
      gameEventBus.emit('challenge:answered-correct', { stageId: attempt.stage.id })
    }
  } catch (err) {
    challengeError.value =
      err instanceof ApiError ? err.detail : 'Lỗi gửi đáp án. Bé thử bấm lại nhé!'
  }
}

// 4. StageScene hoàn thành animation sửa cầu & chạy qua bờ bên kia -> mở RewardModal
function handleStageCompletedAnimation({ stageId }: { stageId: string }) {
  if (gameStore.pendingReward?.stageId === stageId) {
    showRewardModal.value = true
  }
}

async function handleReturnToMap() {
  audioStore.stopVoice()
  showChallengeModal.value = false
  showRewardModal.value = false
  inStage.value = false
  gameStore.clearActiveAttempt()
  gameStore.clearPendingReward()

  if (worldId.value) {
    try {
      await gameStore.fetchWorldMap(worldId.value)
    } catch {
      // keep existing map if offline
    }
  }

  gameEventBus.emit('game:return-to-map', {
    worldData: buildWorldSceneData(),
  })
}

async function handleHudBack() {
  if (inStage.value) {
    await handleReturnToMap()
  } else {
    await navigateTo('/worlds')
  }
}

async function handleNextStage(nextStageId: string) {
  audioStore.stopVoice()
  audioStore.playSfx('click')
  showRewardModal.value = false
  showChallengeModal.value = false
  challengeError.value = ''
  gameStore.clearActiveAttempt()
  gameStore.clearPendingReward()
  if (worldId.value) {
    try {
      await gameStore.fetchWorldMap(worldId.value)
    } catch {
      // ignore
    }
  }

  const nextNode = gameStore.stages.find((s) => s.id === nextStageId)
  if (!nextNode) {
    await handleReturnToMap()
    return
  }

  inStage.value = true
  gameEventBus.emit('game:enter-stage', {
    stageId: nextNode.id,
    stageName: nextNode.name,
    obstacleType: nextNode.obstacle_type,
    worldCode: gameStore.currentWorldMap?.world.code,
    assetCdnUrl: assetCdnUrl.value,
    equippedGear: gameStore.equippedGear,
    worldData: buildWorldSceneData(),
  })
}

async function handleNextWorld(nextWorldId: string) {
  showRewardModal.value = false
  gameStore.clearPendingReward()
  await navigateTo(`/play/${nextWorldId}`)
}

async function handleSwitchProfile() {
  showParentGateModal.value = false
  await navigateTo('/profiles')
}

async function handleGoWorlds() {
  showParentGateModal.value = false
  await navigateTo('/worlds')
}

async function handleLogout() {
  showParentGateModal.value = false
  audioStore.stopBgm()
  audioStore.stopVoice()
  gameStore.reset()
  await authStore.logout()
  await navigateTo('/login')
}

onMounted(() => {
  gameEventBus.on('world:select-stage', handleWorldSelectStage)
  gameEventBus.on('stage:reached-obstacle', handleReachedObstacle)
  gameEventBus.on('stage:completed-animation', handleStageCompletedAnimation)

  if (worldId.value) {
    void loadWorld(worldId.value)
  }
})

watch(worldId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    void loadWorld(newId)
  }
})

onBeforeUnmount(() => {
  gameEventBus.off('world:select-stage', handleWorldSelectStage)
  gameEventBus.off('stage:reached-obstacle', handleReachedObstacle)
  gameEventBus.off('stage:completed-animation', handleStageCompletedAnimation)
  audioStore.stopVoice()
  audioStore.stopBgm()
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden bg-forest-900 select-none">
    <!-- LỚP DƯỚI: Phaser 3 Canvas Engine -->
    <GamePhaserCanvas @ready="onGameReady" />

    <!-- LỚP TRÊN: Vue 3 / Nuxt 4 Overlay HUD -->
    <GameWorldHud
      :world-name="gameStore.currentWorldMap?.world.name"
      :in-stage="inStage"
      @back="handleHudBack"
      @open-inventory="showInventoryModal = true"
      @open-parent-gate="showParentGateModal = true"
    />

    <!-- Loading / Error Banner -->
    <div
      v-if="gameStore.loadingMap || pageError"
      class="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-none"
    >
      <div
        v-if="pageError"
        class="card-wood p-6 max-w-md text-center pointer-events-auto space-y-4"
      >
        <p class="font-extrabold text-rose-700 text-lg">{{ pageError }}</p>
        <div class="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button type="button" class="btn-kid-green" @click="loadWorld(worldId)">
            Thử tải lại 🔄
          </button>
          <button type="button" class="btn-kid-primary" @click="navigateTo('/worlds')">
            Quay lại danh sách vùng đất
          </button>
        </div>
      </div>
      <div
        v-else
        class="px-6 py-3 rounded-2xl bg-forest-900/90 border-2 border-amber-400 text-amber-200 font-extrabold shadow-xl"
      >
        Đang tải bản đồ phiêu lưu...
      </div>
    </div>

    <!-- Bottom Helpful Hint Pill on Map -->
    <div
      v-if="!inStage && !gameStore.loadingMap && !pageError"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none safe-area-bottom"
    >
      <div
        class="px-5 py-2 rounded-full bg-forest-900/85 border-2 border-amber-400/80 text-amber-100 font-extrabold text-sm sm:text-base shadow-lg backdrop-blur-sm whitespace-nowrap"
      >
        👆 Bé hãy chạm vào màn chơi đang phát sáng để bắt đầu!
      </div>
    </div>

    <!-- Popup Thử Thách (Trắc nghiệm / Nghe chọn / Kéo thả) -->
    <GameChallengeModal
      ref="challengeModalRef"
      :visible="showChallengeModal"
      :stage-name="gameStore.activeAttempt?.stage.name || ''"
      :challenge="gameStore.currentChallenge"
      :challenge-index="gameStore.currentChallengeIndex"
      :total-challenges="gameStore.activeAttempt?.challenges.length || 1"
      :submitting="gameStore.submittingAnswer"
      :error-message="challengeError"
      @submit="handleSubmitAnswer"
      @close="handleReturnToMap"
    />

    <!-- Popup Mở Rương Phần Thưởng -->
    <GameRewardModal
      :visible="showRewardModal"
      :reward="gameStore.pendingReward"
      @next-stage="handleNextStage"
      @next-world="handleNextWorld"
      @back-to-map="handleReturnToMap"
    />

    <!-- Túi Đồ & Mặc Trang Bị -->
    <GameInventoryModal
      :visible="showInventoryModal"
      @close="showInventoryModal = false"
    />

    <!-- Cổng Phụ Huynh -->
    <ParentGateModal
      :visible="showParentGateModal"
      @close="showParentGateModal = false"
      @switch-profile="handleSwitchProfile"
      @go-worlds="handleGoWorlds"
      @logout="handleLogout"
    />
  </div>
</template>
