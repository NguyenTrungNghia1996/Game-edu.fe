<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError } from '~/services/api'
import { getPublicRuntimeConfig } from '~/services/runtimeConfig'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'
import { useGameStore } from '~/stores/game'

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()
const audioStore = useAudioStore()
const gameStore = useGameStore()

const showCreateForm = ref(false)
const newNickname = ref('')
const selectedAvatar = ref('boy_01')
const creating = ref(false)
const errorMessage = ref('')

const avatarChoices = [
  { id: 'boy_01', emoji: '👦', label: 'Bé Trai' },
  { id: 'girl_01', emoji: '👧', label: 'Bé Gái' },
  { id: 'fox_01', emoji: '🦊', label: 'Cáo Nhỏ' },
  { id: 'panda_01', emoji: '🐼', label: 'Gấu Trúc' },
]

function avatarEmojiForUrl(url?: string): string {
  if (!url) return '🧒'
  if (url.includes('girl')) return '👧'
  if (url.includes('fox')) return '🦊'
  if (url.includes('panda')) return '🐼'
  return '👦'
}

onMounted(async () => {
  try {
    await authStore.fetchProfiles()
    if (authStore.profiles.length === 0) {
      showCreateForm.value = true
    }
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.detail : 'Không thể tải danh sách hồ sơ bé.'
  }
})

async function handleSelectProfile(profileId: string) {
  await audioStore.unlockAudio()
  audioStore.playSfx('click')
  gameStore.reset()
  await authStore.selectProfile(profileId)
  await navigateTo('/worlds')
}

async function handleCreateProfile() {
  const nickname = newNickname.value.trim()
  if (!nickname) return
  creating.value = true
  errorMessage.value = ''

  try {
    const cdn = getPublicRuntimeConfig().assetCdnUrl
    await authStore.createProfile({
      nickname,
      avatar_url: `${cdn}/avatars/${selectedAvatar.value}.webp`,
    })
    newNickname.value = ''
    showCreateForm.value = false
    audioStore.playSfx('correct')
    await navigateTo('/worlds')
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.detail : 'Không thể tạo hồ sơ mới.'
  } finally {
    creating.value = false
  }
}

async function handleLogout() {
  audioStore.stopBgm()
  gameStore.reset()
  await authStore.logout()
  await navigateTo('/login')
}
</script>

<template>
  <main
    class="min-h-screen w-full p-4 sm:p-8 bg-gradient-to-b from-forest-800 via-emerald-700 to-forest-900 flex flex-col items-center justify-center"
  >
    <div class="w-full max-w-4xl">
      <div class="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl sm:text-4xl font-black text-amber-200 drop-shadow">
            Ai đang phiêu lưu hôm nay? 🌟
          </h1>
          <p class="text-sm sm:text-base font-bold text-emerald-100 mt-1">
            Chọn hồ sơ của bé hoặc tạo thêm hồ sơ mới
          </p>
        </div>

        <button
          type="button"
          class="btn-kid-wood !min-h-[46px] !px-4 !text-sm"
          @click="handleLogout"
        >
          🚪 Đăng xuất
        </button>
      </div>

      <div
        v-if="errorMessage"
        class="mb-4 p-4 rounded-2xl bg-rose-100 border-2 border-rose-400 text-rose-900 font-bold text-sm"
      >
        {{ errorMessage }}
      </div>

      <!-- Profile Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <button
          v-for="profile in authStore.profiles"
          :key="profile.id"
          type="button"
          class="card-wood p-6 text-center hover:-translate-y-1 transition-all cursor-pointer group"
          @click="handleSelectProfile(profile.id)"
        >
          <div
            class="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 border-4 border-white shadow-lg flex items-center justify-center text-5xl group-hover:scale-105 transition"
          >
            {{ avatarEmojiForUrl(profile.avatar_url) }}
          </div>
          <h2 class="text-2xl font-black text-forest-800 mb-2">{{ profile.nickname }}</h2>
          <div class="flex items-center justify-center gap-4 text-sm font-extrabold">
            <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              🪙 {{ profile.coins }}
            </span>
            <span class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300">
              ⭐ {{ profile.total_stars }}
            </span>
          </div>
        </button>

        <!-- Add New Profile Card -->
        <button
          type="button"
          class="rounded-3xl border-4 border-dashed border-amber-300/80 bg-forest-900/45 hover:bg-forest-900/65 p-6 text-center text-amber-100 flex flex-col items-center justify-center min-h-[210px] transition cursor-pointer"
          @click="showCreateForm = !showCreateForm"
        >
          <span class="text-5xl mb-2">➕</span>
          <span class="text-xl font-black">Thêm hồ sơ bé</span>
        </button>
      </div>

      <!-- Create Profile Form -->
      <form
        v-if="showCreateForm"
        class="card-wood p-6 max-w-xl mx-auto space-y-4 animate-pop"
        @submit.prevent="handleCreateProfile"
      >
        <h3 class="text-xl font-black text-forest-800">Tạo hồ sơ mới cho bé</h3>

        <div>
          <label class="block text-sm font-extrabold text-amber-950 mb-1.5" for="nickname">
            Tên gọi của bé
          </label>
          <input
            id="nickname"
            v-model="newNickname"
            type="text"
            maxlength="40"
            placeholder="VD: Bé Bông, Bé Na..."
            required
            class="w-full px-4 py-3 rounded-2xl border-2 border-amber-300 bg-white font-bold text-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <p class="text-sm font-extrabold text-amber-950 mb-2">Chọn hình đại diện</p>
          <div class="grid grid-cols-4 gap-2.5">
            <button
              v-for="av in avatarChoices"
              :key="av.id"
              type="button"
              class="p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition"
              :class="
                selectedAvatar === av.id
                  ? 'bg-amber-200 border-emerald-600 scale-105 shadow'
                  : 'bg-white border-amber-200 hover:bg-amber-50'
              "
              @click="selectedAvatar = av.id"
            >
              <span class="text-3xl">{{ av.emoji }}</span>
              <span class="text-xs font-extrabold text-amber-950">{{ av.label }}</span>
            </button>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button type="submit" :disabled="creating" class="btn-kid-green flex-1">
            {{ creating ? 'Đang tạo...' : 'Tạo hồ sơ & Bắt đầu' }}
          </button>
          <button
            v-if="authStore.profiles.length > 0"
            type="button"
            class="btn-kid-wood"
            @click="showCreateForm = false"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  </main>
</template>
