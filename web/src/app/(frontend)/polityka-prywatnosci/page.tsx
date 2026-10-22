import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/Ui'
import {
  UNVERIFIED_ACCOUNT_DAYS,
  PENDING_NEWSLETTER_DAYS,
  BOOKING_RETENTION_YEARS,
  CAMP_HEALTH_RETENTION_MONTHS,
  MESSAGE_RETENTION_MONTHS,
} from '@/lib/expiry'
import { CONTROLLER, PRIVACY_POLICY_VERSION } from '@/lib/legal'
import { pageMetadata } from '@/lib/seo'
import {
  PolicyList as List,
  PolicyMail,
  PolicySection as Section,
  policyDate,
  policyLinkClass,
} from '@/components/PolicyParts'

/**
 * The privacy policy (ZAKRES item 5).
 *
 * Written from what the site actually does, not from a template: every
 * period below is one the code enforces (the daily sweep in
 * `lib/accountCleanup.ts`, the backup retention in `deploy/abc-backup.sh`,
 * the log rotation in `deploy/docker-compose.prod.yml`) or one stated as a
 * rule for the school. Change what the site does — change this page and
 * `PRIVACY_POLICY_VERSION` with it.
 *
 * A static page in code, not a panel global: legal text that changes with
 * the code's behaviour belongs next to that code, versioned with it.
 *
 * ⚠️ Translated: `/en/privacy-policy`. Change this text — change that one in
 * the same commit (same `PRIVACY_POLICY_VERSION`).
 */

export function generateMetadata(): Metadata {
  const base = pageMetadata({
    title: 'Polityka prywatności',
    description:
      'Kto przetwarza Twoje dane w ABC Wspinania, w jakim celu, jak długo i jakie masz prawa.',
    path: '/polityka-prywatnosci',
  })
  return {
    ...base,
    alternates: { ...base.alternates, languages: { en: '/en/privacy-policy' } },
  }
}

const mail = <PolicyMail />

export default function PrivacyPolicyPage() {
  return (
    <main>
      <Container className="pb-16 pt-10 lg:pb-24 lg:pt-14">
        <article className="mx-auto max-w-[760px]">
          <h1 className="text-balance text-[34px] leading-[1.1] lg:text-[44px]">
            Polityka prywatności
          </h1>
          <p className="mt-3 text-rock-600">Wersja z dnia {policyDate(PRIVACY_POLICY_VERSION)}</p>

          <Section title="Kto odpowiada za Twoje dane">
            <p>
              Administratorem danych osobowych zbieranych przez stronę szkoły ABC Wspinania jest{' '}
              <strong>{CONTROLLER.person}</strong>, prowadzący działalność gospodarczą pod firmą{' '}
              <strong>{CONTROLLER.businessName}</strong>, {CONTROLLER.street}, {CONTROLLER.postcode}{' '}
              {CONTROLLER.town}, NIP {CONTROLLER.nip}, REGON {CONTROLLER.regon}.
            </p>
            <p>
              We wszystkich sprawach dotyczących danych osobowych pisz na {mail}. Odpowiadamy
              najpóźniej w ciągu miesiąca.
            </p>
          </Section>

          <Section title="Jakie dane zbieramy i po co">
            <p>Zbieramy tylko to, co jest potrzebne do danej sprawy:</p>
            <List>
              <li>
                <strong>Formularz kontaktowy</strong> — imię, adres e-mail, telefon (jeśli go
                podasz) i treść wiadomości. Po to, żeby odpowiedzieć na Twoje pytanie. Podstawa:
                Twoja zgoda (art. 6 ust. 1 lit. a RODO) oraz odpowiedź na zapytanie przed ewentualną
                umową (art. 6 ust. 1 lit. b RODO).
              </li>
              <li>
                <strong>Zapis na kurs</strong> — imię, nazwisko, adres e-mail, telefon i uwagi do
                zapisu. Po to, żeby zorganizować kurs: potwierdzić miejsce, przekazać informacje o
                zajęciach, rozliczyć płatność. Podstawa: umowa o udział w kursie (art. 6 ust. 1 lit.
                b RODO), a w zakresie rozliczeń — obowiązki podatkowe (art. 6 ust. 1 lit. c RODO).
              </li>
              <li>
                <strong>Zapis dziecka na obóz</strong> — dane rodzica lub opiekuna (imię, nazwisko,
                adres e-mail, telefon) oraz imię i nazwisko dziecka. Po to, żeby zarezerwować
                miejsce i przekazać dalsze kroki. Podstawa: umowa o udział dziecka w obozie (art. 6
                ust. 1 lit. b RODO).
              </li>
              <li>
                <strong>Formularz rejestracyjny obozu</strong> — adres zamieszkania rodzica (do
                umowy i faktury), przy fakturze na firmę — jej nazwa, NIP i adres, PESEL i data
                urodzenia dziecka, wzrost (do zamówienia koszulek) oraz informacje o zdrowiu
                dziecka: uczulenia, przyjmowane leki, dieta i choroby, które mogą mieć wpływ na jego
                bezpieczeństwo. Po to, żeby zawrzeć umowę, zorganizować obóz i zapewnić dziecku
                bezpieczeństwo i opiekę. Podstawa: umowa (art. 6 ust. 1 lit. b RODO), a dla
                informacji o zdrowiu — Twoja wyraźna zgoda (art. 9 ust. 2 lit. a RODO). Informacje o
                zdrowiu widzi tylko szkoła; nie wysyłamy ich mailem.
              </li>
              <li>
                <strong>Zgoda na zdjęcia dziecka</strong> — nieobowiązkowa. Jeśli ją wyrazisz,
                możemy publikować zdjęcia i nagrania z obozu, na których widać dziecko, na stronie i
                w naszych mediach społecznościowych. Podstawa: Twoja zgoda (art. 6 ust. 1 lit. a
                RODO), którą możesz wycofać w każdej chwili.
              </li>
              <li>
                <strong>Konto uczestnika</strong> — imię, nazwisko, adres e-mail, telefon, wybrany
                język wiadomości i hasło (przechowywane jako skrót kryptograficzny, z którego nie da
                się go odtworzyć — nie zna go nikt, także szkoła). Po to, żeby prowadzić konto i
                pokazywać Twoje zapisy. Podstawa: umowa o prowadzenie konta (art. 6 ust. 1 lit. b
                RODO).
              </li>
              <li>
                <strong>Newsletter</strong> — adres e-mail i wybrany język. Po to, żeby wysyłać
                informacje o terminach kursów, obozach i nowych tekstach. Podstawa: Twoja zgoda
                (art. 6 ust. 1 lit. a RODO). Zapis wymaga potwierdzenia linkiem z maila — dzięki
                temu nikt nie zapisze cudzego adresu.
              </li>
              <li>
                <strong>Wiadomości do zapisanych na kurs lub obóz</strong> — jeśli masz zapis (albo
                zapisałeś dziecko), możemy napisać do Ciebie w jego sprawie (np. godzina zbiórki, co
                spakować, zmiana planu). To część organizacji, nie marketing.
              </li>
              <li>
                <strong>Dzienniki serwera</strong> — przy każdej wizycie serwer zapisuje techniczne
                informacje: adres IP, datę, odwiedzany adres i rodzaj przeglądarki. Po to, żeby
                chronić stronę przed nadużyciami i wykrywać awarie. Podstawa: nasz prawnie
                uzasadniony interes (art. 6 ust. 1 lit. f RODO).
              </li>
            </List>
            <p>
              Podanie danych jest dobrowolne, ale bez nich nie odpowiemy na wiadomość, nie zapiszemy
              Cię na kurs ani dziecka na obóz i nie założymy konta.
            </p>
          </Section>

          <Section title="Jak długo przechowujemy dane">
            <List>
              <li>
                <strong>Wiadomości z formularza</strong> — {MESSAGE_RETENTION_MONTHS} miesięcy od
                wysłania, potem są usuwane automatycznie.
              </li>
              <li>
                <strong>Zapisy na kursy</strong> — przez czas organizacji kursu, a potem przez{' '}
                {BOOKING_RETENTION_YEARS} lat od końca roku, w którym kurs się odbył (rozliczenia i
                ewentualne roszczenia). Potem, 1 stycznia, automatycznie usuwamy z nich dane osobowe
                (imię, nazwisko, e-mail, telefon, uwagi) — zostaje tylko anonimowa informacja o
                terminie i liczbie uczestników, do statystyk. Wyjątek: zapisy przypięte do Twojego
                konta zostają, dopóki masz konto — to Twoja historia w zakładce Moje konto. Po
                usunięciu konta obowiązuje ta sama zasada {BOOKING_RETENTION_YEARS} lat.
              </li>
              <li>
                <strong>Zapisy na obozy</strong> — tak samo jak zapisy na kursy:{' '}
                {BOOKING_RETENTION_YEARS} lat od końca roku obozu, potem usuwamy z nich dane osobowe
                rodzica i dziecka (w tym adres i datę urodzenia).
              </li>
              <li>
                <strong>PESEL i informacje o zdrowiu dziecka</strong> z formularza rejestracyjnego —
                krócej: usuwamy je automatycznie{' '}
                {CAMP_HEALTH_RETENTION_MONTHS === 1
                  ? 'miesiąc'
                  : `${CAMP_HEALTH_RETENTION_MONTHS} miesiące`}{' '}
                po zakończeniu obozu.
              </li>
              <li>
                <strong>Konto</strong> — dopóki go nie usuniesz. Konto niepotwierdzone usuwamy
                automatycznie po {UNVERIFIED_ACCOUNT_DAYS} dniach. Po usunięciu konta zapisy na
                kursy zostają w szkole (bez powiązania z kontem) na zasadach opisanych wyżej.
              </li>
              <li>
                <strong>Newsletter</strong> — do czasu wypisania się. Niepotwierdzony zapis usuwamy
                automatycznie po {PENDING_NEWSLETTER_DAYS} dniach. Po wypisaniu zachowujemy adres,
                treść udzielonej zgody oraz daty zapisu i wypisania — żeby móc wykazać, na co zgoda
                została udzielona i kiedy ją wycofano.
              </li>
              <li>
                <strong>Dzienniki serwera</strong> — mają ograniczoną objętość; najstarsze wpisy są
                automatycznie nadpisywane nowymi.
              </li>
              <li>
                <strong>Kopie zapasowe</strong> — zaszyfrowane kopie bazy danych przechowujemy do 40
                dni, potem są usuwane automatycznie.
              </li>
            </List>
          </Section>

          <Section title="Komu przekazujemy dane">
            <p>
              Nie sprzedajemy danych i nie przekazujemy ich nikomu w celach marketingowych.
              Korzystamy z usług zaufanych firm, które przetwarzają dane wyłącznie na nasze
              zlecenie:
            </p>
            <List>
              <li>
                <strong>Dostawca serwera</strong> (centrum danych w Unii Europejskiej) — serwer, na
                którym działa strona i baza danych.
              </li>
              <li>
                <strong>Brevo</strong> (Sendinblue SAS, Francja, UE) — wysyłka maili: potwierdzeń
                zapisów, wiadomości do uczestników i newslettera. Maile nie zawierają informacji o
                zdrowiu ani numeru PESEL. Brevo dodaje do wiadomości mechanizm zliczania otwarć i
                kliknięć w linki; korzystamy z niego w trybie zanonimizowanym — statystyki są
                wyłącznie zbiorcze i nie są przypisywane do konkretnej osoby.
              </li>
              <li>
                <strong>Cloudflare</strong> (Cloudflare, Inc., USA) — pośredniczy w ruchu do strony
                i chroni ją przed atakami; widzi m.in. adres IP odwiedzającego. Przekazanie danych
                do USA odbywa się na podstawie unijnych standardowych klauzul umownych i programu
                EU-US Data Privacy Framework.
              </li>
              <li>
                <strong>Google</strong> (Google Ireland Ltd., UE) — przechowywanie kopii zapasowych
                na Dysku Google. Kopie są szyfrowane, zanim opuszczą nasz serwer, więc Google nie ma
                dostępu do ich treści.
              </li>
              <li>
                <strong>Obsługa techniczna strony</strong> — osoba, która utrzymuje stronę i serwer.
              </li>
            </List>
            <p>
              Dane możemy też przekazać organom publicznym, jeśli wymaga tego prawo (np. urzędowi
              skarbowemu w zakresie rozliczeń).
            </p>
          </Section>

          <Section title="Twoje prawa">
            <p>Masz prawo:</p>
            <List>
              <li>dostępu do swoich danych i otrzymania ich kopii,</li>
              <li>sprostowania danych, które są nieprawidłowe,</li>
              <li>usunięcia danych („prawo do bycia zapomnianym”),</li>
              <li>ograniczenia przetwarzania,</li>
              <li>przeniesienia danych do innego administratora,</li>
              <li>
                sprzeciwu wobec przetwarzania opartego na naszym uzasadnionym interesie (np.
                dzienniki serwera),
              </li>
              <li>
                wycofania zgody w dowolnym momencie — bez wpływu na to, co zrobiliśmy przed jej
                wycofaniem.
              </li>
            </List>
            <p>
              Najprościej: napisz na {mail}. Część rzeczy zrobisz sam — konto usuniesz w zakładce{' '}
              <Link href="/konto" className={policyLinkClass}>
                Moje konto
              </Link>
              , a z newslettera wypiszesz się linkiem na dole każdej wiadomości.
            </p>
            <p>
              Jeśli uważasz, że przetwarzamy Twoje dane niezgodnie z prawem, możesz złożyć skargę do
              Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl).
            </p>
          </Section>

          <Section title="Ciasteczka">
            <p>
              Strona nie używa ciasteczek reklamowych ani analitycznych i nie śledzi Cię między
              stronami. Dlatego nie pokazujemy banera zgody na ciasteczka.
            </p>
            <p>
              Używamy tylko ciasteczka niezbędnego do logowania (<code>payload-token</code>) —
              zapisuje się, gdy się zalogujesz, i pozwala nie logować się przy każdej podstronie.
              Cloudflare może dodatkowo zapisać techniczne ciasteczko służące ochronie strony przed
              botami.
            </p>
          </Section>

          <Section title="Bezpieczeństwo">
            <p>
              Połączenie ze stroną jest szyfrowane (HTTPS). Hasła do kont przechowujemy jako skrót
              kryptograficzny, z którego nie da się ich odtworzyć. Dostęp do danych w panelu ma
              tylko szkoła — dotyczy to zwłaszcza informacji o zdrowiu dzieci, przechowywanych
              osobno i usuwanych miesiąc po obozie. Kopie zapasowe są szyfrowane przed wysłaniem
              poza serwer.
            </p>
          </Section>

          <Section title="Zautomatyzowane decyzje">
            <p>
              Nie podejmujemy wobec Ciebie decyzji w sposób zautomatyzowany i nie profilujemy Cię.
              Jedyny automatyzm to kolejność na liście rezerwowej: gdy kurs albo turnus obozu jest
              pełny, zapis trafia na listę, a o przyjęciu z listy decyduje szkoła.
            </p>
          </Section>

          <Section title="Zmiany polityki">
            <p>
              Jeśli zmienimy sposób przetwarzania danych, zaktualizujemy tę stronę i datę wersji na
              górze.
            </p>
          </Section>
        </article>
      </Container>
    </main>
  )
}
