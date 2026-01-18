<template>
  <div class="slot-machine">
    <div class="slot-machine-frame">
      <div class="slot-reel" :class="{ spinning: isSpinning }">
        <div 
          v-for="(participant, index) in participants" 
          :key="participant.userId"
          class="slot-item"
          :class="{ highlighted: highlightedIndex === index }"
        >
          <div class="slot-avatar">
            <Icon name="lucide:user" class="avatar-icon" />
          </div>
          <div class="slot-name">{{ participant.userName }}</div>
          <div class="slot-tickets">
            {{ participant.ticketNumbers?.length || participant.ticketCount || 0 }} bilhetes
          </div>
        </div>
      </div>
    </div>
    
    <div class="slot-machine-text">
      <h2>{{ isSpinning ? 'SORTEANDO...' : 'AGUARDANDO SORTEIO' }}</h2>
      <p>{{ isSpinning ? 'A sorte está sendo decidida!' : 'O sorteio começará em breve' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Participant {
  userId: string
  userName: string
  ticketCount?: number
  ticketNumbers?: number[]
  isActive?: boolean
  document?: string
}

interface Props {
  participants: Participant[]
  isSpinning?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  complete: [result: any]
}>()

const highlightedIndex = ref(-1)

// Simular animação de slot machine
watch(() => props.isSpinning, (spinning) => {
  if (spinning) {
    startSpinning()
  } else {
    stopSpinning()
  }
})

function startSpinning() {
  // Simular rolagem aleatória
  const interval = setInterval(() => {
    highlightedIndex.value = Math.floor(Math.random() * props.participants.length)
  }, 100)
  
  // Parar após 3 segundos e emitir resultado
  setTimeout(() => {
    clearInterval(interval)
    const winnerIndex = Math.floor(Math.random() * props.participants.length)
    highlightedIndex.value = winnerIndex
    
    // Emitir resultado após um pequeno delay
    setTimeout(() => {
      emit('complete', {
        winner: props.participants[winnerIndex],
        index: winnerIndex
      })
    }, 1000)
  }, 3000)
}

function stopSpinning() {
  highlightedIndex.value = -1
}
</script>

<style scoped>
.slot-machine {
  width: 400px;
  height: 300px;
  background: linear-gradient(145deg, #2c3e50, #34495e);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 
    0 0 50px rgba(0, 0, 0, 0.5),
    inset 0 0 20px rgba(255, 255, 255, 0.1);
  border: 4px solid #ffd700;
}

.slot-machine-frame {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 15px;
  background: linear-gradient(180deg, #1a1a2e, #16213e);
}

.slot-reel {
  display: flex;
  flex-direction: column;
  transition: transform 0.1s ease-out;
}

.slot-reel.spinning {
  animation: slotSpin 0.1s linear infinite;
}

@keyframes slotSpin {
  0% { transform: translateY(0); }
  100% { transform: translateY(-60px); }
}

.slot-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  min-height: 60px;
  transition: all 0.3s ease;
}

.slot-item.highlighted {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.2));
  border: 2px solid #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  transform: scale(1.05);
}

.slot-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #4ecdc4, #44a08d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(78, 205, 196, 0.4);
}

.avatar-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.slot-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #ffd700;
}

.slot-tickets {
  font-size: 14px;
  color: #4ecdc4;
  font-weight: 600;
}

.slot-machine-text {
  text-align: center;
  margin-top: 20px;
}

.slot-machine-text h2 {
  font-size: 48px;
  font-weight: 900;
  color: #ffd700;
  margin: 0 0 10px 0;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
  animation: slotTextGlow 1s ease-in-out infinite alternate;
}

@keyframes slotTextGlow {
  from { text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7); }
  to { text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.8); }
}

.slot-machine-text p {
  font-size: 20px;
  color: #ccc;
  margin: 0;
}
</style>