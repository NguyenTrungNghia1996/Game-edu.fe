import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.hydrated) {
    await authStore.hydrate()
  }

  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  if (to.meta.requireProfile && !authStore.activeProfileId) {
    return navigateTo('/profiles')
  }
})
