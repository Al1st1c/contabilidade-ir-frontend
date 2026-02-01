import { ref, watch, onMounted } from 'vue'

const dismissedIds = ref<string[]>([])

export const useNotifications = () => {
  const loadDismissed = () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('dismissed_notifications')
    if (saved) {
      try {
        dismissedIds.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse dismissed notifications', e)
      }
    }
  }

  const saveDismissed = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedIds.value))
  }

  const dismiss = (uid: string) => {
    if (!dismissedIds.value.includes(uid)) {
      dismissedIds.value.push(uid)
      saveDismissed()
    }
  }

  const restore = (uid: string) => {
    dismissedIds.value = dismissedIds.value.filter(id => id !== uid)
    saveDismissed()
  }

  // Initial load
  if (typeof window !== 'undefined' && dismissedIds.value.length === 0) {
    loadDismissed()
  }

  return {
    dismissedIds,
    dismiss,
    restore,
    loadDismissed,
  }
}
