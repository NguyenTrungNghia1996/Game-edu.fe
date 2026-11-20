<script setup lang="ts">
import { ref } from 'vue'
import { ApiError } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'

const authStore = useAuthStore()
const audioStore = useAudioStore()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const errorMessage = ref('')

function fillDemoParent() {
  mode.value = 'login'
  email.value = 'parent@edugame.local'
  password.value = 'Parent123!'
  errorMessage.value = ''
}

async function handleSubmit() {
  errorMessage.value = ''
  await audioStore.unlockAudio()
  audioStore.playSfx('click')

  try {
    if (mode.value === 'login') {
      await authStore.login(email.value.trim(), password.value)
    } else {
      await authStore.register(email.value.trim(), password.value)
    }

    if (authStore.profiles.length === 1 && !authStore.activeProfileId) {
      await authStore.selectProfile(authStore.profiles[0]!.id)
    }

    await navigateTo('/profiles')
  } catch (err) {
    if (err instanceof ApiError) {
      errorMessage.value = err.detail
    } else {
      errorMessage.value = 'Không thể kết nối máy chủ. Vui lòng kiểm tra Backend API.'
    }
  }
}
</script>

<template>
  <main
    class="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-forest-800 via-emerald-700 to-forest-900"
  >
    <div class="card-wood w-full max-w-md p-6 sm:p-8 animate-pop">
      <div class="text-center mb-6">
        <div class="text-4xl mb-2">🌳</div>
        <h1 class="text-2xl sm:text-3xl font-black text-forest-800">
          Tài Khoản Phụ Huynh
        </h1>
        <p class="text-sm font-bold text-amber-800 mt-1">
          Đăng nhập để đồng bộ tiến trình học tập của bé trên mọi thiết bị
        </p>
      </div>

      <!-- Mode Switcher -->
      <div class="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-amber-100 border border-amber-300 mb-5">
        <button
          type="button"
          class="py-2.5 rounded-xl font-extrabold text-sm transition"
          :class="
            mode === 'login'
              ? 'bg-white text-forest-800 shadow'
              : 'text-amber-900/75 hover:text-amber-950'
          "
          @click="mode = 'login'; errorMessage = ''"
        >
          Đăng nhập
        </button>
        <button
          type="button"
          class="py-2.5 rounded-xl font-extrabold text-sm transition"
          :class="
            mode === 'register'
              ? 'bg-white text-forest-800 shadow'
              : 'text-amber-900/75 hover:text-amber-950'
          "
          @click="mode = 'register'; errorMessage = ''"
        >
          Đăng ký mới
        </button>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-sm font-extrabold text-amber-950 mb-1.5" for="email">
            Email phụ huynh
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="parent@edugame.local"
            required
            class="w-full px-4 py-3 rounded-2xl border-2 border-amber-300 bg-white font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label class="block text-sm font-extrabold text-amber-950 mb-1.5" for="password">
            Mật khẩu
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
            minlength="6"
            required
            class="w-full px-4 py-3 rounded-2xl border-2 border-amber-300 bg-white font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200"
          />
        </div>

        <div
          v-if="errorMessage"
          class="p-3 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-800 text-sm font-bold"
        >
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="authStore.loading"
          class="btn-kid-green w-full"
        >
          {{
            authStore.loading
              ? 'Đang xử lý...'
              : mode === 'login'
                ? 'Đăng nhập ngay'
                : 'Tạo tài khoản phụ huynh'
          }}
        </button>
      </form>

      <!-- Demo quick fill -->
      <div class="mt-5 pt-4 border-t border-amber-200 text-center space-y-2">
        <button
          type="button"
          class="text-xs font-extrabold text-emerald-700 hover:text-emerald-900 underline"
          @click="fillDemoParent"
        >
          Dùng tài khoản demo (parent@edugame.local / Parent123!)
        </button>
        <div>
          <NuxtLink to="/" class="text-xs font-bold text-amber-800 hover:underline">
            ← Quay lại màn hình chào
          </NuxtLink>
        </div>
      </div>
    </div>
  </main>
</template>
