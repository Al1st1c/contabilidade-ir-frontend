<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

interface Props {
  cards: any[]
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'refresh'])

// Usamos o useCustomFetch do composable useApi
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const isLoading = ref<Record<string, boolean>>({})
const selectedTemplateId = ref(1)

const smsTemplates = [
  {
    id: 1,
    icon: 'solar:document-add-linear',
    title: 'Urgência',
    message: 'Ola [NOME], precisamos dos seus documentos para o IR [ANO] urgentemente para evitar multas. Envie aqui: [LINK]. ConsTar.',
  },
  {
    id: 2,
    icon: 'solar:alarm-linear',
    title: 'Lembrete',
    message: 'Ola [NOME], passando para lembrar dos documentos pendentes para seu IR [ANO]. Voce pode subir por aqui: [LINK]. Obrigado.',
  },
  {
    id: 3,
    icon: 'solar:chat-round-dots-linear',
    title: 'Simples',
    message: 'Oi [NOME], falta pouco para entregarmos seu IR [ANO]! So falta os documentos deste link: [LINK].',
  },
]

function getFormattedMessage(card: any, linkUrl: string) {
  const template = smsTemplates.find(t => t.id === selectedTemplateId.value) || smsTemplates[0]
  const firstName = card.client?.name?.split(' ')[0] || 'Cliente'
  const taxYear = card.taxYear || new Date().getFullYear()

  if (!template)
    return ''

  return template.message
    .replace('[NOME]', firstName)
    .replace('[ANO]', taxYear.toString())
    .replace('[LINK]', linkUrl)
}

// Função para gerar o link e executar uma ação (SMS, WhatsApp ou Cópia)
async function handleAction(card: any, type: 'sms' | 'whatsapp' | 'copy') {
  if (!card.client?.phone && type !== 'copy') {
    toaster.add({
      title: 'Erro',
      description: 'Cliente sem telefone cadastrado',
      icon: 'ph:warning-circle-fill',
    })
    return
  }

  const actionKey = `${type}-${card.id}`
  isLoading.value[actionKey] = true

  try {
    // 1. Gerar o Link de Coleta
    const { data } = await useCustomFetch<any>(`/declarations/${card.id}/collection-link`, {
      method: 'POST',
      body: { title: `Documentos para IR ${card.taxYear}` },
    })

    // No Nuxt 3 useFetch, o data vem como Ref ou o objeto direto dependendo da implementação do wrapper
    const response = data.value || data
    if (!response || !response.success) {
      throw new Error('Falha ao gerar link')
    }

    const link = response.data
    const fullUrl = `${window.location.origin}${link.url}`
    const message = getFormattedMessage(card, fullUrl)

    // 2. Executar a ação específica
    if (type === 'sms') {
      await useCustomFetch<any>(`/declarations/${card.id}/send-sms`, {
        method: 'POST',
        body: {
          message: message.normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^\x00-\x7F]/g, ''),
        },
      })
      toaster.add({ title: 'Sucesso', description: 'SMS enviado!', icon: 'ph:check-circle-fill' })
    }
    else if (type === 'whatsapp') {
      const phone = card.client.phone.replace(/\D/g, '')
      const waUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank')
    }
    else if (type === 'copy') {
      await navigator.clipboard.writeText(fullUrl)
      toaster.add({ title: 'Copiado', description: 'Link na área de transferência!', icon: 'ph:copy-fill' })
    }
  }
  catch (error: any) {
    console.error('Action Error:', error)
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao processar ação',
      icon: 'ph:warning-circle-fill',
    })
  }
  finally {
    isLoading.value[actionKey] = false
  }
}
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-800 border-l bg-white dark:bg-muted-900 w-full max-w-2xl shadow-2xl flex flex-col h-screen overflow-hidden"
  >
    <!-- Header -->
    <div
      class="border-muted-200 dark:border-muted-800 flex h-16 w-full items-center justify-between border-b px-6 shrink-0 bg-white dark:bg-muted-900"
    >
      <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100">
        Cobrar Documentos Pendentes
      </BaseHeading>
      <button
        type="button"
        class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-500 rounded-full p-2 transition-colors duration-300"
        @click="emit('close')"
      >
        <Icon name="lucide:x" class="size-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
      <div class="bg-primary-500/5 border border-primary-500/20 rounded-xl p-4 flex gap-3">
        <Icon name="solar:info-circle-bold-duotone" class="size-6 text-primary-500 shrink-0" />
        <div>
          <BaseHeading as="h4" size="sm" weight="medium" class="text-primary-800 dark:text-primary-400">
            Ação Proativa
          </BaseHeading>
          <BaseParagraph size="xs" class="text-primary-700 dark:text-primary-500/80">
            Existem {{ cards.length }} clientes aguardando ação. Selecione um template e escolha um canal.
          </BaseParagraph>
        </div>
      </div>

      <!-- Template Selector -->
      <div class="space-y-3">
        <BaseHeading as="h5" size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider">
          Selecione o Template
        </BaseHeading>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="template in smsTemplates" :key="template.id"
            class="flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-300 text-center gap-2"
            :class="selectedTemplateId === template.id ? 'border-primary-500 bg-primary-500/5' : 'border-muted-200 dark:border-muted-800 hover:border-muted-300 dark:hover:border-muted-700'"
            @click="selectedTemplateId = template.id"
          >
            <div
              class="size-8 rounded-full flex items-center justify-center pointer-events-none"
              :class="selectedTemplateId === template.id ? 'bg-primary-500 text-white' : 'bg-muted-100 dark:bg-muted-800 text-muted-500'"
            >
              <Icon :name="template.icon" class="size-5" />
            </div>
            <span
              class="text-[10px] font-bold"
              :class="selectedTemplateId === template.id ? 'text-primary-700 dark:text-primary-400' : 'text-muted-500'"
            >
              {{ template.title }}
            </span>
          </button>
        </div>
        <div class="bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800 rounded-lg p-3">
          <BaseParagraph size="xs" class="text-muted-500 italic line-clamp-2">
            "{{ smsTemplates.find(t => t.id === selectedTemplateId)?.message.replace('[NOME]',
                                                                                     'Cliente').replace('[ANO]', '2024').replace('[LINK]', '...') }}"
          </BaseParagraph>
        </div>
      </div>

      <div class="space-y-3 pb-10">
        <BaseHeading as="h5" size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider">
          Clientes Pendentes ({{ cards.length }})
        </BaseHeading>

        <div
          v-for="card in cards" :key="card.id"
          class="group p-4 rounded-xl border border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900 hover:border-primary-500/50 transition-all duration-300"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <BaseAvatar
                :text="card.client?.name?.charAt(0)" size="sm"
                class="bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-400"
              />
              <div>
                <BaseHeading as="h4" size="sm" weight="semibold" class="text-muted-800 dark:text-muted-100">
                  {{ card.client?.name }}
                </BaseHeading>
                <div class="flex items-center gap-2 mt-0.5">
                  <BaseTag rounded="full" color="primary" variant="muted" size="sm" class="px-2 py-0">
                    IR {{ card.taxYear
                    }}
                  </BaseTag>
                  <span class="text-[10px] text-muted-400 font-mono">{{ card.client?.phone || 'Sem número' }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <BaseTooltip content="Enviar SMS">
                <BaseButton
                  size="sm" rounded="md" variant="muted"
                  class="size-10 p-0 hover:bg-primary-500/10 hover:text-primary-500" :loading="isLoading[`sms-${card.id}`]"
                  @click="handleAction(card, 'sms')"
                >
                  <Icon name="solar:text-field-focus-bold" class="size-5" />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip content="Chamar no WhatsApp">
                <BaseButton
                  size="sm" rounded="md" variant="muted"
                  class="size-10 p-0 text-success-500 hover:bg-success-500/10" :loading="isLoading[`whatsapp-${card.id}`]"
                  @click="handleAction(card, 'whatsapp')"
                >
                  <Icon name="solar:whatsapp-bold" class="size-5" />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip content="Copiar Link">
                <BaseButton
                  size="sm" rounded="md" variant="muted"
                  class="size-10 p-0 hover:bg-primary-500/10 hover:text-primary-500" :loading="isLoading[`copy-${card.id}`]"
                  @click="handleAction(card, 'copy')"
                >
                  <Icon name="solar:link-bold" class="size-5" />
                </BaseButton>
              </BaseTooltip>
            </div>
          </div>
        </div>

        <div v-if="cards.length === 0" class="py-20 text-center">
          <div
            class="size-16 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center mx-auto mb-4 text-muted-400"
          >
            <Icon name="solar:document-list-bold-duotone" class="size-8" />
          </div>
          <BaseHeading as="h4" size="sm" weight="medium">
            Nenhuma pendência crítica
          </BaseHeading>
          <BaseParagraph size="xs" class="text-muted-400 max-w-[240px] mx-auto mt-2">
            Todos os documentos solicitados estão em dia!
          </BaseParagraph>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="p-6 border-t border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-900 mt-auto shrink-0">
      <BaseButton class="w-full" rounded="md" @click="emit('close')">
        Fechar Painel
      </BaseButton>
    </div>
  </FocusScope>
</template>
