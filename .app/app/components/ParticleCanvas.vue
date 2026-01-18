<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement>()
let animationId: number
let particles: Particle[] = []

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

function createParticle(x: number, y: number) {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    life: 1,
    maxLife: Math.random() * 100 + 50,
    size: Math.random() * 4 + 2,
    color: colors[Math.floor(Math.random() * colors.length)]
  }
}

function animate() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Update and draw particles
  particles.forEach((particle, index) => {
    particle.x += particle.vx
    particle.y += particle.vy
    particle.life -= 1 / particle.maxLife
    
    // Apply gravity
    particle.vy += 0.1
    
    // Draw particle
    ctx.save()
    ctx.globalAlpha = particle.life
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    
    // Remove dead particles
    if (particle.life <= 0) {
      particles.splice(index, 1)
    }
  })
  
  animationId = requestAnimationFrame(animate)
}

function addParticles(x: number, y: number, count: number = 20) {
  for (let i = 0; i < count; i++) {
    particles.push(createParticle(x, y))
  }
}

function resizeCanvas() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

onMounted(() => {
  resizeCanvas()
  animate()
  
  // Add particles on click
  const handleClick = (e: MouseEvent) => {
    addParticles(e.clientX, e.clientY, 30)
  }
  
  window.addEventListener('click', handleClick)
  window.addEventListener('resize', resizeCanvas)
  
  onUnmounted(() => {
    window.removeEventListener('click', handleClick)
    window.removeEventListener('resize', resizeCanvas)
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })
})

// Expose methods for parent component
defineExpose({
  addParticles
})
</script>

<template>
  <canvas 
    ref="canvasRef"
    class="particle-canvas"
  />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
}
</style>
