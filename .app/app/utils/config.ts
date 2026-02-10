// utils/config.ts

// Configurações da API
export const API_CONFIG = {
  // URL base da API - ajuste conforme seu ambiente
  // BASE_URL: process.env.API_BASE || 'https://dolphin-app-945a9.ondigitalocean.app', // URL do seu backend NestJS
  BASE_URL: process.env.API_BASE || 'https://api.gestorirpf.com.br', // URL do seu backend NestJS

  // Configurações de segurança
  SECURITY: {
    RECAPTCHA_REQUIRED: true, // Habilitado pois você tem a chave configurada
    RECAPTCHA_ACTION: 'login', // Ação do reCAPTCHA
  },

  // Endpoints de autenticação
  ENDPOINTS: {
    LOGIN: '/auth/login',
    // Endpoints que serão implementados no backend
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    CHECK_CODE: '/auth/check-code',
  },

  // Configurações de token
  TOKEN: {
    COOKIE_NAME: 'auth_token',
    USER_COOKIE_NAME: 'auth_user',
    MAX_AGE: 60 * 60 * 24 * 7, // 7 dias
  },
}

// Função para obter a URL completa de um endpoint
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}
