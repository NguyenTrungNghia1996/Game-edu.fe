<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAudioStore } from '~/stores/audio'
import type { ChoiceOption, SanitizedChallenge, SubmitAnswerResponse } from '~/types/api'

const props = defineProps<{
  visible: boolean
  stageName: string
  challenge: SanitizedChallenge | null
  challengeIndex: number
  totalChallenges: number
  submitting: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (e: 'submit', answer: string | Record<string, string>): void
  (e: 'close'): void
}>()

const audioStore = useAudioStore()

const wrongOptionId = ref<string | null>(null)
const shakeDragArea = ref(false)
const encouragementText = ref('')
const hintText = ref('')

// Drag-and-drop state (supports both HTML5 Drag&Drop and tap-to-place for touchscreens)
const selectedDragItemId = ref<string | null>(null)
const dragAssignments = ref<Record<string, string>>({})
const brokenImages = ref<Record<string, boolean>>({})

const isDragDrop = computed(() => props.challenge?.type === 'drag_drop')
const isAudioMatch = computed(() => props.challenge?.type === 'audio_match')

const allTargetsFilled = computed(() => {
  if (!isDragDrop.value || !props.challenge?.targets?.length) return false
  return props.challenge.targets.every((t) => Boolean(dragAssignments.value[t.id]))
})

const usedItemIds = computed(() => new Set(Object.values(dragAssignments.value)))

function resetLocalState() {
  wrongOptionId.value = null
  shakeDragArea.value = false
  encouragementText.value = ''
  hintText.value = ''
  selectedDragItemId.value = null
  dragAssignments.value = {}
  brokenImages.value = {}
}

watch(
  () => [props.visible, props.challenge?.id] as const,
  ([visible, challengeId]) => {
    resetLocalState()
    if (visible && challengeId && props.challenge) {
      void speakPrompt()
    }
  },
  { immediate: true },
)

async function speakPrompt() {
  if (!props.challenge) return
  await audioStore.speakVietnamese(props.challenge.prompt_text)
}

async function speakOption(option: ChoiceOption, event: Event) {
  event.stopPropagation()
  await audioStore.speakVietnamese(option.text)
}

function handleChoiceSelect(optionId: string) {
  if (props.submitting) return
  audioStore.playSfx('click')
  wrongOptionId.value = null
  emit('submit', optionId)
}

// Drag & Drop + Tap-to-place handlers
function onSelectDragItem(itemId: string) {
  audioStore.playSfx('click')
  selectedDragItemId.value = selectedDragItemId.value === itemId ? null : itemId
}

function onDragStart(itemId: string, event: DragEvent) {
  selectedDragItemId.value = itemId
  event.dataTransfer?.setData('text/plain', itemId)
}

function assignItemToTarget(targetId: string, itemId: string) {
  // Remove item from any other target so each item is placed cleanly once
  const next: Record<string, string> = { ...dragAssignments.value }
  for (const [tKey, assignedId] of Object.entries(next)) {
    if (assignedId === itemId) {
      delete next[tKey]
    }
  }
  next[targetId] = itemId
  dragAssignments.value = next
  selectedDragItemId.value = null
  audioStore.playSfx('click')
}

function onTargetDrop(targetId: string, event: DragEvent) {
  event.preventDefault()
  const itemId = event.dataTransfer?.getData('text/plain') || selectedDragItemId.value
  if (itemId) {
    assignItemToTarget(targetId, itemId)
  }
}

function onTargetClick(targetId: string) {
  if (selectedDragItemId.value) {
    assignItemToTarget(targetId, selectedDragItemId.value)
    return
  }
  // Tapping an already-filled target clears it so the child can retry easily
  if (dragAssignments.value[targetId]) {
    const next = { ...dragAssignments.value }
    delete next[targetId]
    dragAssignments.value = next
    audioStore.playSfx('click')
  }
}

function getItemTextById(itemId?: string): string {
  if (!itemId || !props.challenge?.items) return ''
  return props.challenge.items.find((i) => i.id === itemId)?.text ?? ''
}

function handleSubmitDragDrop() {
  if (props.submitting || !allTargetsFilled.value) return
  audioStore.playSfx('click')
  emit('submit', { ...dragAssignments.value })
}

function showWrongFeedback(resp: SubmitAnswerResponse, attemptedOptionId?: string) {
  audioStore.playSfx('wrong')
  encouragementText.value = 'Gần đúng rồi, bé thử lại nhé!'
  hintText.value = resp.hint || ''

  if (attemptedOptionId) {
    wrongOptionId.value = attemptedOptionId
    setTimeout(() => {
      if (wrongOptionId.value === attemptedOptionId) {
        wrongOptionId.value = null
      }
    }, 550)
  } else if (isDragDrop.value) {
    shakeDragArea.value = true
    setTimeout(() => {
      shakeDragArea.value = false
    }, 550)
  }

  const spokenFeedback = resp.hint
    ? `${encouragementText.value} Gợi ý: ${resp.hint}`
    : encouragementText.value
  void audioStore.speakVietnamese(spokenFeedback)
}

defineExpose({
  showWrongFeedback,
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="props.visible && props.challenge"
        class="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-forest-900/65 backdrop-blur-sm"
      >
        <div
          class="card-wood w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 animate-pop relative"
        >
          <!-- Header -->
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-sm border border-emerald-300"
              >
                <span>🌟</span>
                <span>{{ props.stageName }}</span>
              </span>
              <span
                v-if="props.totalChallenges > 1"
                class="px-3 py-1 rounded-full bg-amber-200 text-amber-900 font-extrabold text-sm"
              >
                Câu {{ props.challengeIndex + 1 }} / {{ props.totalChallenges }}
              </span>
            </div>

            <button
              type="button"
              class="w-11 h-11 rounded-full bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-black text-xl flex items-center justify-center transition"
              title="Quay lại bản đồ"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- Prompt Box + Unlimited Speaker Replay Button -->
          <div
            class="flex items-center gap-4 bg-white border-2 border-amber-300 rounded-2xl p-4 sm:p-5 mb-5 shadow-sm"
          >
            <button
              type="button"
              class="btn-kid-blue !min-w-[64px] !min-h-[64px] !p-0 rounded-2xl shrink-0"
              :class="{ 'ring-4 ring-sky-300 animate-pulse': audioStore.isSpeaking }"
              title="Nghe lại đề bài"
              @click="speakPrompt"
            >
              <span class="text-3xl leading-none">🔊</span>
            </button>
            <div class="flex-1">
              <p class="text-xs font-extrabold uppercase tracking-wide text-amber-700 mb-1">
                {{ isAudioMatch ? 'Nghe và chọn đáp án đúng' : isDragDrop ? 'Kéo hoặc chạm ghép chữ' : 'Thử thách dành cho bé' }}
              </p>
              <h2 class="text-xl sm:text-2xl font-black text-slate-800 leading-snug">
                {{ props.challenge.prompt_text }}
              </h2>
            </div>
          </div>

          <!-- Multiple Choice & Audio Match Options -->
          <div
            v-if="!isDragDrop && props.challenge.options?.length"
            class="grid gap-3.5"
            :class="props.challenge.options.length <= 3 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'"
          >
            <div
              v-for="opt in props.challenge.options"
              :key="opt.id"
              class="relative"
              :class="{ 'animate-shake': wrongOptionId === opt.id }"
            >
              <button
                type="button"
                :disabled="props.submitting"
                class="w-full min-h-[68px] px-4 py-3.5 rounded-2xl border-2 border-b-4 text-left font-extrabold text-lg sm:text-xl flex items-center justify-between gap-3 transition-all active:translate-y-0.5"
                :class="
                  wrongOptionId === opt.id
                    ? 'bg-rose-50 border-rose-400 border-b-rose-600 text-rose-900'
                    : 'bg-white hover:bg-amber-50 border-amber-300 border-b-amber-500 text-slate-800 shadow-sm'
                "
                @click="handleChoiceSelect(opt.id)"
              >
                <div class="flex items-center gap-3.5 min-w-0">
                  <span
                    class="w-11 h-11 rounded-xl bg-amber-400 text-amber-950 font-black text-xl flex items-center justify-center shrink-0 shadow-inner"
                  >
                    {{ opt.id }}
                  </span>

                  <img
                    v-if="opt.image_url && !brokenImages[opt.id]"
                    :src="opt.image_url"
                    :alt="opt.text"
                    class="w-12 h-12 rounded-xl object-cover border border-amber-200 shrink-0"
                    @error="brokenImages[opt.id] = true"
                  />

                  <span class="leading-snug break-words">{{ opt.text }}</span>
                </div>

                <span
                  role="button"
                  tabindex="0"
                  class="w-11 h-11 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-700 flex items-center justify-center text-xl shrink-0"
                  title="Nghe đọc đáp án"
                  @click="speakOption(opt, $event)"
                  @keydown.enter.prevent="speakOption(opt, $event)"
                >
                  🔈
                </span>
              </button>
            </div>
          </div>

          <!-- Drag & Drop / Tap-to-Place Challenge -->
          <div v-else-if="isDragDrop" :class="{ 'animate-shake': shakeDragArea }">
            <p class="text-sm font-bold text-amber-800 mb-3">
              Mẹo cho bé: Kéo thẻ chữ thả vào ô trống, hoặc chạm vào thẻ chữ rồi chạm vào ô cần điền nhé!
            </p>

            <!-- Draggable / Tappable Items -->
            <div class="flex flex-wrap gap-3 justify-center p-3.5 rounded-2xl bg-amber-100/80 border-2 border-dashed border-amber-400 mb-4">
              <button
                v-for="item in props.challenge.items"
                :key="item.id"
                type="button"
                draggable="true"
                class="min-w-[72px] min-h-[58px] px-5 py-2.5 rounded-2xl font-black text-2xl border-2 border-b-4 transition-all select-none"
                :class="[
                  selectedDragItemId === item.id
                    ? 'bg-sky-500 text-white border-sky-700 scale-105 ring-4 ring-sky-200'
                    : usedItemIds.has(item.id)
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-400 opacity-75'
                      : 'bg-white text-amber-950 border-amber-400 border-b-amber-600 hover:bg-amber-50',
                ]"
                @dragstart="onDragStart(item.id, $event)"
                @click="onSelectDragItem(item.id)"
              >
                {{ item.text }}
              </button>
            </div>

            <!-- Targets -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <button
                v-for="target in props.challenge.targets"
                :key="target.id"
                type="button"
                class="min-h-[84px] p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all"
                :class="[
                  dragAssignments[target.id]
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm'
                    : selectedDragItemId
                      ? 'bg-sky-50 border-sky-400 border-dashed text-sky-900 animate-pulse'
                      : 'bg-white border-amber-300 border-dashed text-slate-700',
                ]"
                @dragover.prevent
                @drop="onTargetDrop(target.id, $event)"
                @click="onTargetClick(target.id)"
              >
                <span
                  class="min-w-[54px] min-h-[38px] px-3 py-1 rounded-xl font-black text-xl flex items-center justify-center"
                  :class="
                    dragAssignments[target.id]
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-100 text-amber-700'
                  "
                >
                  {{ getItemTextById(dragAssignments[target.id]) || '?' }}
                </span>
                <span class="font-extrabold text-base text-center">{{ target.label }}</span>
              </button>
            </div>

            <div class="flex justify-center">
              <button
                type="button"
                class="btn-kid-green w-full sm:w-auto sm:min-w-[240px]"
                :disabled="!allTargetsFilled || props.submitting"
                @click="handleSubmitDragDrop"
              >
                <span>{{ props.submitting ? 'Đang kiểm tra...' : 'Kiểm tra đáp án ✨' }}</span>
              </button>
            </div>
          </div>

          <!-- Encouraging Wrong Feedback & Hint -->
          <div
            v-if="encouragementText || hintText"
            class="mt-4 p-4 rounded-2xl bg-amber-100 border-2 border-amber-400 text-amber-950 flex items-start gap-3"
          >
            <span class="text-2xl leading-none">💡</span>
            <div class="space-y-1">
              <p v-if="encouragementText" class="font-extrabold text-base text-amber-900">
                {{ encouragementText }}
              </p>
              <p v-if="hintText" class="font-bold text-sm text-amber-800">
                Gợi ý: {{ hintText }}
              </p>
            </div>
          </div>

          <!-- API Error Alert -->
          <div
            v-if="props.errorMessage"
            class="mt-4 p-3.5 rounded-2xl bg-rose-100 border-2 border-rose-400 text-rose-900 font-bold text-sm"
          >
            {{ props.errorMessage }}
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
