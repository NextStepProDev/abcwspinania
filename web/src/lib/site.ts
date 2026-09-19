/**
 * Jedno miejsce z danymi identyfikującymi serwis.
 *
 * Domena jest tu WARTOŚCIĄ WYJŚCIOWĄ do potwierdzenia z klientem. Gdy się zmieni,
 * podmieniamy w dwóch miejscach i nigdzie indziej:
 *   1. deploy/nginx.conf (server_name w trzech blokach),
 *   2. zmienna repozytorium SITE_URL w GitHubie — to ona jest wpiekana
 *      w obraz przy budowaniu i trafia tutaj jako NEXT_PUBLIC_SITE_URL.
 * Grep po "abcwspinania.info" musi zwracać wyłącznie te pliki.
 */
export const BRAND = 'ABC Wspinania'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Jawny typ zamiast samego `as const`: przy `as const` puste "" ma typ
// literalny "", więc gałąź prawdziwa `CONTACT.phone ? …` zawęża się do `never`
// i `.replace()` na niej nie kompiluje. Te dwa pola z założenia się zmienią.
export const CONTACT: {
  legalName: string
  street: string
  postalCode: string
  locality: string
  country: string
  phone: string
  email: string
} = {
  /** Dane rejestrowe szkoły. DO POTWIERDZENIA z klientem. */
  legalName: 'ABC Wspinania',
  street: 'Jurajska 47',
  postalCode: '42-421',
  locality: 'Rzędkowice',
  country: 'PL',
  /** DO UZUPEŁNIENIA: telefon i e-mail potwierdzone z Krzyśkiem. */
  phone: '',
  email: '',
}

/**
 * Stary serwis nie miał ANI JEDNEGO linku `tel:` — mimo że wprost zachęcał
 * „Zadzwoń". Numer w formacie E.164 do atrybutu href; pusty, dopóki nie
 * potwierdzimy go z klientem, i wtedy komponenty nie renderują linku zamiast
 * renderować zepsuty.
 */
export function telHref(): string | null {
  return CONTACT.phone ? `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}` : null
}
