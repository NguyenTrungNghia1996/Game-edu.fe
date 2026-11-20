<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAudioStore } from '~/stores/audio'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'switch-profile'): void
  (e: 'go-worlds'): void
  (e: 'logout'): void
}>()

const audioStore = useAudioStore()

const unlocked = ref(false)
const questionText = ref('')
const expectedAnswer = ref(0)
const userAnswer = ref<string | number>('')
const wrongGate = ref(false)

function generateMathChallenge(resetError = true) {
  const isMultiply = Math.random() > 0.5
  if (isMultiply) {
    const a = Math.floor(Math.random() * 7) + 4 // 4..10
    const b = Math.floor(Math.random() * 7) + 4 // 4..10
    questionText.value = `${a} × ${b} = ?`
    expectedAnswer.value = a * b
  } else {
    const a = Math.floor(Math.random() * 35) + 15 // 15..49
    const b = Math.floor(Math.random() * 35) + 12 // 12..46
    questionText.value = `${a} + ${b} = ?`
    expectedAnswer.value = a + b
  }
  userAnswer.value = ''
  if (resetError) {
    wrongGate.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      unlocked.value = false
      generateMathChallenge(true)
    }
  },
)

function verifyGate() {
  const parsed = Number(String(userAnswer.value ?? '').trim())
  if (!Number.isNaN(parsed) && String(userAnswer.value ?? '').trim() !== '' && parsed === expectedAnswer.value) {
    audioStore.initVoices()
    unlocked.value = true
    wrongGate.value = false
  } else {
    wrongGate.value = true
    generateMathChallenge(false)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="props.visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm"
      >
        <div class="card-wood w-full max-w-md p-6 animate-pop">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-black text-amber-950">
              {{ unlocked ? '⚙️ Cài Đặt Phụ Huynh' : '🔐 Cổng Dành Cho Phụ Huynh' }}
            </h2>
            <button
              type="button"
              class="w-10 h-10 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-950 font-black"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- Step 1: Parent Gate Math Verification -->
          <form v-if="!unlocked" class="space-y-4" @submit.prevent="verifyGate">
            <p class="text-sm font-bold text-slate-700">
              Vui lòng giải phép tính sau để xác nhận bạn là phụ huynh:
            </p>

            <div
              class="py-4 px-5 rounded-2xl bg-white border-2 border-amber-300 text-center text-3xl font-black text-forest-800"
            >
              {{ questionText }}
            </div>

            <input
              v-model="userAnswer"
              type="number"
              inputmode="numeric"
              placeholder="Nhập kết quả..."
              class="w-full px-4 py-3.5 rounded-2xl border-2 border-amber-400 bg-white text-xl font-extrabold text-center focus:outline-none focus:ring-4 focus:ring-amber-300"
              required
            />

            <p v-if="wrongGate" class="text-sm font-bold text-rose-600 text-center">
              Kết quả chưa chính xác, vui lòng thử phép tính mới.
            </p>

            <button type="submit" class="btn-kid-green w-full">
              Mở khóa cài đặt
            </button>
          </form>

          <!-- Step 2: Unlocked Parent Settings -->
          <div v-else class="space-y-5">
            <div class="space-y-3 bg-white p-4 rounded-2xl border-2 border-amber-200">
              <div>
                <div class="flex justify-between text-sm font-extrabold text-slate-700 mb-1">
                  <span>🎵 Nhạc nền</span>
                  <span>{{ Math.round(audioStore.bgmVolume * 100) }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="audioStore.bgmVolume"
                  class="w-full accent-emerald-600"
                  @input="audioStore.setBgmVolume(Number(($event.target as HTMLInputElement).value))"
                />
              </div>

              <div>
                <div class="flex justify-between text-sm font-extrabold text-slate-700 mb-1">
                  <span>🗣️ Giọng đọc tiếng Việt</span>
                  <span>{{ Math.round(audioStore.voiceVolume * 100) }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="audioStore.voiceVolume"
                  class="w-full accent-sky-600"
                  @input="audioStore.setVoiceVolume(Number(($event.target as HTMLInputElement).value))"
                />
              </div>

              <div>
                <div class="flex justify-between text-sm font-extrabold text-slate-700 mb-1">
                  <span>🐢 Tốc độ đọc</span>
                  <span>{{ audioStore.voiceRate.toFixed(2) }}x</span>
                </div>
                <input
                  type="range"
                  min="0.65"
                  max="1.2"
                  step="0.05"
                  :value="audioStore.voiceRate"
                  class="w-full accent-sky-600"
                  @input="audioStore.setVoiceRate(Number(($event.target as HTMLInputElement).value))"
                />
              </div>

              <div v-if="audioStore.availableVietnameseVoices.length > 0">
                <label class="block text-sm font-extrabold text-slate-700 mb-1" for="vi-voice">
                  🎙️ Chọn giọng đọc tiếng Việt
                </label>
                <select
                  id="vi-voice"
                  :value="audioStore.selectedVoiceURI"
                  class="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-sm font-bold text-slate-800"
                  @change="audioStore.setSelectedVoiceURI(($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="v in audioStore.availableVietnameseVoices"
                    :key="v.voiceURI"
                    :value="v.voiceURI"
                  >
                    {{ v.name }} ({{ v.lang }})
                  </option>
                </select>
              </div>

              <button
                type="button"
                class="w-full py-2 px-3 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-extrabold text-sm transition"
                @click="audioStore.speakVietnamese('Xin chào bé! Chào mừng bé đến với Rừng Chữ Cái!')"
              >
                🔊 Nghe thử giọng đọc tiếng Việt
              </button>

              <div>
                <div class="flex justify-between text-sm font-extrabold text-slate-700 mb-1">
                  <span>✨ Hiệu ứng âm thanh</span>
                  <span>{{ Math.round(audioStore.sfxVolume * 100) }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="audioStore.sfxVolume"
                  class="w-full accent-amber-500"
                  @input="audioStore.setSfxVolume(Number(($event.target as HTMLInputElement).value))"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                class="btn-kid-wood w-full !min-h-[48px] !text-base"
                @click="emit('switch-profile')"
              >
                👧 Đổi hồ sơ bé
              </button>
              <button
                type="button"
                class="btn-kid-wood w-full !min-h-[48px] !text-base"
                @click="emit('go-worlds')"
              >
                🗺️ Chọn vùng đất khác
              </button>
              <button
                type="button"
                class="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-800 border-2 border-rose-300 font-extrabold text-base transition"
                @click="emit('logout')"
              >
                🚪 Đăng xuất tài khoản phụ huynh
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
