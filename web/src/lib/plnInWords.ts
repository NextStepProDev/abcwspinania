/**
 * An amount of złoty in Polish words, for the contract ("2500 zł (dwa
 * tysiące pięćset złotych)"). Whole złoty only, 0 to 999 999 — a camp's
 * price. Pure, tested under `node --test`.
 *
 * The wzór umowy had "2500 zł ( dwa tysiące czterysta złotych)" typed by
 * hand; from the number the two cannot disagree.
 */

const ONES = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć']
const TEENS = [
  'dziesięć',
  'jedenaście',
  'dwanaście',
  'trzynaście',
  'czternaście',
  'piętnaście',
  'szesnaście',
  'siedemnaście',
  'osiemnaście',
  'dziewiętnaście',
]
const TENS = [
  '',
  '',
  'dwadzieścia',
  'trzydzieści',
  'czterdzieści',
  'pięćdziesiąt',
  'sześćdziesiąt',
  'siedemdziesiąt',
  'osiemdziesiąt',
  'dziewięćdziesiąt',
]
const HUNDREDS = [
  '',
  'sto',
  'dwieście',
  'trzysta',
  'czterysta',
  'pięćset',
  'sześćset',
  'siedemset',
  'osiemset',
  'dziewięćset',
]

/** One, few or many — Polish noun forms after a number. */
function form(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const lastDigit = n % 10
  const lastTwo = n % 100
  return lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many
}

function below1000(n: number): string[] {
  const words = [HUNDREDS[Math.floor(n / 100)]!]
  const rest = n % 100
  if (rest >= 10 && rest < 20) words.push(TEENS[rest - 10]!)
  else words.push(TENS[Math.floor(rest / 10)]!, ONES[rest % 10]!)
  return words.filter(Boolean)
}

export function plnInWords(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0 || amount > 999_999) {
    throw new RangeError(`plnInWords: ${amount} out of range`)
  }
  if (amount === 0) return 'zero złotych'
  const thousands = Math.floor(amount / 1000)
  const rest = amount % 1000
  const words: string[] = []
  if (thousands === 1) words.push('tysiąc')
  else if (thousands > 1)
    words.push(...below1000(thousands), form(thousands, 'tysiąc', 'tysiące', 'tysięcy'))
  words.push(...below1000(rest))
  return `${words.join(' ')} ${form(amount, 'złoty', 'złote', 'złotych')}`
}
