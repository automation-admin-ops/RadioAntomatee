/* ════════════════════════════════════════════════════════════
   Radio Antomatee - chat.js  ·  Czat słuchaczy (Firebase RTDB)
   Wiadomości przychodzą PUSHEM (WebSocket) - pojawiają się u
   wszystkich natychmiast, bez odpytywania. Zasady (egzekwowane
   też przez reguły bazy, nie tylko w UI):
     • nick wymagany (1-24), wiadomość 1-100 znaków,
     • 1 wiadomość / 5 s na użytkownika,
     • widoczne: max 50 najświeższych, max 10 minut.
   Render przez textContent - treści są niezaufane.
   Bez Firebase panel pozostaje ukryty.
════════════════════════════════════════════════════════════ */
(function () {
  var TTL_MS = 10 * 60 * 1000;
  var MAX_MSG = 50;
  var SEND_COOLDOWN_MS = 5000;

  var panel, list, nickEl, textEl, sendBtn, hintEl;
  var db = null, uid = null;
  var msgs = {};                      /* id → {t,n,x,uid} */
  var cooldownUntil = 0, myNick = "";

  function fmtTime(t) {
    var d = new Date(+t || 0);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  function liveMessages() {
    var cutoff = Date.now() - TTL_MS, out = [];
    for (var id in msgs) {
      if (!msgs.hasOwnProperty(id)) continue;
      if ((+msgs[id].t || 0) >= cutoff) out.push(msgs[id]);
    }
    out.sort(function (a, b) { return (+a.t) - (+b.t); });
    return out.slice(-MAX_MSG);
  }

  function render() {
    if (!list) return;
    var arr = liveMessages();
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
     wiadomości starsze niż 10 minut, więc nikt nie skasuje żywych */
  function gcExpired() {
    var cutoff = Date.now() - TTL_MS;
    for (var id in msgs) {
      if (msgs.hasOwnProperty(id) && (+msgs[id].t || 0) < cutoff) {
        try { db.ref("chat/" + id).remove().catch(function () {}); } catch (e) {}
      }
    }
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
      render();
    }, function () { panel.hidden = true; });

    /* co 30 s odśwież widok (wygasające 10 min) + posprzątaj bazę */
    setInterval(function () { render(); gcExpired(); }, 30000);
  }

  function init() {
    panel = document.getElementById("chatPanel");
    list = document.getElementById("chatList");
    nickEl = document.getElementById("chatNick");
    textEl = document.getElementById("chatText");
    sendBtn = document.getElementById("chatSend");
    hintEl = document.getElementById("chatHint");
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

    if (window.RadioFB && window.RadioFB.uid) start();
    document.addEventListener("radiofb-ready", start);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
