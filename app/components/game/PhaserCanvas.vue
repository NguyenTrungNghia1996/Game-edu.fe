<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type Phaser from 'phaser'
import { gameEventBus } from '~/game/eventBus'

const emit = defineEmits<{
  (e: 'ready'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
let gameInstance: Phaser.Game | null = null

const handleReady = () => {
  emit('ready')
}

onMounted(async () => {
  gameEventBus.on('game:ready', handleReady)

  // Dynamic import đảm bảo chỉ chạy trên Client
  const PhaserLib = await import('phaser')
  const { createGameConfig } = await import('~/game/config')

  if (containerRef.value) {
    gameInstance = new PhaserLib.default.Game(createGameConfig(containerRef.value))
  }
})

onBeforeUnmount(() => {
  gameEventBus.off('game:ready', handleReady)
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="fixed inset-0 w-screen h-screen overflow-hidden touch-none select-none bg-[#1b3b2b]"
  />
</template>
