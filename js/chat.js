/* ════════════════════════════════════════════════════════════
   Radio Antomatee — chat.js  ·  Czat słuchaczy (panel po lewej)
   Backend: /api/chat (Upstash Redis). Odpytywanie co 4 s (15 s
   przy ukrytej karcie). Zasady: nick wymagany, max 100 znaków,
   1 wiadomość / 5 s; historia max 50 wiadomości i max 10 minut
   (czyści serwer). Render przez textContent — dane niezaufane.
   Bez backendu (messages:null / 404) panel pozostaje ukryty.
════════════════════════════════════════════════════════════ */
(function () {
  var ENDPOINT = "/api/chat";
  var POLL_VISIBLE_MS = 4000;
  var POLL_HIDDEN_MS = 15000;
  var SEND_COOLDOWN_MS = 5000;

  /* ten sam identyfikator sesji co licznik obecności */
  var sid = null;
  try { sid = sessionStorage.getItem("ra-presence-sid"); } catch (e) {}
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    try { sessionStorage.setItem("ra-presence-sid", sid); } catch (e) {}
  }

  var panel, list, nickEl, textEl, sendBtn, hintEl;
  var lastSig = "", lastPoll = 0, cooldownUntil = 0, disabled = false, myNick = "";

  function fmtTime(t) {
    var d = new Date(+t || 0);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  function render(msgs) {
    /* przerysuj tylko, gdy coś się zmieniło — bez skakania scrolla */
    var sig = msgs.length + "|" + (msgs.length ? msgs[msgs.length - 1].i + msgs[0].i : "");
    if (sig === lastSig) return;
    lastSig = sig;

    var nearBottom = (list.scrollHeight - list.scrollTop - list.clientHeight) < 48;
    list.textContent = "";
    if (!msgs.length) {
      var empty = document.createElement("div");
      empty.className = "chatEmpty";
      empty.textContent = "Cisza na czacie — napisz coś pierwszy :)";
      list.appendChild(empty);
      return;
    }
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      var row = document.createElement("div");
      row.className = "chatMsg" + (m.n === myNick ? " mine" : "");
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

  async function poll(force) {
    if (disabled) return;
    var interval = document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS;
    if (!force && Date.now() - lastPoll < interval - 200) return;
    lastPoll = Date.now();
    try {
      var r = await fetch(ENDPOINT);
      if (!r.ok) { if (r.status === 404) disable(); return; }
      var d = await r.json();
      if (!d || d.messages === null) { disable(); return; }
      if (panel.hidden) panel.hidden = false;
      render(d.messages || []);
    } catch (e) { /* chwilowy brak sieci — spróbujemy przy następnym ticku */ }
  }

  function disable() {
    disabled = true;
    panel.hidden = true;
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

  async function send() {
    var nick = nickEl.value.trim().slice(0, 24);
    var text = textEl.value.trim().slice(0, 100);
    if (!nick || !text || Date.now() < cooldownUntil) return;
    myNick = nick;
    try { localStorage.setItem("ra-chat-nick", nick); } catch (e) {}
    sendBtn.disabled = true;
    try {
      var r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: sid, nick: nick, text: text })
      });
      if (r.status === 429) { setHint("Za szybko — 1 wiadomość na 5 sekund", true); startCooldown(); return; }
      if (!r.ok) { setHint("Nie udało się wysłać", true); updateSendState(); return; }
      textEl.value = "";
      setHint("");
      startCooldown();
      lastSig = ""; poll(true);           /* od razu pokaż własną wiadomość */
    } catch (e) { setHint("Brak połączenia", true); updateSendState(); }
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

  function start() {
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

    poll(true);
    setInterval(function () { poll(false); }, 1000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(true); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
