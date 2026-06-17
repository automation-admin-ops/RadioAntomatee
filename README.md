# Radio Antomatee 📻🌍

Internetowe radio — polskie i światowe stacje (klubowe, rave, techno, hardstyle, DnB i więcej) z obracającą się kulą ziemską pokazującą, skąd gra aktualna stacja.

🔗 Demo: https://radio-antomatee.vercel.app/

## Motyw „Matrix"

Interfejs w stylu terminala: czerń + fosforowa zieleń, kroje monospace (Share Tech Mono / JetBrains Mono), opadający kod w tle (canvas `#rain`) i delikatny efekt CRT. Przycisk w nagłówku przełącza kolor fosforu **zielony ↔ bursztynowy** (zapis w `localStorage`, klucz `radioantomatee-theme`). Filtry są zwijane (przycisk „Filtry" z odznaką liczby aktywnych), a sortowanie rozbudowano (nazwa, kraj, gatunek, bitrate, ulubione, HIT).

## Struktura projektu

```
index.html              — główny plik aplikacji
manifest.json           — manifest PWA (instalacja na telefonie/pulpicie)
sw.js                   — service worker (cache plików aplikacji)
css/style.css           — wszystkie style (motyw Matrix: zielony + bursztynowy)
js/worlddata.js         — dane geograficzne (kropki lądów + centroidy krajów)
js/globe.js             — kula ziemska (czysty canvas 2D, bez bibliotek)
js/rain.js              — opadający kod „Matrix" (tło)
js/app.js               — logika aplikacji (stacje, odtwarzacz, filtry)
js/presence.js          — licznik osób online (puls do /api/presence)
api/presence.js         — funkcja serverless licząca obecność (Upstash Redis)
icons/                  — ikony PWA (192/512/maskable)
```

## Wdrożenie na GitHub → Vercel


1. **Usuń stary `index.html`** z repozytorium (zostanie zastąpiony nową strukturą).
2. Wgraj **całą zawartość** tego folderu do głównego katalogu repo (z zachowaniem podfolderów `css/`, `js/`, `icons/`).
3. Commit + push → Vercel automatycznie zrobi deploy.

⭐ **Ulubione, głośność i ostatnia stacja zostaną zachowane** — klucz w localStorage (`radioantomatee-config`) jest ten sam co wcześniej.

## Licznik osób online (opcjonalny — wymaga 1 kroku konfiguracji)

W nagłówku pokazuje się plakietka „● N online" — ile osób korzysta z aplikacji w tej chwili
(anonimowo, ogólnie; bez podziału na stacje, bez danych osobowych).

Działa to dzięki małej funkcji serverless `api/presence.js`, która potrzebuje darmowej
bazy **Upstash Redis**. Konfiguracja (jednorazowo, ~2 min):

1. W panelu Vercela otwórz projekt → zakładka **Storage** (lub **Integrations → Marketplace**).
2. Dodaj **Upstash → Redis** (darmowy plan). Pozwól Vercelowi utworzyć bazę i **połącz ją z projektem**.
   Integracja sama ustawi zmienne środowiskowe `KV_REST_API_URL` i `KV_REST_API_TOKEN`.
3. **Redeploy** projektu (Deployments → ⋯ → Redeploy), żeby zmienne zaczęły działać.

Gotowe — plakietka pojawi się sama. Liczbę można też sprawdzić wchodząc na
`https://twoja-domena/api/presence` (zwraca `{"count": N}`).

Jeśli bazy nie skonfigurujesz, aplikacja działa normalnie — plakietka po prostu się nie pokazuje
(funkcja zwraca `{"count": null}`).

Mechanizm: każda otwarta karta wysyła „puls" do `api/presence` co ~25 s; funkcja trzyma w Redisie
zbiór sesji wygasających po 60 s i zwraca ich liczbę. Częstotliwość pulsu (`HEARTBEAT_MS` w
`js/presence.js`) i okno ważności (`WINDOW` w `api/presence.js`) można dostroić — rzadszy puls = mniej
zapytań do Redisa (istotne przy limicie darmowego planu).

## Co nowego

- 🌍 **Kula ziemska** w panelu "Teraz gra" — obraca się, dojeżdża do kraju grającej stacji, pulsujący marker, markery wszystkich krajów ze stacjami
- 🌐 **Stacje światowe** — top 300 wg głosów + tagi: rave, hardstyle, gabber, hardcore, hard techno, drum and bass, dubstep, psytrance, techno, house, trance, club (wszystkie dotychczasowe polskie zapytania zachowane)
- 🇵🇱 **Flagi i polskie nazwy krajów**, nowy chip "Polskie", Polska zawsze pierwsza na liście krajów
- ⚡ **Cache listy stacji** (6h) — aplikacja startuje natychmiast z cache, w tle cicho się odświeża; przycisk "Odśwież" wymusza pobranie
- 📱 **PWA** — można zainstalować na telefonie/pulpicie, pliki aplikacji działają z cache
- 🚀 **Wydajność** — lista renderowana porcjami (płynność przy 1000+ stacjach), `content-visibility`, globus pauzuje gdy karta ukryta

## Uwagi techniczne

- Stacje z [Radio Browser API](https://www.radio-browser.info/) (5 mirrorów, fallback)
- Odtwarzacz: HTML5 Audio (bez `crossOrigin` — celowo, CORS ucina streamy Icecast) + HLS.js dla `.m3u8`
- Zero build stepu — czysty HTML/CSS/JS, wystarczy hosting statyczny
