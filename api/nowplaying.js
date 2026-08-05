/* ════════════════════════════════════════════════════════════
   Radio Antomatee - proxy "teraz gra" (ICY StreamTitle)

   Radio Browser NIE podaje granego utworu. Tytul siedzi w
   metadanych streamu Icecast/SHOUTcast (naglowek ICY StreamTitle),
   a przegladarka nie udostepnia go z <audio> do JS. Ta funkcja
   laczy sie do streamu z naglowkiem "Icy-MetaData: 1", odczytuje
   pierwszy blok metadanych i zwraca { title }.

   Zwraca zawsze 200 z { title: <string|null> } - brak tytulu
   (np. stream HLS albo bez metadanych) to nie blad, tylko null.
   Naglowek Cache-Control: no-store - dane maja byc zawsze swieze.
════════════════════════════════════════════════════════════ */

var MAX_BYTES = 1024 * 1024;   // twardy limit odczytu (~1 MB) na wypadek streamu bez metadanych
var TIMEOUT_MS = 8000;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  var raw = (req.query && req.query.url) || "";
  var target;
  try { target = new URL(raw); } catch (e) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "bad url" }));
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "bad protocol" }));
  }

  var ac = new AbortController();
  var timer = setTimeout(function () { try { ac.abort(); } catch (e) {} }, TIMEOUT_MS);

  try {
    var resp = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "Icy-MetaData": "1",
        "User-Agent": "RadioAntomatee/1.0 (+https://radio-antomatee.vercel.app)",
        "Accept": "*/*"
      }
    });

    var metaint = parseInt(resp.headers.get("icy-metaint") || "", 10);
    if (!resp.body || !Number.isFinite(metaint) || metaint <= 0) {
      try { ac.abort(); } catch (e) {}
      return res.end(JSON.stringify({ title: null }));
    }

    var title = await readStreamTitle(resp.body, metaint);
    try { ac.abort(); } catch (e) {}
    return res.end(JSON.stringify({ title: title || null }));
  } catch (e) {
    return res.end(JSON.stringify({ title: null }));
  } finally {
    clearTimeout(timer);
  }
};

/* Odczyt pierwszego niepustego bloku metadanych ICY.
   Uklad streamu: [metaint bajtow audio][1 bajt = dlugosc/16][metadane]...
   Metadane to tekst w rodzaju: StreamTitle='Artysta - Utwor'; */
async function readStreamTitle(body, metaint) {
  var reader = body.getReader();
  var need = metaint;           // ile bajtow audio jeszcze pominac
  var stage = "audio";         // audio -> len -> meta
  var metaLen = 0;
  var metaBuf = [];
  var total = 0;

  try {
    while (total < MAX_BYTES) {
      var chunk = await reader.read();
      if (chunk.done || !chunk.value) break;
      var value = chunk.value;
      total += value.length;

      var i = 0;
      while (i < value.length) {
        if (stage === "audio") {
          var take = Math.min(need, value.length - i);
          i += take; need -= take;
          if (need === 0) stage = "len";
        } else if (stage === "len") {
          metaLen = value[i] * 16; i += 1;
          if (metaLen === 0) { need = metaint; stage = "audio"; }   // blok bez metadanych - czytaj dalej
          else { stage = "meta"; metaBuf = []; }
        } else { // meta
          var takeM = Math.min(metaLen - metaBuf.length, value.length - i);
          for (var k = 0; k < takeM; k++) metaBuf.push(value[i + k]);
          i += takeM;
          if (metaBuf.length >= metaLen) {
            var s = Buffer.from(metaBuf).toString("utf8");
            var m = s.match(/StreamTitle='([\s\S]*?)';/);
            var title = m ? cleanTitle(m[1]) : "";
            try { await reader.cancel(); } catch (e) {}
            return title;
          }
        }
      }
    }
  } catch (e) {
    /* przerwane / blad sieci - zwroc co mamy (nic) */
  }
  try { await reader.cancel(); } catch (e) {}
  return "";
}

function cleanTitle(t) {
  return String(t || "").replace(/\s+/g, " ").trim().slice(0, 200);
}
