# Radio Antomatee 📻

Internetowy odtwarzacz radia — polskie i zagraniczne stacje na żywo.  
Zbudowany jako pojedynczy plik HTML, bez frameworków, bez zależności.

## ✨ Funkcje

- 50+ stacji (RMF, Polskie Radio, Radio 357, TruckersFM i inne)
- Wyszukiwarka i filtry (kraj, gatunek, bitrate)
- Ulubione stacje (★)
- Głośność + skróty klawiszowe
- Ustawienia zapisywane w `localStorage` przeglądarki
- Responsywny layout desktopowy

## 🚀 Deploy na Vercel

1. Wrzuć repozytorium na GitHub
2. Zaloguj się na [vercel.com](https://vercel.com) → **Add New Project**
3. Importuj repozytorium z GitHub
4. Vercel automatycznie wykryje statyczną stronę — kliknij **Deploy**

Gotowe! Strona dostępna pod `https://radioantomatee.vercel.app` (lub własna domena).

## 💻 Uruchomienie lokalnie

```bash
# Wystarczy otworzyć plik w przeglądarce:
open index.html

# Lub uruchomić prosty serwer lokalny:
npx serve .
# albo:
python3 -m http.server 8080
```

## ⚠️ Ważne — HTTP vs HTTPS

Vercel serwuje stronę przez **HTTPS**. Stacje korzystające z **HTTP** (a nie HTTPS)  
mogą być blokowane przez przeglądarkę jako *mixed content*.

- Stacje z `https://` działają zawsze ✅  
- Stacje z `http://` mogą nie działać z HTTPS ⚠️  
  → Przy takich stacjach pojawia się badge **HTTP** na liście  
  → Możesz spróbować otworzyć URL bezpośrednio w nowej karcie

## ⌨️ Skróty klawiszowe

| Klawisz | Akcja |
|---------|-------|
| `↑ / ↓` | Wybór stacji |
| `Enter` | Uruchom zaznaczoną |
| `Spacja` | Graj / Pauza |
| `← / →` | Poprzednia / Następna |
| `F` | Dodaj/usuń z ulubionych |
| `S` | Fokus wyszukiwarki |
| `Esc` | Wyczyść filtry |

## 📁 Struktura projektu

```
radioantomatee/
├── index.html   ← cała aplikacja
└── README.md
```

## 📝 Dodawanie stacji

Edytuj tablicę `RAW_STREAMS` w `index.html`:

```
"URL_STRUMIENIA|Nazwa Stacji|Gatunek|KOD_KRAJU|bitrate|0"
```

Przykład:
```js
"https://przykład.pl/stream.mp3|Moje Radio|Pop|PL|128|0"
```
