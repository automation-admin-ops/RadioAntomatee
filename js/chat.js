/* ════════════════════════════════════════════════════════════
   Radio Antomatee - chat.js  ·  Czat słuchaczy (Firebase RTDB)
   Wiadomości przychodzą PUSHEM (WebSocket) - pojawiają się u
   wszystkich natychmiast, bez odpytywania. Zasady (egzekwowane
   też przez reguły bazy, nie tylko w UI):
     • nick wymagany (1-24), wiadomość 1-100 znaków,
     • 1 wiadomość / 5 s na użytkownika,
     • widoczne: max 50 najświeższych, max 15 minut.
   Nowe wiadomości (gdy nie patrzysz na czat / karta w tle) zapalają
   dzwoneczek przy nazwie radia i licznik w tytule karty.
   Render przez textContent - treści są niezaufane.
   Bez Firebase panel pozostaje ukryty.
════════════════════════════════════════════════════════════ */
(function () {
  var TTL_MS = 15 * 60 * 1000;
  var MAX_MSG = 50;
  var SEND_COOLDOWN_MS = 5000;

  var panel, list, nickEl, textEl, sendBtn, hintEl, bellEl, bellCountEl;
  var db = null, uid = null;
  var msgs = {};                      /* id → {t,n,x,uid} */
  var cooldownUntil = 0, myNick = "";

  /* powiadomienia o nowych wiadomościach */
  var seen = {};                      /* id → 1 dla wiadomości już „odnotowanych" */
  var primed = false;                 /* pierwsza migawka nie wywołuje alarmu */
  var unread = 0;
  var chatInView = false;
  var baseTitle = document.title;

  function fmtTime(t) {
    var d = new Date(+t || 0);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  function liveMessages() {
    var cutoff = Date.now() - TTL_MS, out = [];
    for (var id in msgs) {
      if (!msgs.hasOwnProperty(id)) continue;
      var m = msgs[id];
      if ((+m.t || 0) >= cutoff) out.push({ t: m.t, n: m.n, x: m.x, uid: m.uid, id: id });
    }
    out.sort(function (a, b) { return (+a.t) - (+b.t); });
    return out.slice(-MAX_MSG);
  }

  function render(arr) {
    if (!list) return;
    arr = arr || liveMessages();
    var nearBottom = (list.scrollHeight - list.scrollTop - list.clientHeight) < 48;
    list.textContent = "";
    if (!arr.length) {
      var empty = document.createElement("div");
      empty.className = "chatEmpty";
      empty.textContent = "Cisza na czacie - napisz coś pierwszy :)";
      list.appendChild(empty);
      return;
    }
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      var row = document.createElement("div");
      row.className = "chatMsg" + (m.uid === uid ? " mine" : "");
      var time = document.createElement("span");
      time.className = "chatTime"; time.textContent = fmtTime(m.t);
      var nick = document.createElement("b");
      nick.className = "chatNick"; nick.textContent = m.n;
      var txt = document.createElement("span");
      txt.className = "chatText"; txt.textContent = m.x;
      row.appendChild(time); row.appendChild(nick); row.appendChild(txt);
      list.appendChild(row);
    }
    if (nearBottom) list.scrollTop = list.scrollHeight;
  }

  /* najlepszo-wysiłkowe sprzątanie: reguły pozwalają skasować TYLKO
     wiadomości starsze niż 15 minut, więc nikt nie skasuje żywych */
  function gcExpired() {
    var cutoff = Date.now() - TTL_MS;
    for (var id in msgs) {
      if (msgs.hasOwnProperty(id) && (+msgs[id].t || 0) < cutoff) {
        try { db.ref("chat/" + id).remove().catch(function () {}); } catch (e) {}
      }
    }
  }

  /* ── powiadomienia (dzwoneczek + tytuł karty) ── */
  function chatVisibleNow() {
    return document.visibilityState === "visible" && chatInView;
  }
  function updateBell() {
    if (bellEl) {
      bellEl.hidden = unread <= 0;
      if (unread > 0) {
        bellEl.setAttribute("title", unread === 1
          ? "1 nowa wiadomość na czacie"
          : unread + " nowych wiadomości na czacie");
        if (bellCountEl) bellCountEl.textContent = unread > 9 ? "9+" : ("" + unread);
      }
    }
    document.title = unread > 0 ? ("(" + unread + ") 🔔 " + baseTitle) : baseTitle;
  }
  function markRead() {
    if (unread !== 0) { unread = 0; updateBell(); }
  }
  function noteIncoming(arr) {
    var fresh = 0;
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      if (!m.id || seen[m.id]) continue;
      seen[m.id] = 1;
      if (!primed) continue;               /* pierwsze załadowanie - bez alarmu */
      if (m.uid === uid) continue;          /* własne wiadomości nie liczą */
      fresh++;
    }
    if (!primed) { primed = true; return; }
    if (chatVisibleNow()) { markRead(); return; }
    if (fresh > 0) { unread += fresh; updateBell(); }
  }

  function setHint(msg, isErr) {
    hintEl.textContent = msg || "";
    hintEl.classList.toggle("err", !!isErr);
  }

  function updateSendState() {
    var cooling = Date.now() < cooldownUntil;
    sendBtn.disabled = cooling || !nickEl.value.trim() || !textEl.value.trim();
    if (!cooling && !nickEl.value.trim()) setHint("Podaj nick, żeby pisać");
    else if (!cooling) setHint(textEl.value.length ? textEl.value.length + "/100" : "");
  }

  function startCooldown() {
    cooldownUntil = Date.now() + SEND_COOLDOWN_MS;
    var tick = setInterval(function () {
      var left = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (left <= 0) { clearInterval(tick); setHint(""); updateSendState(); return; }
      sendBtn.disabled = true;
      setHint("Następna wiadomość za " + left + " s");
    }, 250);
  }

  function send() {
    var nick = nickEl.value.trim().slice(0, 24);
    var text = textEl.value.trim().slice(0, 100);
    if (!nick || !text || !db || !uid || Date.now() < cooldownUntil) return;
    myNick = nick;
    try { localStorage.setItem("ra-chat-nick", nick); } catch (e) {}
    sendBtn.disabled = true;

    /* atomowo: wiadomość + znacznik czasu do limitu 1/5 s (reguły bazy
       sprawdzają limits/<uid> i odrzucają zbyt szybkie wysyłki) */
    var id = db.ref("chat").push().key;
    var upd = {};
    upd["chat/" + id] = { t: firebase.database.ServerValue.TIMESTAMP, n: nick, x: text, uid: uid };
    upd["limits/" + uid] = firebase.database.ServerValue.TIMESTAMP;
    db.ref().update(upd).then(function () {
      textEl.value = "";
      setHint("");
      startCooldown();
    }).catch(function () {
      setHint("Za szybko - 1 wiadomość na 5 sekund", true);
      startCooldown();
    });
  }

  function start() {
    if (db || !window.RadioFB || !window.RadioFB.uid) return;
    db = window.RadioFB.db;
    uid = window.RadioFB.uid;
    panel.hidden = false;

    /* push: każda zmiana ostatnich 50 wiadomości przychodzi sama */
    db.ref("chat").orderByChild("t").limitToLast(MAX_MSG).on("value", function (snap) {
      msgs = snap.val() || {};
      var arr = liveMessages();
      render(arr);
      noteIncoming(arr);
    }, function () { panel.hidden = true; });

    /* co 30 s odśwież widok (wygasające 15 min) + posprzątaj bazę */
    setInterval(function () { render(); gcExpired(); }, 30000);
  }

  function init() {
    panel = document.getElementById("chatPanel");
    list = document.getElementById("chatList");
    nickEl = document.getElementById("chatNick");
    textEl = document.getElementById("chatText");
    sendBtn = document.getElementById("chatSend");
    hintEl = document.getElementById("chatHint");
    bellEl = document.getElementById("chatBell");
    bellCountEl = document.getElementById("chatBellCount");
    if (!panel || !list) return;

    try { myNick = localStorage.getItem("ra-chat-nick") || ""; } catch (e) {}
    if (myNick) nickEl.value = myNick;

    nickEl.addEventListener("input", updateSendState);
    textEl.addEventListener("input", updateSendState);
    textEl.addEventListener("keydown", function (e) {
      if ((e.keyCode || 0) === 13) { e.preventDefault(); send(); }
    });
    sendBtn.addEventListener("click", send);
    updateSendState();

    /* czytanie = kasowanie dzwoneczka */
    if (bellEl) {
      bellEl.addEventListener("click", function () {
        markRead();
        if (panel.scrollIntoView) panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
        if (list) list.scrollTop = list.scrollHeight;
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        chatInView = !!(es[0] && es[0].isIntersecting);
        if (chatVisibleNow()) markRead();
      }, { threshold: 0.25 });
      io.observe(panel);
    } else {
      chatInView = true;   /* brak IO - zakładamy widoczność */
    }
    document.addEventListener("visibilitychange", function () { if (chatVisibleNow()) markRead(); });
    list.addEventListener("scroll", markRead);
    if (nickEl) nickEl.addEventListener("focus", markRead);
    if (textEl) textEl.addEventListener("focus", markRead);

    if (window.RadioFB && window.RadioFB.uid) start();
    document.addEventListener("radiofb-ready", start);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
