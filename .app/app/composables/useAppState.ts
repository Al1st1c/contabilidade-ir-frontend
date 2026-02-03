import { ref } from 'vue'

const selectedEmployeeId = ref<string>('')

export function useAppState() {
  return {
    selectedEmployeeId,
  }
}
