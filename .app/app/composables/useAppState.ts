import { ref, watch, computed } from 'vue'

const selectedEmployeeId = ref<string>('')

export const useAppState = () => {
  return {
    selectedEmployeeId,
  }
}
