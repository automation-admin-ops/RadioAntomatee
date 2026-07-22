/* ════════════════════════════════════════════════════════════
   Radio Antomatee — presence.js
   Pokazuje, ile osób korzysta z aplikacji „w tej chwili".
   Wysyła anonimowy „puls" do /api/presence co ~25 s i wyświetla
   zwróconą liczbę w plakietce w nagłówku (#onlineChip).
   Jeśli backend nie jest skonfigurowany (count:null) lub funkcja
   nie odpowiada — plakietka pozostaje ukryta, aplikacja działa.
════════════════════════════════════════════════════════════ */
(function () {
  var ENDPOINT = "/api/presence";
  var HEARTBEAT_MS = 20000;     // częstotliwość pulsu (mniej = dokładniej, więcej zapytań)

  /* identyfikator sesji (na czas otwartej karty) */
  var sid = null;
  try { sid = sessionStorage.getItem("ra-presence-sid"); } catch (e) {}
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    try { sessionStorage.setItem("ra-presence-sid", sid); } catch (e) {}
  }

  var chip = null, countEl = null, timer = null;

  function render(n) {
    if (!chip) return;
    if (typeof n === "number" && n >= 1) {
      countEl.textContent = n;
      chip.hidden = false;
      chip.setAttribute("title", n === 1 ? "1 osoba korzysta teraz z Radia Antomatee"
                                          : n + " osób korzysta teraz z Radia Antomatee");
    } else {
      chip.hidden = true;       // brak backendu / brak danych — nie pokazuj
    }
  }

  async function beat() {
    try {
      var r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: sid }),
        keepalive: true
      });
      if (!r.ok) { render(null); return; }
      var d = await r.json();
      render(d ? d.count : null);
    } catch (e) { render(null); }
  }

  function leave() {
    try {
      var payload = JSON.stringify({ sid: sid, leave: true });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
      }
    } catch (e) {}
  }

  /* Puls idzie ZAWSZE, póki karta żyje — liczymy każdego z otwartą
     aplikacją, nie tylko aktywnie patrzących/słuchających. Karty w tle
     przeglądarka dławi do ~1 pulsu/min, dlatego serwerowe okno „życia"
     sesji jest dłuższe (150 s) i toleruje takie przerwy. */
  function start() {
    chip = document.getElementById("onlineChip");
    countEl = document.getElementById("onlineCount");
    beat();
    timer = setInterval(beat, HEARTBEAT_MS);
  }

  document.addEventListener("visibilitychange", function () { if (!document.hidden) beat(); });
  window.addEventListener("online", function () { beat(); });   /* po powrocie sieci od razu wróć na licznik */
  window.addEventListener("pageshow", function () { beat(); }); /* powrót z bfcache po "leave" */
  window.addEventListener("pagehide", leave);
  window.addEventListener("beforeunload", leave);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
