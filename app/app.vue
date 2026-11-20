<script setup lang="ts">
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from '~/stores/auth'
import { useAudioStore } from '~/stores/audio'

const authStore = useAuthStore()
const audioStore = useAudioStore()

onMounted(async () => {
  await Promise.all([authStore.hydrate(), audioStore.hydrate()])

  if (Capacitor.isNativePlatform()) {
    try {
      const [{ StatusBar }, { ScreenOrientation }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/screen-orientation'),
      ])
      await StatusBar.hide()
      await ScreenOrientation.lock({ orientation: 'landscape' })
    } catch {
      // Ignore if plugin is unsupported on current device/emulator
    }
  }
})
</script>

<template>
  <NuxtPage />
</template>
