<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'
import { useGameStore } from '~/stores/game'

const props = defineProps<{
  worldName?: string
  inStage?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'open-inventory'): void
  (e: 'open-parent-gate'): void
}>()

const authStore = useAuthStore()
const audioStore = useAudioStore()
const gameStore = useGameStore()

const profile = computed(() => authStore.activeProfile)
const inventoryCount = computed(() => gameStore.inventory.length)

function onBackClick() {
  audioStore.playSfx('click')
  emit('back')
}

function onInventoryClick() {
  audioStore.playSfx('click')
  emit('open-inventory')
}

function onToggleMute() {
  void audioStore.toggleMute()
}

function onParentGateClick() {
  audioStore.playSfx('click')
  emit('open-parent-gate')
}
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-20 pointer-events-none safe-area-hud"
  >
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
      <!-- Left: Back button + Profile / World info -->
      <div class="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          class="btn-kid-wood !min-h-[48px] !px-4 !py-2 !text-base"
          @click="onBackClick"
        >
          <span class="text-xl leading-none">⬅</span>
          <span>{{ props.inStage ? 'Bản đồ' : 'Vùng đất' }}</span>
        </button>

        <div
          v-if="profile"
          class="hidden sm:flex items-center gap-2.5 bg-forest-900/85 backdrop-blur-md text-amber-50 border-2 border-amber-400/80 rounded-2xl px-3.5 py-1.5 shadow-lg"
        >
          <div
            class="w-10 h-10 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center overflow-hidden shrink-0"
          >
            <GameHeroPreview :gear="gameStore.equippedGear" compact />
          </div>
          <div class="leading-tight">
            <div class="font-extrabold text-sm text-amber-200">{{ profile.nickname }}</div>
            <div v-if="props.worldName" class="text-xs text-emerald-200/90 font-semibold">
              {{ props.worldName }}
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Coins, Stars, Inventory, Audio, Parent Gate -->
      <div class="flex items-center gap-2 pointer-events-auto">
        <div
          v-if="profile"
          class="flex items-center gap-3 bg-forest-900/85 backdrop-blur-md border-2 border-amber-400/80 rounded-2xl px-3.5 py-2 shadow-lg text-white font-extrabold text-base"
        >
          <div class="flex items-center gap-1.5" title="Xu vàng">
            <span class="text-xl">🪙</span>
            <span class="text-amber-300">{{ profile.coins }}</span>
          </div>
          <div class="w-px h-5 bg-white/20" />
          <div class="flex items-center gap-1.5" title="Tổng số sao">
            <span class="text-xl">⭐</span>
            <span class="text-yellow-300">{{ profile.total_stars }}</span>
          </div>
        </div>

        <button
          type="button"
          class="btn-kid-primary !min-h-[48px] !px-4 !py-2 !text-base relative"
          title="Túi đồ"
          @click="onInventoryClick"
        >
          <span class="text-xl leading-none">🎒</span>
          <span class="hidden md:inline">Túi đồ</span>
          <span
            v-if="inventoryCount > 0"
            class="ml-0.5 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 text-xs font-black rounded-full bg-emerald-600 text-white"
          >
            {{ inventoryCount }}
          </span>
        </button>

        <button
          type="button"
          class="btn-kid-wood !min-h-[48px] !min-w-[48px] !px-3 !py-2"
          :title="audioStore.muted ? 'Bật âm thanh' : 'Tắt âm thanh'"
          @click="onToggleMute"
        >
          <span class="text-2xl leading-none">{{ audioStore.muted ? '🔇' : '🔊' }}</span>
        </button>

        <button
          type="button"
          class="btn-kid-wood !min-h-[48px] !min-w-[48px] !px-3 !py-2"
          title="Cài đặt phụ huynh"
          @click="onParentGateClick"
        >
          <span class="text-xl leading-none">⚙️</span>
        </button>
      </div>
    </div>
  </header>
</template>
