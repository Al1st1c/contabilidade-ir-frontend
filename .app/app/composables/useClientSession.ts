export function useClientSession() {
  const selectedTaxYear = useState<number>('client-selected-tax-year', () => {
    // Padrão: Ano Atual (Exercício)
    return new Date().getFullYear()
  })

  const availableYears = computed(() => {
    const currentYear = new Date().getFullYear()
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3].sort((a, b) => b - a)
  })

  return {
    selectedTaxYear,
    availableYears,
  }
}
