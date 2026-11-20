<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'

const authStore = useAuthStore()
const audioStore = useAudioStore()
const starting = ref(false)

async function handleStartAdventure() {
  starting.value = true
  try {
    // Kích hoạt AudioContext theo yêu cầu Safari / iOS WebView trước khi vào game
    await audioStore.unlockAudio()
    audioStore.playSfx('correct')

    if (!authStore.hydrated) {
      await authStore.hydrate()
    }

    if (!authStore.isAuthenticated) {
      await navigateTo('/login')
      return
    }

    if (!authStore.activeProfileId) {
      await navigateTo('/profiles')
      return
    }

    await navigateTo('/worlds')
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <main
    class="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-b from-sky-300 via-emerald-300 to-forest-800"
  >
    <!-- Decorative floating clouds & fireflies -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute top-10 left-[8%] w-36 h-12 rounded-full bg-white/60 blur-[1px] animate-float" />
      <div
        class="absolute top-20 right-[12%] w-44 h-14 rounded-full bg-white/55 blur-[1px] animate-float"
        style="animation-delay: 1.2s"
      />
      <div class="absolute -bottom-24 -left-16 w-96 h-96 rounded-full bg-emerald-600/50" />
      <div class="absolute -bottom-28 -right-12 w-[28rem] h-[28rem] rounded-full bg-forest-900/45" />
    </div>

    <div class="relative z-10 w-full max-w-xl text-center card-wood p-7 sm:p-10 animate-pop">
      <div class="flex justify-center mb-4">
        <img
          src="/assets/logo.svg"
          alt="Rừng Chữ Cái"
          class="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl shadow-xl border-4 border-amber-300 animate-float"
        />
      </div>

      <span
        class="inline-block px-4 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs sm:text-sm uppercase tracking-wider border border-emerald-300 mb-3"
      >
        Game Giáo Dục Phiêu Lưu
      </span>

      <h1 class="text-4xl sm:text-5xl font-black text-forest-800 tracking-tight mb-3">
        Rừng Chữ Cái
      </h1>

      <p class="text-base sm:text-lg font-bold text-amber-900/90 max-w-md mx-auto mb-7 leading-relaxed">
        Cùng nhà thám hiểm nhí sửa cây cầu gỗ, giải mã cổng dây leo và sưu tầm kho báu tiếng Việt kỳ diệu!
      </p>

      <div class="flex flex-col items-center gap-3">
        <button
          type="button"
          :disabled="starting"
          class="btn-kid-primary w-full sm:w-auto sm:min-w-[280px] !text-xl !py-4"
          @click="handleStartAdventure"
        >
          <span>{{ starting ? 'Đang chuẩn bị...' : 'Bắt đầu phiêu lưu' }}</span>
          <span class="text-2xl">🚀</span>
        </button>

        <p class="text-xs font-bold text-amber-800/80">
          Chạm nút để bật âm thanh sống động cho bé 🔊
        </p>
      </div>
    </div>
  </main>
</template>
