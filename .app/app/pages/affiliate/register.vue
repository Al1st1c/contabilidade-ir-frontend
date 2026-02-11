<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Field, useForm } from 'vee-validate'
import { z } from 'zod'
import { vMaska } from 'maska/vue'

definePageMeta({
  layout: 'empty',
  title: 'Cadastro de Afiliado',
})

useSeoMeta({
  title: 'Seja um Afiliado - Gestor IRPF',
  description: 'Cadastre-se como afiliado e ganhe comissões recorrentes indicando o Gestor IRPF.',
})

const isLoading = ref(false)
const router = useRouter()
const toaster = useNuiToasts()
const { useCustomFetch } = useApi()

// Validation Schema
const schema = toTypedSchema(
  z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(14, 'Telefone é obrigatório'),
    document: z.string().min(11, 'CPF/CNPJ é obrigatório'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
})

const onSubmit = handleSubmit(async (values: any) => {
  isLoading.value = true
  try {
    await useCustomFetch('/affiliate/register', {
      method: 'POST',
      body: {
        name: values.name,
        email: values.email,
        phone: values.phone.replace(/\D/g, ''),
        document: values.document.replace(/\D/g, ''),
        password: values.password,
      },
    })

    toaster.add({
      title: 'Cadastro realizado!',
      description: 'Sua conta foi criada. Aguarde a aprovação do administrador.',
      icon: 'ph:check-circle-fill',
    })

    setTimeout(() => {
      router.push('/affiliate/login')
    }, 2000)
  } catch (err: any) {
    console.error(err)
    toaster.add({
      title: 'Erro no cadastro',
      description: err.data?.message || 'Ocorreu um erro ao criar sua conta.',
      icon: 'ph:warning-circle-fill',
      color: 'danger',
    })
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="dark:bg-muted-900 min-h-screen bg-muted-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <BaseHeading tag="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
          Seja um Parceiro
        </BaseHeading>
        <BaseParagraph class="text-muted-500 dark:text-muted-400">
          Cadastre-se e comece a ganhar comissões recorrentes
        </BaseParagraph>
      </div>

      <BaseCard class="p-6 md:p-8" rounded="lg">
        <form @submit="onSubmit" class="space-y-4">
          <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="name">
            <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
              :error="errorMessage" label="Nome Completo" placeholder="Seu nome" icon="ph:user" />
          </Field>

          <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="email">
            <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
              :error="errorMessage" type="email" label="Email" placeholder="seu@email.com" icon="ph:envelope" />
          </Field>

          <div class="grid grid-cols-2 gap-4">
            <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="phone">
              <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
                :error="errorMessage" label="Telefone" placeholder="(00) 00000-0000" v-maska="'(##) #####-####'"
                icon="ph:phone" />
            </Field>

            <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="document">
              <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
                :error="errorMessage" label="CPF/CNPJ" placeholder="000.000.000-00"
                v-maska="['###.###.###-##', '##.###.###/####-##']" icon="ph:identification-card" />
            </Field>
          </div>

          <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="password">
            <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
              :error="errorMessage" type="password" label="Senha" placeholder="******" icon="ph:lock" />
          </Field>

          <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="confirmPassword">
            <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
              :error="errorMessage" type="password" label="Confirmar Senha" placeholder="******" icon="ph:lock-key" />
          </Field>

          <div class="pt-4">
            <BaseButton type="submit" color="primary" class="w-full" :loading="isLoading || isSubmitting">
              Criar Conta de Afiliado
            </BaseButton>
          </div>

          <div class="text-center text-sm text-muted-500 mt-4">
            Já tem conta?
            <NuxtLink to="/affiliate/login" class="text-primary-500 font-medium hover:underline">
              Fazer Login
            </NuxtLink>
          </div>
        </form>
      </BaseCard>
    </div>
  </div>
</template>
