// composables/useAuth.ts
import { API_CONFIG, getApiUrl } from '~/utils/config'

// Tipos para autenticação
interface User {
  id: string
  email: string
  name: string
  photo?: string
  onboardingStatus?: string
  level?: string
  role?: {
    id: string
    name: string
    canViewAllCards: boolean
    canManageTeam: boolean
    canManageClients: boolean
    canManageSettings: boolean
    canExportData: boolean
    canDeleteRecords: boolean
    // Novas permissões
    canCreateIR: boolean
    canEditIR: boolean
    canMoveToFinalColumn: boolean
    canImportDocs: boolean
    canViewFinancialCharts: boolean
    canViewDrive: boolean
    canManageChecklist: boolean
    canManageKanban: boolean
  }
  tenant?: {
    id: string
    name: string
    tradeName?: string
    document?: string
    logo?: string
    primaryColor?: string
    secondaryColor?: string
    pixKey?: string
  }
}

interface AuthResponse {
  error?: boolean
  message?: string
  access_token: string
  user: User
  level?: string
  // Adicione outros campos conforme necessário
}

interface LoginCredentials {
  email: string
  password: string
  recaptchaToken?: string
}

// Função para limpar cache do caixa
function clearCashierCache() {
  if (process.client) {
    localStorage.removeItem('casino_cashier_status')
    localStorage.removeItem('casino_cashier_data')
  }
}

export function useAuth() {
  const token = useCookie<string | null>(API_CONFIG.TOKEN.COOKIE_NAME, {
    default: () => null,
    maxAge: API_CONFIG.TOKEN.MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const user = useCookie<User | null>(API_CONFIG.TOKEN.USER_COOKIE_NAME, {
    default: () => null,
    maxAge: API_CONFIG.TOKEN.MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const level = useCookie<string | null>('level', {
    default: () => null,
    maxAge: API_CONFIG.TOKEN.MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const isAuthenticated = computed(() => !!token.value)

  const currentUser = computed<User | null>(() => {
    try {
      // Nuxt useCookie handles JSON parsing automatically
      return user.value as User | null
    }
    catch (e) {
      console.error('Error parsing user cookie:', e)
      user.value = null
      return null
    }
  })

  // Função para fazer login (agora sempre requer 2FA)
  const login = async (credentials: LoginCredentials): Promise<AuthResponse | { error: boolean, message: string, two_factor?: boolean, status?: string, phone?: string }> => {
    try {
      // Primeiro, enviar código 2FA
      const requestBody: any = {
        email: credentials.email,
        password: credentials.password,
      }

      const data = await $fetch<any>(getApiUrl('/auth/send-2fa'), {
        method: 'POST',
        body: requestBody,
      })

      // Verifica se há erro no payload (API NestJS retorna error: 1)
      if (data.error && data.error === 1) {
        const errorMessage = data.message || 'Erro ao enviar código 2FA'
        return {
          error: true,
          message: errorMessage,
          status: data.status,
        }
      }

      // Código enviado com sucesso
      return {
        error: false,
        message: data.message || 'Código enviado com sucesso',
        two_factor: true,
        phone: data.phone,
      }
    }
    catch (error: any) {
      // Retorna erro genérico
      return {
        error: true,
        message: error.data?.message || error.message || 'Erro ao enviar código 2FA',
      }
    }
  }

  // Função para verificar 2FA
  const verifyTwoFactor = async (credentials: {
    code: string
    email: string
    password: string
    recaptchaToken?: string
  }): Promise<AuthResponse | { error: boolean, message: string }> => {
    try {
      const requestBody: any = {
        email: credentials.email,
        password: credentials.password,
        code: credentials.code,
      }

      // Adiciona o token do reCAPTCHA se fornecido (será ignorado pelo backend por enquanto)
      if (credentials.recaptchaToken) {
        requestBody.recaptchaToken = credentials.recaptchaToken
      }

      const data = await $fetch<any>(getApiUrl('/auth/verify-2fa'), {
        method: 'POST',
        body: requestBody,
      })

      // Verifica se há erro no payload (API NestJS retorna error: 1)
      if (data.error && data.error === 1) {
        const errorMessage = data.message || 'Erro ao validar código'
        return {
          error: true,
          message: errorMessage,
        }
      }

      // Login bem-sucedido após 2FA
      const authData = data as AuthResponse

      // Salva o token e dados do usuário
      token.value = authData.access_token
      user.value = authData.user
      if (authData.level) {
        level.value = authData.level
      }

      // Limpar cache do caixa para forçar nova validação no dashboard
      clearCashierCache()

      // Debug: verificar se o token foi salvo
      console.log('Token salvo após 2FA:', token.value)
      console.log('User salvo após 2FA:', user.value)
      console.log('Cache do caixa limpo para nova validação')

      return authData
    }
    catch (error: any) {
      return {
        error: true,
        message: error.data?.message || error.message || 'Erro ao validar código',
      }
    }
  }

  // Função para fazer logout
  const logout = () => {
    token.value = null
    user.value = null
    level.value = null

    // Limpar cache do caixa no logout
    clearCashierCache()

    navigateTo('/')
  }

  // Função para verificar se o token ainda é válido
  const checkAuth = async (): Promise<boolean> => {
    if (!token.value)
      return false

    try {
      await $fetch(getApiUrl(API_CONFIG.ENDPOINTS.ME), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      return true
    }
    catch {
      logout()
      return false
    }
  }

  // Função de debug para verificar cookies
  const debugCookies = () => {
    console.log('=== DEBUG COOKIES ===')
    console.log('Token cookie:', token.value)
    console.log('User cookie:', user.value)
    console.log('Level cookie:', level.value)
    console.log('Is authenticated:', isAuthenticated.value)

    // Verificar cookies no navegador
    if (process.client) {
      console.log('Todos os cookies:', document.cookie)
    }
    console.log('=====================')
  }

  return {
    token,
    user: currentUser,
    level,
    isAuthenticated,
    login,
    verifyTwoFactor,
    logout,
    checkAuth,
    debugCookies,
  }
}

// Composable para requisições autenticadas
export function useApi() {
  const useCustomFetch = async <T = any>(
    url: string,
    options: any = {},
  ): Promise<{ data: T }> => {
    // Obter token fresh a cada requisição para evitar problemas de SSR/hidratação
    const { token } = useAuth()

    // Debug: verificar se o token está disponível
    console.log('Token disponível para requisição:', token.value ? 'SIM' : 'NÃO')
    console.log('URL da requisição:', url)

    const headers: any = { ...options.headers }
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
      console.log('Header Authorization adicionado')
    }
    else {
      console.log('Token não encontrado, requisição sem autenticação')
    }

    const defaults = {
      baseURL: API_CONFIG.BASE_URL,
      headers,
      onResponseError: (ctx: any) => {
        console.log('Erro na resposta:', ctx)
        if (ctx?.response?.status === 401) {
          // Token expirado ou inválido
          const { logout } = useAuth()
          logout()
        }
      },
    }

    const finalOptions = { ...defaults, ...options, headers }
    const data = await $fetch<T>(url, finalOptions)

    // Verifica se há erro no payload (API NestJS retorna error: 1)
    if (data && typeof data === 'object' && 'error' in data && (data as any).error === 1) {
      const errorData = data as any
      const errorMessage = errorData.message || 'Erro na requisição'
      throw new Error(errorMessage)
    }

    return { data }
  }

  return { useCustomFetch }
}
