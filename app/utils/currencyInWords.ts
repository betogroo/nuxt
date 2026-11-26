const UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']

const TEENS = [
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
]

const TENS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
]

const HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
]

/**
 * Converts a group of 1 to 3 digits (0 - 999) into words in Brazilian Portuguese.
 */
function convertGroup(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'

  const h = Math.floor(n / 100)
  const remainder = n % 100
  const t = Math.floor(remainder / 10)
  const u = remainder % 10

  const parts: string[] = []

  if (h > 0) {
    parts.push(HUNDREDS[h]!)
  }

  if (remainder >= 10 && remainder <= 19) {
    parts.push(TEENS[remainder - 10]!)
  } else {
    if (t >= 2) {
      parts.push(TENS[t]!)
    }
    if (u > 0) {
      parts.push(UNITS[u]!)
    }
  }

  return parts.join(' e ')
}

/**
 * Converts an integer number into words in Brazilian Portuguese.
 */
export function integerToWordsPtBr(num: number): string {
  if (num === 0) return 'zero'

  const billions = Math.floor(num / 1_000_000_000)
  const millions = Math.floor((num % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((num % 1_000_000) / 1_000)
  const units = num % 1_000

  const parts: string[] = []

  if (billions > 0) {
    const billText = convertGroup(billions)
    parts.push(`${billText} ${billions === 1 ? 'bilhão' : 'bilhões'}`)
  }

  if (millions > 0) {
    const millText = convertGroup(millions)
    parts.push(`${millText} ${millions === 1 ? 'milhão' : 'milhões'}`)
  }

  if (thousands > 0) {
    if (thousands === 1 && parts.length === 0) {
      parts.push('mil')
    } else {
      parts.push(`${convertGroup(thousands)} mil`)
    }
  }

  if (units > 0) {
    parts.push(convertGroup(units))
  }

  // Join rules for Brazilian Portuguese:
  // e.g. "vinte e quatro mil e oitocentos", "um milhão e duzentos mil", "mil duzentos e cinquenta"
  if (parts.length === 1) {
    return parts[0]!
  }

  // If the last group is units (1..999), determine if we use "e" or space
  // Rule: connect with "e" if units < 100 or units % 100 === 0 (e.g. 800)
  let result = parts[0]!
  for (let i = 1; i < parts.length; i++) {
    const isLast = i === parts.length - 1
    if (isLast && units > 0 && (units < 100 || units % 100 === 0)) {
      result += ' e ' + parts[i]
    } else if (isLast && units > 0 && thousands > 0 && millions === 0 && billions === 0) {
      // e.g. 1.250 -> mil duzentos e cinquenta
      result += ' ' + parts[i]
    } else {
      // E.g. Between millions and thousands if thousands has round hundreds or < 100
      result += ' e ' + parts[i]
    }
  }

  return result
}

/**
 * Converts a currency value in BRL (Brazilian Reais) to words in Brazilian Portuguese.
 *
 * Example:
 * 24800.00 -> "vinte e quatro mil e oitocentos reais"
 * 24800.50 -> "vinte e quatro mil e oitocentos reais e cinquenta centavos"
 * 1.00 -> "um real"
 * 0.75 -> "setenta e cinco centavos"
 */
export function formatCurrencyInWords(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return ''

  const rounded = Math.round(Math.abs(amount) * 100) / 100
  const integerPart = Math.floor(rounded)
  const centsPart = Math.round((rounded - integerPart) * 100)

  const parts: string[] = []

  if (integerPart > 0) {
    const textInt = integerToWordsPtBr(integerPart)
    // If ends in "milhão" or "milhões" or "bilhão" or "bilhões" with 0 lower units
    const isEndingInMillionOrBillion = integerPart >= 1_000_000 && integerPart % 1_000_000 === 0

    const currencyWord = isEndingInMillionOrBillion
      ? 'de reais'
      : integerPart === 1
        ? 'real'
        : 'reais'

    parts.push(`${textInt} ${currencyWord}`)
  }

  if (centsPart > 0) {
    const textCents = convertGroup(centsPart)
    const centsWord = centsPart === 1 ? 'centavo' : 'centavos'
    parts.push(`${textCents} ${centsWord}`)
  }

  if (parts.length === 0) {
    return 'zero real'
  }

  return parts.join(' e ')
}
