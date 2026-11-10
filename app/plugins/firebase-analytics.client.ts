import { getFirebaseApp } from '@/lib/firebase.client'

export default defineNuxtPlugin(async () => {
  if (!useRuntimeConfig().public.firebaseMeasurementId) return
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (await isSupported()) getAnalytics(getFirebaseApp())
  } catch {
    // Analytics is optional; unsupported browser contexts should still load the app.
  }
})
