# Zakres prac — co jest obiecane klientowi

Lista zobowiązań wysłanych Krzysztofowi Wróblowi 21.09.2026, z aktualnym stanem
każdego z nich.

**Po co ten plik istnieje.** Obietnice złożone w mailu żyją w mailu i po dwóch
miesiącach nikt nie pamięta, czy „ogarnięcie RODO" obejmowało politykę
prywatności, czy tylko zgody w formularzu. Tutaj każda pozycja ma zapisane
**co konkretnie znaczy „zrobione"** — i to jest najważniejsza kolumna, bo bez
niej rozbieżność wychodzi dopiero przy odbiorze.

`CLAUDE.md` niesie decyzje techniczne i ich powody. Ten plik niesie
zobowiązania wobec klienta. Dwie różne rzeczy, dwa pliki.

**Aktualizuj przy dowożeniu, nie na końcu.** Pozycja przechodzi na `gotowe`
dopiero wtedy, gdy spełnia swoją definicję z drugiej kolumny — nie wtedy, gdy
„w zasadzie działa".

---

## Zobowiązania terminowe

| Co | Termin |
|---|---|
| Poprawki błędów i drobne zmiany **w cenie** | do 31.12.2026 |
| Od stycznia 2027 — bieżąca opieka za osobno ustaloną kwotę | do ustalenia |

---

## Stan pozycji

Numeracja jak w wiadomości do Krzyśka.

| # | Obietnica | Co znaczy „zrobione" | Stan |
|---|---|---|---|
| 1 | Strona z panelem, przeniesienie treści | 12 tras, panel po polsku, treść ze starej strony | **gotowe** |
| 1b | Przekierowania 301 ze **starych adresów Joomli** | każdy adres starej strony kieruje na odpowiednik; sprawdzone w Search Console | **do zrobienia** |
| 2 | System zarządzania obozami | formularz zapisu + obsługa zgłoszeń w panelu (rozbicie niżej) | **do zrobienia** |
| 3 | Powiadomienia mailowe | mail wychodzi przy nowym zgłoszeniu i zapisie na obóz | **do zrobienia** |
| 4 | Newsletter | zapis działa, zgoda wersjonowana | **gotowe** |
| 4b | Zapis na kurs „w 10 sekund" | skrócona ścieżka zapisu z podstrony kursu | **do zrobienia** |
| 5 | RODO i polityka prywatności | rozbicie niżej | **częściowo** |
| 6 | Bez banera ciasteczek, bez przekazywania danych | brak trackerów, brak ciasteczek innych niż sesyjne | **gotowe** |
| 7 | Backupy szyfrowane dwupoziomowo | skrypt na serwerze + wysyłka na Drive + **odtworzenie przetestowane** | **do zrobienia** |
| 8 | Testy automatyczne | jednostkowe **i integracyjne** | **częściowo** |
| 9 | Testy wydajnościowe i na wycieki pamięci | raport z liczbami | **do zrobienia** |
| 10 | Testy manualne | spisany scenariusz + wynik przejścia | **do zrobienia** |
| 11 | Security | rozbicie niżej | **częściowo** |
| 12 | Szybkość działania | zmierzone Core Web Vitals, wynik zielony na telefonie | **do zrobienia** |
| 13 | Analityka bez ciasteczek | Plausible albo Umami na własnym serwerze | **do zrobienia** |
| 14 | Monitoring dostępności | alert dochodzi do mnie, gdy strona nie odpowiada | **do zrobienia** |
| 15 | Szkolenie i instrukcja | przejście przez panel + instrukcja na piśmie | **do zrobienia** |
| 16 | Poprawki do końca grudnia w cenie | zobowiązanie terminowe, patrz wyżej | **w toku** |

### Rozbicie pozycji 2 — system obozów

Obiecane wprost w wiadomości, więc żadnego z tych punktów nie da się pominąć:

- [ ] formularz zbiera **dane rodzica** i jego zgodę na udział dziecka, osobno od danych uczestnika
- [ ] **dane o zdrowiu** (alergie, leki, czy dziecko pływa) jako osobna kategoria: odrębna zgoda, szyfrowanie, krótszy okres przechowywania
- [ ] system składa **gotową kartę kwalifikacyjną uczestnika** z danych wpisanych przez rodzica
- [ ] statusy zgłoszenia: zgłoszony → potwierdzony → zaliczka → opłacony → rezygnacja
- [ ] obsługa rezygnacji i **listy rezerwowej** (kto dostaje zwolnione miejsce)
- [ ] w panelu: statystyki, powiadomienia, lista rzeczy do zrobienia

Płatności **przelewem na konto**, bez operatora online — patrz „Poza zakresem".

### Uwaga do pozycji 1b — co już jest, a czego nie ma

`deploy/nginx.conf` ma **dwa** przekierowania 301: z HTTP na HTTPS i z `www`
na adres bez `www`. To nie jest to samo co pozycja 1b. Brakuje mapowania
starych adresów Joomli (`/kursy/kurs-skalkowy-pza`,
`/kursy/kursnaubezpioeczonych`, `/rekreacja/obozy-jura-lato`, `/kalendarz`
i pozostałych) na nowe. Bez tego Google potraktuje przeprowadzkę jak
skasowanie dwudziestu stron.

### Rozbicie pozycji 5 — RODO

| Element | Stan |
|---|---|
| Zgody zapisywane treścią i wersją, nie znacznikiem „tak" | gotowe |
| Osobna klauzula marketingowa dla newslettera | gotowe |
| Strona z polityką prywatności | **do zrobienia** |
| Okresy przechowywania (zgłoszenia, zapisy, dane zdrowotne) | **do zrobienia** |
| Podwyższone wymagania przy danych dzieci i danych o zdrowiu | **do zrobienia** |
| Umowa powierzenia przetwarzania między Krzyśkiem a wykonawcą | **do zrobienia** |
| Mechanizm usunięcia danych na żądanie | **do zrobienia** |

### Rozbicie pozycji 11 — security

| Element | Stan |
|---|---|
| Content-Security-Policy (ustawiana przez aplikację, nie nginx) | gotowe |
| Nagłówki: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | gotowe |
| Uprawnienia deklarowane w kodzie przy każdej kolekcji | gotowe |
| Skan zależności w CI (Trivy + `npm audit`, bramka blokująca) | gotowe |
| GraphQL wyłączony, żeby nie wystawiać schematu | gotowe |
| Walidacja po stronie serwera, nie tylko w HTML-u | gotowe |
| Pułapka na roboty w obu formularzach | gotowe |
| Przegląd całości pod kątem bezpieczeństwa, spisany | **do zrobienia** |

### Rozbicie pozycji 8 — testy

- **gotowe:** 41 testów jednostkowych (`web/src/lib/lib.test.ts`), uruchamiane
  w CI, przechodzą pod czterema strefami czasowymi
- **do zrobienia:** testy integracyjne — przejście formularza od wysyłki do
  zapisu w bazie, zapis na obóz, logowanie do panelu

---

## Poza zakresem — zapisane, żeby nie wróciło jako „a myślałem, że…"

| Co | Dlaczego |
|---|---|
| **TFG** | Krzysiek prowadzi we własnym zakresie. Ustalone 21.09.2026. Uwaga: wypadnięcie z zakresu prac nie zdejmuje z niego obowiązku — deklaracja zerowa należy się nawet w miesiącu bez umów. |
| **Płatności online** | Odradzone i odrzucone: operator, prowizje, regulamin zwrotów, kolejna firma między szkołą a klientem. Wejdą tylko na wyraźne życzenie. |
| **Pełne tłumaczenie serwisu** | Jedna strona `/en` zamiast dwujęzyczności całości. Pełna wersja oznaczałaby tłumaczenie każdego kursu i wpisu przy każdej zmianie. |
| **Cloudflare** | Zaproponowany, jeszcze nie przyjęty. Jeśli wejdzie — **dopisać go do obietnicy z punktu 6** jako firmę, przez którą przechodzi ruch. |

---

## Do potwierdzenia z Krzyśkiem

Blokują dowiezienie albo mogą wymusić przeróbkę:

1. **Ceny kursów** — wzięte ze starej strony, mogły się zmienić.
2. **Daty turnusów 2027** — układ i ceny prawdziwe, daty przesunięte o sezon,
   bo lato 2026 minęło. Jedyne zmyślone dane w serwisie.
3. **Zgoda autorów opinii** na publikację. Do czasu potwierdzenia opinie są
   w panelu oznaczone jako nieopublikowane.
4. **Logo w wektorze** (AI/EPS/SVG). Obecny znak to odrys z bitmapy ~90×84 px.
5. **Zdjęcia** — około dwudziestu miejsc w projekcie graficznym, wszystkie
   z zastępnikami.
6. **Zaliczki i rezygnacje** — zasady decydują o kształcie formularza zapisu,
   więc trzeba je znać przed budową pozycji 2.

---

## Skąd to się wzięło

Treść wysłana Krzyśkowi jest w artefakcie „Zakres prac ABC Wspinania".
Gdyby zakres się zmienił, **najpierw ten plik, potem rozmowa** — inaczej za
miesiąc znowu nie będzie wiadomo, co było ustalone.
