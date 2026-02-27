// composables/useAuth.ts
import { API_CONFIG, getApiUrl } from '~/utils/config'

// Tipos para autenticação
interface User {
  id: string
  email: string
  name: string
  photo?: string
  onboardingStatus?: string
  userType?: string
  isAdmin?: boolean
  level?: string
  tenantId?: string
  affiliateProfile?: any
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
    canViewSensitiveData: boolean
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
    slug?: string
  }
}

interface AuthResponse {
  error?: boolean
  message?: string
  access_token: string
  user: User
  level?: string
  two_factor?: boolean
  phone?: string
  email?: string
}

interface LoginCredentials {
  email: string
  password: string
  recaptchaToken?: string
  method?: 'SMS' | 'EMAIL'
}

// Função para limpar cache do caixa
function clearCashierCache() {
  if (process.client) {
    localStorage.removeItem('casino_cashier_status')
    localStorage.removeItem('casino_cashier_data')
  }
}

export function useAuth() {
  const tokenCookie = useCookie<string | null>(API_CONFIG.TOKEN.COOKIE_NAME, {
    default: () => null,
    maxAge: API_CONFIG.TOKEN.MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const userCookie = useCookie<User | null>(API_CONFIG.TOKEN.USER_COOKIE_NAME, {
    default: () => null,
    maxAge: API_CONFIG.TOKEN.MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const levelCookie = useCookie<string | null>('level', {
    default: () => null,
    maxAge: API_CONFIG.TOKEN.MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // Global reactive state synced with cookies
  const token = useState('auth:token', () => tokenCookie.value)
  const user = useState('auth:user', () => userCookie.value)
  const level = useState('auth:level', () => levelCookie.value)

  // Sync state to cookies
  watch(token, (val) => { tokenCookie.value = val })
  watch(user, (val) => { userCookie.value = val })
  watch(level, (val) => { levelCookie.value = val })

  const isAuthenticated = computed(() => !!token.value)

  const currentUser = computed<User | null>(() => {
    return user.value as User | null
  })

  // Função para fazer login (agora sempre requer 2FA)
  const login = async (credentials: LoginCredentials): Promise<AuthResponse | { error: boolean, message: string, two_factor?: boolean, status?: string, phone?: string, email?: string }> => {
    try {
      // Primeiro, enviar código 2FA
      const requestBody: any = {
        email: credentials.email,
        password: credentials.password,
        method: credentials.method || 'SMS',
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
        email: data.email,
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

  // Helper to sanitize user data for cookie storage (avoid 4KB limit)
  const sanitizeUser = (rawUser: any): User => {
    return {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      photo: rawUser.photo,
      onboardingStatus: rawUser.onboardingStatus,
      userType: rawUser.userType,
      isAdmin: rawUser.isAdmin,
      level: rawUser.level,
      role: rawUser.role ? {
        id: rawUser.role.id,
        name: rawUser.role.name,
        canViewAllCards: rawUser.role.canViewAllCards,
        canManageTeam: rawUser.role.canManageTeam,
        canManageClients: rawUser.role.canManageClients,
        canManageSettings: rawUser.role.canManageSettings,
        canExportData: rawUser.role.canExportData,
        canDeleteRecords: rawUser.role.canDeleteRecords,
        canCreateIR: rawUser.role.canCreateIR,
        canEditIR: rawUser.role.canEditIR,
        canMoveToFinalColumn: rawUser.role.canMoveToFinalColumn,
        canImportDocs: rawUser.role.canImportDocs,
        canViewFinancialCharts: rawUser.role.canViewFinancialCharts,
        canViewDrive: rawUser.role.canViewDrive,
        canManageChecklist: rawUser.role.canManageChecklist,
        canManageKanban: rawUser.role.canManageKanban,
        canViewSensitiveData: rawUser.role.canViewSensitiveData,
      } : undefined,
      tenantId: rawUser.tenantId,
      affiliateProfile: rawUser.affiliateProfile,
      tenant: rawUser.tenant ? {
        id: rawUser.tenant.id,
        name: rawUser.tenant.name,
        tradeName: rawUser.tenant.tradeName,
        document: rawUser.tenant.document,
        logo: rawUser.tenant.logo,
        primaryColor: rawUser.tenant.primaryColor,
        secondaryColor: rawUser.tenant.secondaryColor,
        pixKey: rawUser.tenant.pixKey,
        slug: rawUser.tenant.slug,
      } : undefined,
    } as User
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

      // Salva o token
      token.value = authData.access_token

      // Sanitizar objeto de usuário para evitar estouro do tamanho do cookie (4KB)
      user.value = sanitizeUser(authData.user)

      if (authData.level) {
        level.value = authData.level
      }

      // Verificação de segurança: Checar se o cookie foi realmente setado
      if (process.client) {
        // Pequeno delay para garantir que o navegador processou o cookie
        await new Promise(resolve => setTimeout(resolve, 100))

        const tokenCookieName = API_CONFIG.TOKEN.COOKIE_NAME
        const cookies = document.cookie.split(';')
        const hasTokenCookie = cookies.some(c => c.trim().startsWith(`${tokenCookieName}=`))

        if (!hasTokenCookie) {
          // Rollback
          token.value = null
          user.value = null
          level.value = null

          return {
            error: true,
            message: 'Erro ao salvar sessão. Verifique se os cookies estão habilitados e tente novamente.',
          }
        }
      }

      // Limpar cache do caixa para forçar nova validação no dashboard
      clearCashierCache()

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

  // Função para buscar dados atualizados do usuário
  const fetchUser = async (): Promise<User | null> => {
    if (!token.value) return null

    try {
      const data = await $fetch<any>(getApiUrl(API_CONFIG.ENDPOINTS.ME), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })

      if (data) {
        const sanitized = sanitizeUser(data)
        user.value = sanitized
        console.log('Dados do usuário atualizados:', sanitized)
        return sanitized
      }
      return null
    }
    catch (e) {
      console.error('Erro ao buscar dados do usuário:', e)
      return null
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
    user,
    level,
    isAuthenticated,
    login,
    verifyTwoFactor,
    logout,
    checkAuth,
    fetchUser,
    debugCookies,
  }
}


// Composable para requisições autenticadas
export function useApi() {
  const auth = useAuth()

  const useCustomFetch = async <T = any>(
    url: string,
    options: any = {},
  ): Promise<{ data: T }> => {
    // Obter token fresh a cada requisição para evitar problemas de SSR/hidratação
    const { token } = auth

    // Debug: verificar se o token está disponível
    // console.log('Token disponível para requisição:', token.value ? 'SIM' : 'NÃO')
    // console.log('URL da requisição:', url)

    const headers: any = { ...options.headers }
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }

    const defaults = {
      baseURL: API_CONFIG.BASE_URL,
      headers,
      onResponseError: (ctx: any) => {
        if (ctx?.response?.status === 401) {
          // Token expirado ou inválido
          auth.logout()
        }
      },
    }

    const finalOptions = { ...defaults, ...options, headers }

    try {
      const data = await $fetch<T>(url, finalOptions)

      // Verifica se há erro no payload (API NestJS retorna error: 1)
      if (data && typeof data === 'object' && 'error' in data && (data as any).error === 1) {
        const errorData = data as any
        const errorMessage = errorData.message || 'Erro na requisição'
        throw new Error(errorMessage)
      }

      return { data }
    } catch (error: any) {
      // Tenta extrair a mensagem de erro do backend (NestJS / OFetch)
      const backendMessage = error.response?._data?.message || error.data?.message || error.message

      // Se for array (erros de validação), junta as mensagens
      const finalMessage = Array.isArray(backendMessage)
        ? backendMessage.join(', ')
        : backendMessage

      // Se a mensagem for a URL (comportamento padrão do fetch error), usa mensagem genérica
      if (finalMessage && (typeof finalMessage === 'string' && (finalMessage.includes('http') || finalMessage.includes('fetch')))) {
        throw new Error('Erro de conexão com o servidor')
      }

      throw new Error(finalMessage || 'Erro ao processar requisição')
    }
  }

  return { useCustomFetch }
}
