<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAudioStore } from '~/stores/audio'
import type { PendingStageReward } from '~/stores/game'

const props = defineProps<{
  visible: boolean
  reward: PendingStageReward | null
}>()

const emit = defineEmits<{
  (e: 'next-stage', stageId: string): void
  (e: 'next-world', worldId: string): void
  (e: 'back-to-map'): void
}>()

const audioStore = useAudioStore()
const brokenItemImg = ref(false)

watch(
  () => props.visible,
  (visible) => {
    brokenItemImg.value = false
    if (visible && props.reward) {
      audioStore.playSfx('reward')
      const speech = props.reward.explanation
        ? `Bé giỏi quá! ${props.reward.explanation}`
        : `Bé giỏi quá! Bé đã hoàn thành màn ${props.reward.stageName}!`
      void audioStore.speakVietnamese(speech)
    }
  },
)

function replayExplanation() {
  if (!props.reward) return
  const speech = props.reward.explanation
    ? `Bé giỏi quá! ${props.reward.explanation}`
    : `Bé giỏi quá! Bé đã hoàn thành màn ${props.reward.stageName}!`
  void audioStore.speakVietnamese(speech)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="props.visible && props.reward"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/75 backdrop-blur-sm"
      >
        <div
          class="card-wood w-full max-w-lg p-6 sm:p-8 text-center animate-pop relative overflow-hidden"
        >
          <!-- Celebratory Banner -->
          <div class="text-5xl mb-2 animate-float">🎉</div>
          <h2 class="text-2xl sm:text-3xl font-black text-emerald-700 mb-1">
            Bé Giỏi Quá!
          </h2>
          <p class="text-amber-800 font-bold text-base mb-4">
            Hoàn thành: {{ props.reward.stageName }}
          </p>

          <!-- Stars Display -->
          <div class="flex items-center justify-center gap-3 mb-5">
            <span
              v-for="n in 3"
              :key="n"
              class="text-5xl transition-transform duration-300"
              :class="
                n <= props.reward.starsEarned
                  ? 'scale-110 drop-shadow-md'
                  : 'opacity-30 grayscale scale-95'
              "
            >
              ⭐
            </span>
          </div>

          <!-- Explanation Box -->
          <div
            v-if="props.reward.explanation"
            class="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 mb-5 text-emerald-900 font-bold text-sm sm:text-base flex items-center justify-between gap-3 text-left"
          >
            <span>{{ props.reward.explanation }}</span>
            <button
              type="button"
              class="w-10 h-10 rounded-xl bg-emerald-200 hover:bg-emerald-300 text-emerald-900 flex items-center justify-center text-lg shrink-0"
              title="Nghe lại lời giải thích"
              @click="replayExplanation"
            >
              🔊
            </button>
          </div>

          <!-- Rewards Summary -->
          <div class="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div
              class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-100 border-2 border-amber-400 font-black text-amber-900 text-lg"
            >
              <span class="text-2xl">🪙</span>
              <span v-if="props.reward.coinsEarned > 0">+{{ props.reward.coinsEarned }} xu</span>
              <span v-else class="text-sm font-extrabold">Ôn tập xuất sắc!</span>
            </div>

            <div
              v-if="props.reward.item"
              class="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-sky-100 border-2 border-sky-400 font-black text-sky-900"
            >
              <img
                v-if="props.reward.item.icon_url && !brokenItemImg"
                :src="props.reward.item.icon_url"
                :alt="props.reward.item.name"
                class="w-9 h-9 rounded-lg object-cover"
                @error="brokenItemImg = true"
              />
              <span v-else class="text-2xl">🎁</span>
              <div class="text-left leading-tight">
                <div class="text-[11px] uppercase font-extrabold text-sky-700">Vật phẩm mới</div>
                <div class="text-sm font-black">{{ props.reward.item.name }}</div>
              </div>
            </div>
          </div>

          <!-- New World Unlocked Notice -->
          <div
            v-if="props.reward.nextWorldId"
            class="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-200 to-yellow-200 border-2 border-amber-500 text-amber-950 font-black text-base"
          >
            🗺️ Tuyệt vời! Bé vừa mở khóa một vùng đất mới!
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              v-if="props.reward.nextWorldId"
              type="button"
              class="btn-kid-primary flex-1"
              @click="emit('next-world', props.reward.nextWorldId)"
            >
              <span>Khám phá vùng đất mới 🚀</span>
            </button>

            <button
              v-else-if="props.reward.nextStageId"
              type="button"
              class="btn-kid-green flex-1"
              @click="emit('next-stage', props.reward.nextStageId)"
            >
              <span>Chơi tiếp màn sau ▶</span>
            </button>

            <button
              type="button"
              class="btn-kid-wood"
              :class="{ 'flex-1': !props.reward.nextStageId && !props.reward.nextWorldId }"
              @click="emit('back-to-map')"
            >
              <span>Về bản đồ</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
