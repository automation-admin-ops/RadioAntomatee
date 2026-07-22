# Radio Antomatee 📻🌍

Radiowa aplikacja PWA (czysty JavaScript, bez build stepu) z polskimi i światowymi
stacjami, czatem słuchaczy na żywo i licznikiem obecnych. Produkcja:
**https://radio-antomatee.vercel.app/** (auto-deploy z gałęzi `main`).

## Funkcje

- **~460 stacji radiowych** - Radio Browser API (5 mirrorów, tylko stacje
  zweryfikowane serwerowo: `lastcheckok=1 & hidebroken=true`) + 26 kuratorowanych
  streamów SomaFM jako pewna baza; cache listy w localStorage (start natychmiast,
  odświeżanie w tle)
- **8 motywów** zapisywanych w cookie (`radioantomatee_theme`): Matrix (domyślny),
  Kosmos, Bursztyn, Lód, Synthwave, Krwista, Koty, Naruto - każdy z własnym
  animowanym tłem (rain.js) i stylem globusa; płynne przejścia motywów
  (View Transitions + crossfade cząsteczek tła)
- **Globus** (canvas 2D, bez bibliotek) - geografia z Natural Earth 50m
  (~7000 punktów lądu, 241 krajów), rotacja do kraju grającej stacji,
  style per motyw (fosfor / neon / realistyczna Ziemia / jasny atlas)
- **Czat słuchaczy** - Firebase Realtime Database, wiadomości push przez
  WebSocket (bez odpytywania); nick wymagany, max 100 znaków, 1 wiadomość/5 s,
  widoczne max 50 wiadomości z ostatnich 10 minut
- **Licznik słuchaczy** - Firebase presence (`onDisconnect`), liczy unikalnych
  użytkowników, reaguje natychmiast na wejścia/wyjścia
- **PWA** - service worker (stale-while-revalidate, precache całego shella,
  cache fontów), działa offline (poza samymi streamami), instalowalna
- **Dostępność** - pełna obsługa klawiatury (strzałki, Enter, spacja, F, M, S,
  Esc), role ARIA (listbox, log, status), aria-live dla statusu i "Teraz gra",
  kontrasty WCAG AA na wszystkich motywach

## Architektura

```
index.html          układ 3-kolumnowy: czat | siatka stacji | teraz gra + filtry
css/style.css       tokeny motywów (ziarna + color-mix), style, responsywność
js/app.js           stacje, odtwarzacz (HTML5 Audio + hls.js), filtry, motywy
js/globe.js         globus canvas (LAND_DOTS/COUNTRY_LL z worlddata.js)
js/rain.js          animowane tła per motyw (silnik cząsteczek, crossfade)
js/firebase-init.js inicjalizacja Firebase (konfiguracja publiczna)
js/chat.js          czat słuchaczy (RTDB push)
js/presence.js      licznik słuchaczy (RTDB presence)
js/worlddata.js     dane geograficzne (generowane z Natural Earth)
js/vendor/          self-hostowane biblioteki: hls.js, firebase-*-compat
sw.js               service worker (cache "antomatee-vN" - podbij przy zmianach!)
vercel.json         nagłówki bezpieczeństwa (CSP, nosniff, frame-options)
```

## Backend (Firebase)

Projekt **radio-antomatee** (Realtime Database, region `europe-west1`, plan
Spark). Logowanie anonimowe daje `auth.uid` dla reguł bazy. Reguły (publikowane
w konsoli Firebase) egzekwują limity czatu po stronie serwera: nick 1-24, tekst
1-100, `t == now`, `uid == auth.uid`, 1 wiadomość/5 s per uid, kasowanie tylko
wpisów starszych niż 10 minut. Konfiguracja w `js/firebase-init.js` jest
publiczna z założenia - bezpieczeństwo zapewniają reguły.

Struktura danych:

```
chat/<pushId>       { t, n (nick), x (tekst), uid }
limits/<uid>        znacznik czasu ostatniej wiadomości (rate limit)
presence/<uid>/<id> true (wpis per połączenie, sprzątany przez onDisconnect)
```

## Rozwój

Bez build stepu - edytuj pliki i odśwież. Lokalny podgląd:

```
python -m http.server 8765     # w katalogu repo
```

Firebase działa też z localhost. Po zmianach w plikach cache'owanych przez SW
podbij `CACHE_NAME` w `sw.js`. Deploy: push na `main` (Vercel wdraża sam);
przez service workera pierwsza wizyta po deployu serwuje poprzednią wersję -
odśwież dwa razy.

Uwaga na streamy: element `<audio>` celowo nie ma `crossOrigin` (część serwerów
Icecast nie wysyła nagłówków CORS). CSP: `script-src 'self'` - nowe biblioteki
self-hostuj w `js/vendor/`, nie z CDN.
