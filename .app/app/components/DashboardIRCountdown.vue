<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  startDate: string | Date
  endDate: string | Date
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 180
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const now = ref(new Date())

let rafId: number | null = null
let displayedProgress = 0

const NOT_STARTED = 'NOT_STARTED'
const RUNNING = 'RUNNING'
const FINISHED = 'FINISHED'

const start = computed(() => new Date(props.startDate))
const end = computed(() => new Date(props.endDate))

const status = computed(() => {
  if (now.value < start.value) return NOT_STARTED
  if (now.value > end.value) return FINISHED
  return RUNNING
})

const progress = computed(() => {
  if (status.value === NOT_STARTED) return 0
  if (status.value === FINISHED) return 1
  const total = end.value.getTime() - start.value.getTime()
  const elapsed = now.value.getTime() - start.value.getTime()
  return Math.min(1, Math.max(0, elapsed / total))
})

const remainingTime = computed(() => {
  const diff = Math.max(0, end.value.getTime() - now.value.getTime())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  return { days, hours }
})

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const size = props.size
  const dpr = window.devicePixelRatio || 1
  canvas.width = size * dpr
  canvas.height = size * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const center = size / 2
  const radius = center - 14
  const startAngle = -Math.PI / 2

  ctx.clearRect(0, 0, size, size)

  // === TRACK ===
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.stroke()

  // === TICKS (HORAS) ===
  if (status.value !== NOT_STARTED) {
    ctx.save()
    ctx.translate(center, center)
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12)
      ctx.beginPath()
      ctx.moveTo(0, -radius)
      ctx.lineTo(0, -radius + 6)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.restore()
  }

  // === PROGRESS ARC ===
  displayedProgress += (progress.value - displayedProgress) * 0.08
  const endAngle = startAngle + displayedProgress * Math.PI * 2

  if (displayedProgress > 0) {
    ctx.beginPath()
    ctx.arc(center, center, radius, startAngle, endAngle)

    if (status.value === FINISHED) {
      ctx.strokeStyle = '#ef4444'
    } else {
      const remaining = 1 - displayedProgress
      if (remaining > 0.5) ctx.strokeStyle = '#10b981'
      else if (remaining > 0.2) ctx.strokeStyle = '#f59e0b'
      else ctx.strokeStyle = '#ef4444'
    }

    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // === POINTER ===
  if (status.value === RUNNING) {
    ctx.beginPath()
    ctx.moveTo(center, center)
    ctx.lineTo(
      center + Math.cos(endAngle) * (radius - 6),
      center + Math.sin(endAngle) * (radius - 6)
    )
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

const loop = () => {
  now.value = new Date()
  draw()
  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  loop()
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})

watch(() => props.size, draw)
</script>

<template>
  <div class="relative flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <canvas ref="canvasRef" :style="{ width: `${size}px`, height: `${size}px` }" />

    <!-- CENTER OVERLAY -->
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
      <template v-if="status === NOT_STARTED">
        <span class="text-xs uppercase font-semibold text-slate-400">Aguardando</span>
      </template>

      <template v-else-if="status === RUNNING">
        <span class="text-2xl font-bold text-slate-800">
          {{ remainingTime.days }}d {{ remainingTime.hours }}h
        </span>
        <span class="text-[10px] uppercase font-semibold text-slate-400">
          restante
        </span>
      </template>

      <template v-else>
        <span class="text-xs uppercase font-bold text-red-500">
          Encerrado
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
canvas {
  display: block;
}
</style>
