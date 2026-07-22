/* ════════════════════════════════════════════════════════════
   Radio Antomatee — presence.js  ·  Licznik słuchaczy (Firebase)
   Zero odpytywania: każda przeglądarka trzyma stałe połączenie
   WebSocket z Realtime Database. Wpis presence/<uid>/<połączenie>
   jest zdejmowany przez SERWER natychmiast po zerwaniu połączenia
   (onDisconnect) — licznik reaguje na wejścia/wyjścia na żywo.
   Liczymy UNIKALNYCH użytkowników (kilka kart = 1 słuchacz).
   Bez Firebase (SDK niezaładowane / offline) plakietka się chowa.
════════════════════════════════════════════════════════════ */
(function () {
  var chip = null, countEl = null, started = false;

  function render(n) {
    if (!chip) return;
    if (typeof n === "number" && n >= 1) {
      countEl.textContent = Math.min(n, 9999);
      chip.hidden = false;
      chip.setAttribute("title", n === 1 ? "1 osoba korzysta teraz z Radia Antomatee"
                                          : n + " osób korzysta teraz z Radia Antomatee");
    } else {
      chip.hidden = true;
    }
  }

  function start() {
    if (started || !window.RadioFB || !window.RadioFB.uid) return;
    started = true;
    var db = window.RadioFB.db, uid = window.RadioFB.uid;

    /* mój wpis obecności — jeden na kartę, pod wspólnym uid przeglądarki;
       przy każdym (ponownym) połączeniu odtwórz wpis i zbrój onDisconnect */
    var myConn = db.ref("presence/" + uid).push();
    db.ref(".info/connected").on("value", function (snap) {
      if (snap.val() === true) {
        myConn.onDisconnect().remove();
        myConn.set(true);
      }
    });

    /* licznik = liczba unikalnych użytkowników (kluczy uid) */
    db.ref("presence").on("value", function (snap) {
      render(snap.numChildren());
    }, function () { render(null); });
  }

  function init() {
    chip = document.getElementById("onlineChip");
    countEl = document.getElementById("onlineCount");
    if (window.RadioFB && window.RadioFB.uid) start();
    document.addEventListener("radiofb-ready", start);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
