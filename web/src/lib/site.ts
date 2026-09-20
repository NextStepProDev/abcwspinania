/**
 * Stałe identyfikujące serwis, które NIE pochodzą z CMS-a.
 *
 * Został tu tylko ten zestaw, który musi być znany bez połączenia z bazą:
 * nazwa marki i adres serwisu (potrzebne przy budowaniu, w `metadataBase`
 * i w mapie strony).
 *
 * Dane kontaktowe — telefon, e-mail, adres, licencja — PRZENIOSŁY SIĘ do
 * globala `ustawienia` w panelu. Powód: były tu z pustymi wartościami
 * i komentarzem „do potwierdzenia z klientem", więc ich uzupełnienie
 * wymagałoby commita, budowania obrazu i deployu na maszynę klienta.
 * Czyta je `getUstawienia()` z `lib/content.ts`.
 *
 * Domena jest WARTOŚCIĄ WYJŚCIOWĄ do potwierdzenia z klientem. Gdy się zmieni,
 * podmieniamy w dwóch miejscach i nigdzie indziej:
 *   1. deploy/nginx.conf (server_name w trzech blokach),
 *   2. zmienna repozytorium SITE_URL w GitHubie — to ona jest wpiekana
 *      w obraz przy budowaniu i trafia tutaj jako NEXT_PUBLIC_SITE_URL.
 * Grep po "abcwspinania.info" musi zwracać wyłącznie te pliki.
 */
export const BRAND = 'ABC Wspinania'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
