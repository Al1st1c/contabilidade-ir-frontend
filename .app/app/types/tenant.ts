export interface TenantData {
  id: string
  name: string
  tradeName?: string
  document?: string
  email?: string
  phone?: string
  whatsapp?: string
  city?: string
  state?: string
  zipCode?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  plan?: string
  trialEndsAt?: string
  users?: number
  clients?: number
  taxDeclarations?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
