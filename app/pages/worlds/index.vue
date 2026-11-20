<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'
import { useGameStore } from '~/stores/game'
import type { WorldSummaryResponse } from '~/types/api'

definePageMeta({
  middleware: ['auth'],
  requireProfile: true,
})

const authStore = useAuthStore()
const audioStore = useAudioStore()
const gameStore = useGameStore()

const showInventory = ref(false)
const showParentGate = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  try {
    await Promise.all([gameStore.fetchWorlds(), gameStore.fetchInventory()])
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.detail : 'Không thể tải danh sách vùng đất.'
  }
})

function worldTheme(code: string) {
  if (code.includes('con-so')) {
    return {
      gradient: 'from-sky-400 via-cyan-500 to-teal-600',
      emoji: '🔢',
    }
  }
  return {
    gradient: 'from-emerald-400 via-green-500 to-forest-700',
    emoji: '🌳',
  }
}

async function enterWorld(world: WorldSummaryResponse) {
  if (!world.is_unlocked) {
    audioStore.playSfx('wrong')
    return
  }
  await audioStore.unlockAudio()
  audioStore.playSfx('click')
  await navigateTo(`/play/${world.id}`)
}

async function handleSwitchProfile() {
  showParentGate.value = false
  await navigateTo('/profiles')
}

async function handleLogout() {
  showParentGate.value = false
  audioStore.stopBgm()
  gameStore.reset()
  await authStore.logout()
  await navigateTo('/login')
}
</script>

<template>
  <main
    class="min-h-screen w-full bg-gradient-to-b from-forest-800 via-emerald-800 to-forest-900 pb-12"
  >
    <!-- Top Bar -->
    <header class="safe-area-hud max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 pt-4 pb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-white flex items-center justify-center shadow-lg overflow-hidden"
        >
          <GameHeroPreview :gear="gameStore.equippedGear" compact />
        </div>
        <div class="text-white">
          <p class="text-xs font-bold text-emerald-200 uppercase">Nhà thám hiểm nhí</p>
          <h1 class="text-xl sm:text-2xl font-black text-amber-200">
            {{ authStore.activeProfile?.nickname || 'Bé yêu' }}
          </h1>
        </div>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <div
          v-if="authStore.activeProfile"
          class="flex items-center gap-3 bg-forest-900/80 border-2 border-amber-400/80 rounded-2xl px-4 py-2 text-white font-extrabold"
        >
          <span>🪙 <strong class="text-amber-300">{{ authStore.activeProfile.coins }}</strong></span>
          <span class="text-white/25">|</span>
          <span>⭐ <strong class="text-yellow-300">{{ authStore.activeProfile.total_stars }}</strong></span>
        </div>

        <button
          type="button"
          class="btn-kid-primary !min-h-[48px] !px-4 !text-base"
          @click="audioStore.playSfx('click'); showInventory = true"
        >
          <span>🎒 Túi đồ</span>
        </button>

        <button
          type="button"
          class="btn-kid-wood !min-h-[48px] !min-w-[48px] !px-3"
          @click="audioStore.toggleMute()"
        >
          <span class="text-2xl">{{ audioStore.muted ? '🔇' : '🔊' }}</span>
        </button>

        <button
          type="button"
          class="btn-kid-wood !min-h-[48px] !min-w-[48px] !px-3"
          title="Cài đặt phụ huynh"
          @click="audioStore.playSfx('click'); showParentGate = true"
        >
          <span class="text-xl">⚙️</span>
        </button>
      </div>
    </header>

    <section class="max-w-6xl mx-auto px-4">
      <div class="text-center mb-7">
        <h2 class="text-3xl sm:text-4xl font-black text-amber-200 drop-shadow">
          Chọn Vùng Đất Phiêu Lưu 🗺️
        </h2>
        <p class="text-emerald-100 font-bold mt-1">
          Hoàn thành hết các màn trong một vùng đất để mở khóa vùng đất tiếp theo!
        </p>
      </div>

      <div
        v-if="errorMessage"
        class="mb-6 p-4 rounded-2xl bg-rose-100 border-2 border-rose-400 text-rose-900 font-bold text-center"
      >
        {{ errorMessage }}
      </div>

      <div v-if="gameStore.loadingWorlds" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="n in 2"
          :key="n"
          class="h-72 rounded-3xl bg-forest-900/50 border-2 border-emerald-600/40 animate-pulse"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <article
          v-for="world in gameStore.worlds"
          :key="world.id"
          class="card-wood overflow-hidden flex flex-col transition-all"
          :class="
            world.is_unlocked
              ? 'hover:-translate-y-1 cursor-pointer'
              : 'opacity-80 grayscale-[0.4]'
          "
          @click="enterWorld(world)"
        >
          <!-- Banner -->
          <div
            class="h-44 p-5 flex flex-col justify-between relative bg-gradient-to-br text-white"
            :class="worldTheme(world.code).gradient"
          >
            <div class="flex items-center justify-between">
              <span
                class="px-3.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-xs font-extrabold uppercase tracking-wide"
              >
                Vùng đất {{ world.order_index }}
              </span>
              <span
                class="px-3.5 py-1 rounded-full font-extrabold text-sm"
                :class="
                  world.is_unlocked
                    ? 'bg-amber-300 text-amber-950'
                    : 'bg-slate-800/80 text-slate-200'
                "
              >
                {{ world.is_unlocked ? '✨ Đã mở khóa' : '🔒 Chưa mở khóa' }}
              </span>
            </div>

            <div class="flex items-end justify-between gap-3">
              <div>
                <h3 class="text-2xl sm:text-3xl font-black drop-shadow">{{ world.name }}</h3>
                <p class="text-sm font-bold text-white/90 line-clamp-2 mt-1">
                  {{ world.description }}
                </p>
              </div>
              <span class="text-6xl drop-shadow shrink-0">{{ worldTheme(world.code).emoji }}</span>
            </div>
          </div>

          <!-- Progress & CTA -->
          <div class="p-5 flex-1 flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm font-extrabold text-amber-950">
                <span>Tiến độ: {{ world.completed_stages }} / {{ world.total_stages }} màn</span>
                <span>⭐ {{ world.earned_stars }} / {{ world.max_stars }}</span>
              </div>
              <div class="w-full h-3.5 rounded-full bg-amber-200 overflow-hidden border border-amber-300">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                  :style="{
                    width: `${world.total_stages > 0 ? Math.round((world.completed_stages / world.total_stages) * 100) : 0}%`,
                  }"
                />
              </div>
            </div>

            <button
              type="button"
              :disabled="!world.is_unlocked"
              class="w-full"
              :class="world.is_unlocked ? 'btn-kid-green' : 'btn-kid-wood opacity-60'"
            >
              {{ world.is_unlocked ? 'Vào bản đồ phiêu lưu ▶' : 'Hoàn thành vùng đất trước để mở khóa 🔒' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <GameInventoryModal :visible="showInventory" @close="showInventory = false" />

    <ParentGateModal
      :visible="showParentGate"
      @close="showParentGate = false"
      @switch-profile="handleSwitchProfile"
      @go-worlds="showParentGate = false"
      @logout="handleLogout"
    />
  </main>
</template>
