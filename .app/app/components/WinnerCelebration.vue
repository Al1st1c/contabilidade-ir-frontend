<template>
  <div v-if="isVisible" class="winner-celebration-overlay">
    <div class="celebration-background"></div>
    
    <div class="winner-celebration-card">
      <div class="celebration-glow"></div>
      
      <div class="winner-content">
        <div class="winner-avatar">
          <Icon name="lucide:crown" class="crown-icon" />
          <Icon name="lucide:user" class="avatar-icon" />
        </div>
        
        <h1 class="winner-name">{{ winner?.userName || 'Ganhador' }}</h1>
        
        <div class="prize-info">
          <h2 class="prize-name">{{ winner?.prizeName || 'Prêmio' }}</h2>
          <div v-if="winner?.prizeValue" class="prize-value">
            Valor: R$ {{ winner.prizeValue }}
          </div>
        </div>
        
        <div class="winner-ticket">
          <span class="ticket-label">Bilhete da Sorte:</span>
          <span class="ticket-number">#{{ winner?.ticketNumber || 'N/A' }}</span>
        </div>
        
        <div class="celebration-message">
          <h3>🎉 PARABÉNS! 🎉</h3>
          <p>Você é o grande ganhador!</p>
        </div>
      </div>
      
      <button @click="handleComplete" class="close-celebration">
        <Icon name="lucide:x" class="close-icon" />
      </button>
    </div>
    
    <!-- Confetti Canvas -->
    <canvas ref="confettiCanvas" class="confetti-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
interface Winner {
  userId: string
  userName: string
  prizeName: string
  prizeValue?: number
  ticketNumber: string
  timestamp: Date
}

interface Props {
  winner: Winner | null
  isVisible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  complete: []
}>()

const confettiCanvas = ref<HTMLCanvasElement>()

onMounted(() => {
  if (confettiCanvas.value) {
    confettiCanvas.value.width = window.innerWidth
    confettiCanvas.value.height = window.innerHeight
  }
})

watch(() => props.isVisible, (visible) => {
  if (visible) {
    triggerConfetti()
  }
})

function triggerConfetti() {
  if (typeof window !== 'undefined' && window.confetti) {
    // Confete principal
    window.confetti({
      particleCount: 200,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
    })
    
    // Confetes laterais
    setTimeout(() => {
      window.confetti({
        particleCount: 150,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
      })
      window.confetti({
        particleCount: 150,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
      })
    }, 500)
    
    // Confetes adicionais
    setTimeout(() => {
      window.confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.3 },
        colors: ['#ffd700', '#ffed4e', '#ff6b6b', '#4ecdc4']
      })
    }, 1000)
  }
}

function handleComplete() {
  emit('complete')
}
</script>

<style scoped>
.winner-celebration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.celebration-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
}

.winner-celebration-card {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  border-radius: 30px;
  padding: 60px;
  text-align: center;
  box-shadow: 0 0 100px rgba(255, 215, 0, 0.4);
  border: 4px solid rgba(255, 215, 0, 0.6);
  backdrop-filter: blur(20px);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.celebration-glow {
  position: absolute;
  top: -30px;
  left: -30px;
  right: -30px;
  bottom: -30px;
  background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
  border-radius: 40px;
  opacity: 0.4;
  animation: celebrationGlow 2s ease-in-out infinite alternate;
  z-index: -1;
}

@keyframes celebrationGlow {
  from { opacity: 0.4; transform: scale(1); }
  to { opacity: 0.7; transform: scale(1.05); }
}

.winner-content {
  position: relative;
  z-index: 1;
}

.winner-avatar {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 30px;
  background: linear-gradient(45deg, #4ecdc4, #44a08d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 50px rgba(78, 205, 196, 0.6);
}

.crown-icon {
  position: absolute;
  top: -25px;
  width: 50px;
  height: 50px;
  color: #ffd700;
  animation: crownBounce 1.5s ease-in-out infinite alternate;
}

@keyframes crownBounce {
  from { transform: translateY(0px); }
  to { transform: translateY(-8px); }
}

.avatar-icon {
  width: 50px;
  height: 50px;
  color: white;
}

.winner-name {
  font-size: 48px;
  font-weight: 900;
  color: #2c3e50;
  margin: 0 0 20px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.prize-info {
  margin: 30px 0;
  padding: 25px;
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.1), rgba(68, 160, 141, 0.1));
  border-radius: 20px;
  border: 3px solid rgba(78, 205, 196, 0.3);
}

.prize-name {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.prize-value {
  font-size: 24px;
  font-weight: 700;
  color: #27ae60;
  margin-top: 15px;
  padding: 15px 25px;
  background: rgba(39, 174, 96, 0.1);
  border-radius: 15px;
  border: 2px solid rgba(39, 174, 96, 0.3);
}

.winner-ticket {
  margin-top: 30px;
  padding: 20px 35px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  border-radius: 30px;
  color: white;
  display: inline-block;
}

.ticket-label {
  font-size: 18px;
  font-weight: 600;
  margin-right: 15px;
}

.ticket-number {
  font-size: 24px;
  font-weight: 900;
  font-family: 'Courier New', monospace;
}

.celebration-message {
  margin-top: 30px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
  border-radius: 20px;
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.celebration-message h3 {
  font-size: 28px;
  font-weight: 900;
  color: #ffd700;
  margin: 0 0 10px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.celebration-message p {
  font-size: 18px;
  color: #2c3e50;
  margin: 0;
  font-weight: 600;
}

.close-celebration {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(255, 0, 0, 0.1);
  border: 2px solid rgba(255, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-celebration:hover {
  background: rgba(255, 0, 0, 0.2);
  border-color: rgba(255, 0, 0, 0.5);
  transform: scale(1.1);
}

.close-icon {
  width: 20px;
  height: 20px;
  color: #ff0000;
}

.confetti-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .winner-celebration-card {
    padding: 40px 30px;
    margin: 20px;
  }
  
  .winner-name {
    font-size: 36px;
  }
  
  .prize-name {
    font-size: 24px;
  }
  
  .celebration-message h3 {
    font-size: 24px;
  }
}
</style>