import { format, isDate, parseISO } from '~/utils/bundles/date-fns'
import { ptBR } from 'date-fns/locale'

const DateFormats = {
  Short: 'dd/MM/yyyy',
  Long: 'dd/MM/yyyy HH:mm',
}

export type DateFormatsNames = keyof typeof DateFormats

export function formatDate(date?: any, pattern: DateFormatsNames = 'Short') {
  if (!date)
    return ''
  if (isDate(date))
    return format(date, DateFormats[pattern], { locale: ptBR })
  return format(parseISO(date), DateFormats[pattern], { locale: ptBR })
}
