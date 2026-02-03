<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<Props>(), {
  size: 200,
})

const colorMode = useColorMode()

interface Props {
  startDate: string | Date
  endDate: string | Date
  size?: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const now = ref(new Date())
let rafId: number | null = null
const pulseScale = 1
const pulseDir = 1

const start = computed(() => new Date(props.startDate))
const end = computed(() => new Date(props.endDate))

const isNotStarted = computed(() => now.value < start.value)
const isFinished = computed(() => now.value > end.value)
const isRunning = computed(() => !isNotStarted.value && !isFinished.value)

const progress = computed(() => {
  if (isNotStarted.value)
    return 0
  if (isFinished.value)
    return 1
  const total = end.value.getTime() - start.value.getTime()
  const elapsed = now.value.getTime() - start.value.getTime()
  return Math.min(1, Math.max(0, elapsed / total))
})

const timeRemaining = computed(() => {
  if (isFinished.value)
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }

  const targetDate = isNotStarted.value ? start.value : end.value
  const diff = targetDate.getTime() - now.value.getTime()
  const totalSeconds = Math.floor(diff / 1000)

  return {
    days: Math.floor(totalSeconds / (24 * 60 * 60)),
    hours: Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60)),
    minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
    seconds: totalSeconds % 60,
  }
})

// Verifica se faltam menos de 24 horas
const isLast24Hours = computed(() => {
  if (isNotStarted.value || isFinished.value)
    return false
  return timeRemaining.value.days === 0
})

const percentageRemaining = computed(() => {
  if (isNotStarted.value)
    return 100
  if (isFinished.value)
    return 0
  return Math.round((1 - progress.value) * 100)
})

// Sistema de cores por urgência
const clockState = computed(() => {
  if (isNotStarted.value) {
    return {
      color: '#94a3b8',
      lightColor: '#e2e8f0',
      status: 'Aguardando',
      glow: false,
    }
  }
  if (isFinished.value) {
    return {
      color: '#dc2626',
      lightColor: '#fee2e2',
      status: 'Encerrado',
      glow: true,
    }
  }

  const remaining = 1 - progress.value

  // Verde: Mais de 50% do tempo restando
  if (remaining > 0.5) {
    return {
      color: '#10b981',
      lightColor: '#d1fae5',
      status: 'No prazo',
      glow: false,
    }
  }

  // Amarelo: Entre 25% e 50% do tempo
  if (remaining > 0.25) {
    return {
      color: '#f59e0b',
      lightColor: '#fef3c7',
      status: 'Atenção',
      glow: false,
    }
  }

  // Vermelho: Menos de 25% (últimas semanas)
  return {
    color: '#ef4444',
    lightColor: '#fee2e2',
    status: 'Urgente',
    glow: true,
  }
})

function draw() {
  const canvas = canvasRef.value
  if (!canvas)
    return
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const size = props.size
  const dpr = window.devicePixelRatio || 1
  canvas.width = size * dpr
  canvas.height = size * dpr
  ctx.scale(dpr, dpr)

  const center = size / 2
  const radius = (size / 2) - 6

  ctx.clearRect(0, 0, size, size)

  // Efeito de brilho pulsar para estados urgentes (Vermelho)
  if (clockState.value.glow) {
    // Cálculo do pulso (entre 1.0 e 1.08)
    const time = Date.now() / 1000
    const pulseFactor = Math.sin(time * 3) * 0.04 + 1.04

    ctx.save()
    ctx.shadowColor = clockState.value.color
    ctx.shadowBlur = 10 * pulseFactor
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Escala sutil do relógio inteiro no pulso
    ctx.translate(center, center)
    ctx.scale(pulseFactor, pulseFactor)
    ctx.translate(-center, -center)
  }

  // Círculo externo (moldura do relógio com gradiente metálico)
  const isDark = colorMode.value === 'dark'
  const ringGradient = ctx.createLinearGradient(0, 0, size, size)
  if (isDark) {
    ringGradient.addColorStop(0, '#334155')
    ringGradient.addColorStop(0.5, '#1e293b')
    ringGradient.addColorStop(1, '#0f172a')
  }
  else {
    ringGradient.addColorStop(0, '#f8fafc')
    ringGradient.addColorStop(0.5, '#cbd5e1')
    ringGradient.addColorStop(1, '#94a3b8')
  }

  ctx.beginPath()
  ctx.arc(center, center, radius + 2, 0, Math.PI * 2)
  ctx.fillStyle = ringGradient
  ctx.fill()

  // Fundo do mostrador (Branco com leve profundidade)
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.fillStyle = isDark ? '#0f172a' : '#ffffff'
  ctx.fill()

  // Sombra interna sutil
  const innerShadow = ctx.createRadialGradient(center, center, radius * 0.8, center, center, radius)
  innerShadow.addColorStop(0, 'rgba(255,255,255,0)')
  innerShadow.addColorStop(1, isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
  ctx.fillStyle = innerShadow
  ctx.fill()

  if (clockState.value.glow) {
    ctx.restore()
  }

  // Marcadores das horas (12 pontos)
  ctx.save()
  ctx.translate(center, center)
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * Math.PI / 180
    const isQuarter = i % 3 === 0

    const outerRadius = radius - 8
    const innerRadius = isQuarter ? radius - 16 : radius - 12

    const x1 = Math.cos(angle) * outerRadius
    const y1 = Math.sin(angle) * outerRadius
    const x2 = Math.cos(angle) * innerRadius
    const y2 = Math.sin(angle) * innerRadius

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = isQuarter ? (isDark ? '#94a3b8' : '#64748b') : (isDark ? '#475569' : '#cbd5e1')
    ctx.lineWidth = isQuarter ? 2.5 : 1
    ctx.lineCap = 'butt'
    ctx.stroke()
  }
  ctx.restore()

  // Arco de progresso fino
  if (progress.value > 0 && !isNotStarted.value) {
    const progressRadius = radius - 5
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (Math.PI * 2 * progress.value)

    ctx.beginPath()
    ctx.arc(center, center, progressRadius, startAngle, endAngle)
    ctx.strokeStyle = `${clockState.value.color}40`
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // Centro do relógio
  ctx.beginPath()
  ctx.arc(center, center, 5, 0, Math.PI * 2)
  ctx.fillStyle = clockState.value.color
  ctx.fill()

  if (!isFinished.value) {
    const hours = timeRemaining.value.hours
    const minutes = timeRemaining.value.minutes
    const seconds = timeRemaining.value.seconds

    if (isLast24Hours.value) {
      // Modo 24 horas: relógio funciona como relógio real
      // Ponteiro de HORAS (grosso) - uma volta completa em 24h
      const hourAngle = ((hours + minutes / 60) / 24) * 360 - 90
      drawHand(ctx, center, center, radius * 0.5, hourAngle, 5, clockState.value.color)

      // Ponteiro de MINUTOS (médio) - uma volta completa em 60min
      const minuteAngle = ((minutes + seconds / 60) / 60) * 360 - 90
      drawHand(ctx, center, center, radius * 0.65, minuteAngle, 3, isDark ? '#94a3b8' : '#475569')

      // Ponteiro de SEGUNDOS (fino) - uma volta completa em 60s
      const secondAngle = (seconds / 60) * 360 - 90
      drawHand(ctx, center, center, radius * 0.75, secondAngle, 2, '#ef4444')
    }
    else {
      // Modo normal: dias, horas, minutos
      const totalDays = timeRemaining.value.days

      // Ponteiro de DIAS (grosso)
      const dayAngle = ((totalDays % 30) / 30) * 360 - 90
      drawHand(ctx, center, center, radius * 0.45, dayAngle, 5, clockState.value.color)

      // Ponteiro de HORAS (médio)
      const hourAngle = ((hours + minutes / 60) / 24) * 360 - 90
      drawHand(ctx, center, center, radius * 0.6, hourAngle, 3, isDark ? '#cbd5e1' : '#475569')

      // Ponteiro de MINUTOS (fino)
      const minuteAngle = (minutes / 60) * 360 - 90
      drawHand(ctx, center, center, radius * 0.7, minuteAngle, 2, isDark ? '#64748b' : '#64748b')
    }
  }
}

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, width: number, color: string) {
  const rad = angle * Math.PI / 180
  const endX = x + Math.cos(rad) * length
  const endY = y + Math.sin(rad) * length

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(endX, endY)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.stroke()
}

function animate() {
  now.value = new Date()
  draw()
  rafId = requestAnimationFrame(animate)
}

onMounted(() => {
  rafId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  if (rafId)
    cancelAnimationFrame(rafId)
})

watch([progress, () => props.size, () => colorMode.value], draw)

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}
const showDetails = ref(false)
</script>

<template>
  <div class="relative inline-block" @click="showDetails = !showDetails">
    <!-- Relógio Analógico -->
    <div class="relative cursor-pointer" :style="{ width: `${size}px`, height: `${size}px` }">
      <canvas ref="canvasRef" :style="{ width: `${size}px`, height: `${size}px` }" class="block drop-shadow-xl" />

      <!-- Informação Minimalista no Centro -->
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <div class="pt-8">
          <div
            class="text-[10px] uppercase font-bold tracking-widest mb-0.5"
            :style="{ color: `${clockState.color}99` }"
          >
            {{ isNotStarted ? 'Início em' : isFinished ? 'Encerrado' : isLast24Hours ? 'Últimas' : 'Falta' }}
          </div>
          <div
            class="text-lg font-bold tabular-nums" :style="{
              color: clockState.color,
              fontFamily: 'ui-monospace, monospace',
            }"
          >
            <template v-if="isLast24Hours">
              {{ String(timeRemaining.hours).padStart(2, '0') }}:{{ String(timeRemaining.minutes).padStart(2, '0') }}
            </template>
            <template v-else>
              {{ timeRemaining.days }}d
            </template>
          </div>
        </div>
      </div>

      <!-- Badge de Status (pequeno, discreto) -->
      <div class="absolute top-2 right-2 pointer-events-none">
        <div
          class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide" :style="{
            backgroundColor: clockState.lightColor,
            color: clockState.color,
          }"
        >
          {{ clockState.status }}
        </div>
      </div>
    </div>

    <!-- Tooltip com Detalhes (aparece no click) -->
    <div
      v-if="showDetails"
      class="absolute left-1/2 -translate-x-1/2 top-full mt-4 transition-all duration-200 ease-out z-[100] pointer-events-auto"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 min-w-[280px]"
      >
        <!-- Tempo Restante -->
        <div class="mb-4">
          <div class="text-xs font-semibold text-slate-500 mb-2 flex items-center justify-between">
            <span>{{ isNotStarted ? 'Inicia em' : isFinished ? 'Tempo esgotado' : 'Tempo restante' }}</span>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: clockState.color }" />
              <span class="text-[10px]">{{ clockState.status }}</span>
            </div>
          </div>

          <div v-if="!isFinished" class="grid grid-cols-4 gap-2">
            <div class="text-center">
              <div class="text-2xl font-bold text-slate-800 dark:text-white">
                {{ timeRemaining.days }}
              </div>
              <div class="text-[10px] text-slate-500 mt-0.5">
                dias
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-slate-800 dark:text-white">
                {{ String(timeRemaining.hours).padStart(2, '0') }}
              </div>
              <div class="text-[10px] text-slate-500 mt-0.5">
                hrs
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-slate-800 dark:text-white">
                {{ String(timeRemaining.minutes).padStart(2, '0') }}
              </div>
              <div class="text-[10px] text-slate-500 mt-0.5">
                min
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-slate-800 dark:text-white">
                {{ String(timeRemaining.seconds).padStart(2, '0') }}
              </div>
              <div class="text-[10px] text-slate-500 mt-0.5">
                seg
              </div>
            </div>
          </div>

          <div v-else class="text-center py-2">
            <div class="text-lg font-bold text-red-600">
              Prazo finalizado
            </div>
          </div>
        </div>

        <!-- Datas -->
        <div class="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div class="text-center">
            <div class="text-[10px] font-semibold text-slate-500 uppercase mb-1">
              Início
            </div>
            <div class="text-sm font-bold text-slate-700 dark:text-slate-300">
              {{ formatDate(start) }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold text-slate-500 uppercase mb-1">
              Término
            </div>
            <div class="text-sm font-bold text-slate-700 dark:text-slate-300">
              {{ formatDate(end) }}
            </div>
          </div>
        </div>

        <!-- Seta do tooltip -->
        <div
          class="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-white dark:bg-slate-800 border-l border-t border-slate-200 dark:border-slate-700 rotate-45"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
canvas {
  display: block;
}
</style>
