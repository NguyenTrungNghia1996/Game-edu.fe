<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'
import { useGameStore } from '~/stores/game'
import type { ItemCategory } from '~/types/api'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const gameStore = useGameStore()
const audioStore = useAudioStore()

const selectedCategory = ref<'all' | ItemCategory>('all')
const equippingItemId = ref<string | null>(null)
const brokenIcons = ref<Record<string, boolean>>({})

const categories: { id: 'all' | ItemCategory; label: string; emoji: string }[] = [
  { id: 'all', label: 'Tất cả', emoji: '🎒' },
  { id: 'hat', label: 'Mũ', emoji: '🎩' },
  { id: 'outfit', label: 'Trang phục', emoji: '🧥' },
  { id: 'tool', label: 'Dụng cụ', emoji: '🔨' },
  { id: 'badge', label: 'Huy hiệu', emoji: '🏅' },
]

const filteredItems = computed(() => {
  if (selectedCategory.value === 'all') return gameStore.inventory
  return gameStore.inventory.filter((entry) => entry.item.category === selectedCategory.value)
})

const categoryEmoji: Record<string, string> = {
  hat: '🎩',
  outfit: '🧥',
  tool: '🔨',
  badge: '🏅',
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void gameStore.fetchInventory()
    }
  },
)

async function handleToggleEquip(itemId: string, currentlyEquipped: boolean) {
  audioStore.playSfx('click')
  equippingItemId.value = itemId
  try {
    await gameStore.toggleEquipItem(itemId, !currentlyEquipped)
  } finally {
    equippingItemId.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="props.visible"
        class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-forest-900/70 backdrop-blur-sm"
      >
        <div class="card-wood w-full max-w-4xl max-h-[92vh] flex flex-col p-5 sm:p-6 animate-pop">
          <!-- Title -->
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2.5">
              <span class="text-3xl">🎒</span>
              <div>
                <h2 class="text-2xl font-black text-amber-950">Túi Đồ Phiêu Lưu</h2>
                <p class="text-xs sm:text-sm font-bold text-amber-800">
                  Mặc trang bị yêu thích — nhân vật sẽ thay đổi ngay lập tức!
                </p>
              </div>
            </div>
            <button
              type="button"
              class="w-11 h-11 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-950 font-black text-xl flex items-center justify-center"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <div class="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
            <!-- Left: Live Character Preview -->
            <div
              class="md:w-56 shrink-0 rounded-2xl bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100 border-2 border-emerald-300 p-4 flex flex-col items-center justify-between text-center shadow-inner"
            >
              <span
                class="px-3 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold uppercase tracking-wide"
              >
                Xem trước nhân vật
              </span>

              <GameHeroPreview
                :gear="gameStore.equippedGear"
                :nickname="authStore.activeProfile?.nickname || 'Nhà thám hiểm'"
                class="my-2"
              />

              <div class="w-full space-y-1">
                <p class="text-[11px] font-extrabold text-emerald-800 uppercase">Đang mặc:</p>
                <p
                  v-if="gameStore.equippedItems.length === 0"
                  class="text-xs font-bold text-emerald-700/75"
                >
                  Chưa mặc trang bị nào
                </p>
                <div v-else class="flex flex-wrap justify-center gap-1">
                  <span
                    v-for="eq in gameStore.equippedItems"
                    :key="eq.id"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold"
                  >
                    <span>{{ categoryEmoji[eq.item.category] || '✨' }}</span>
                    <span class="truncate max-w-[130px]">{{ eq.item.name }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: Tabs & Inventory Items -->
            <div class="flex-1 flex flex-col min-h-0">
              <!-- Category Tabs -->
              <div class="flex flex-wrap gap-2 mb-3.5">
                <button
                  v-for="cat in categories"
                  :key="cat.id"
                  type="button"
                  class="px-3.5 py-2 rounded-xl font-extrabold text-sm transition-all border-2"
                  :class="
                    selectedCategory === cat.id
                      ? 'bg-amber-400 border-amber-600 text-amber-950 shadow'
                      : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100'
                  "
                  @click="selectedCategory = cat.id"
                >
                  <span>{{ cat.emoji }} {{ cat.label }}</span>
                </button>
              </div>

              <!-- Inventory Grid -->
              <div class="overflow-y-auto flex-1 pr-1">
                <div v-if="gameStore.loadingInventory" class="py-12 text-center font-bold text-amber-800">
                  Đang mở túi đồ...
                </div>

                <div
                  v-else-if="filteredItems.length === 0"
                  class="py-12 text-center bg-white/70 rounded-2xl border-2 border-dashed border-amber-300"
                >
                  <div class="text-5xl mb-2">🎁</div>
                  <p class="font-extrabold text-lg text-amber-900">Chưa có vật phẩm nào ở mục này</p>
                  <p class="font-bold text-sm text-amber-700 mt-1">
                    Bé hãy vượt qua các màn chơi để mở rương kho báu nhé!
                  </p>
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    v-for="entry in filteredItems"
                    :key="entry.id"
                    class="bg-white rounded-2xl p-3.5 border-2 flex items-center gap-3 transition"
                    :class="
                      entry.is_equipped
                        ? 'border-emerald-500 ring-2 ring-emerald-200'
                        : 'border-amber-200'
                    "
                  >
                    <div
                      class="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 overflow-hidden"
                    >
                      <img
                        v-if="entry.item.icon_url && !brokenIcons[entry.item.id]"
                        :src="entry.item.icon_url"
                        :alt="entry.item.name"
                        class="w-full h-full object-cover"
                        @error="brokenIcons[entry.item.id] = true"
                      />
                      <span v-else class="text-3xl">
                        {{ categoryEmoji[entry.item.category] || '🎁' }}
                      </span>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5">
                        <h3 class="font-black text-sm sm:text-base text-slate-800 truncate">
                          {{ entry.item.name }}
                        </h3>
                        <span
                          v-if="entry.quantity > 1"
                          class="text-xs font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900"
                        >
                          x{{ entry.quantity }}
                        </span>
                      </div>
                      <p class="text-xs font-semibold text-slate-600 line-clamp-2 mt-0.5">
                        {{ entry.item.description }}
                      </p>
                      <div class="mt-2">
                        <button
                          type="button"
                          :disabled="equippingItemId === entry.item_id"
                          class="px-3.5 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm transition"
                          :class="
                            entry.is_equipped
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-amber-400 hover:bg-amber-500 text-amber-950'
                          "
                          @click="handleToggleEquip(entry.item_id, entry.is_equipped)"
                        >
                          {{
                            equippingItemId === entry.item_id
                              ? 'Đang lưu...'
                              : entry.is_equipped
                                ? '✓ Đang mặc (Tháo)'
                                : 'Mặc ngay'
                          }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
