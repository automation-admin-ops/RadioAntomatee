/* ════════════════════════════════════════════════════════════
   Radio Antomatee — firebase-init.js
   Inicjalizacja Firebase (Realtime Database + anonimowe logowanie).
   Konfiguracja jest PUBLICZNA z założenia — bezpieczeństwo zapewniają
   reguły bazy (limity czatu, walidacja struktury, prawa zapisu).
   Po zalogowaniu ustawia window.RadioFB = { db, uid } i emituje
   zdarzenie "radiofb-ready" — słuchają go chat.js i presence.js.
════════════════════════════════════════════════════════════ */
(function () {
  if (typeof firebase === "undefined") return;   /* SDK się nie załadowało */

  var config = {
    apiKey: "AIzaSyAb5gSNrWBto5yp_cUkBhr8ucnzLtdZCKY",
    authDomain: "radio-antomatee.firebaseapp.com",
    databaseURL: "https://radio-antomatee-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "radio-antomatee",
    storageBucket: "radio-antomatee.firebasestorage.app",
    messagingSenderId: "153098885630",
    appId: "1:153098885630:web:4da03d2b5a9baf6d4d48af"
  };

  try {
    firebase.initializeApp(config);
    window.RadioFB = { db: firebase.database(), uid: null };

    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        window.RadioFB.uid = user.uid;
        try { document.dispatchEvent(new CustomEvent("radiofb-ready")); } catch (e) {}
      }
    });
    firebase.auth().signInAnonymously().catch(function () {
      /* brak logowania (np. offline) — czat/licznik po prostu się nie pokażą */
    });
  } catch (e) {}
})();
