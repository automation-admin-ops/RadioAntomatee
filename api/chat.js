/* ════════════════════════════════════════════════════════════
   Radio Antomatee — /api/chat  (Vercel Serverless Function)
   Czat słuchaczy na Upstash Redis (ZSET, score = czas wysłania).

   Zasady (ustalone):
     • wiadomość: 1–100 znaków, nick wymagany (1–24 znaki),
     • 1 wiadomość / 5 s na sesję (+ szerszy limit 20/min na IP),
     • historia: max 50 najświeższych wiadomości,
     • wiadomości starsze niż 10 minut znikają.

   GET  → { messages:[{i,t,n,x}], now }   (od najstarszej do najnowszej)
   POST { sid, nick, text } → { ok:true } | { error:"rate"|"invalid" }

   Bez skonfigurowanej bazy zwraca { messages:null } — aplikacja
   działa normalnie, po prostu chowa panel czatu.
════════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  var URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  var TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!URL || !TOKEN) { res.status(200).json({ messages: null, error: "no-redis-config" }); return; }

  var KEY     = "chat:messages";
  var TTL_MS  = 10 * 60 * 1000;   // wiadomość żyje 10 minut
  var MAX_MSG = 50;               // w historii max 50 najświeższych
  var now     = Date.now();
  var cutoff  = now - TTL_MS;

  async function pipe(cmds) {
    var r = await fetch(URL + "/pipeline", {
      method: "POST",
      headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(cmds)
    });
    return r.json();
  }

  try {
    if (req.method === "GET") {
      var data = await pipe([
        ["ZREMRANGEBYSCORE", KEY, 0, cutoff],
        ["ZRANGE", KEY, 0, -1]
      ]);
      var raw = (Array.isArray(data) && data[1] && Array.isArray(data[1].result)) ? data[1].result : [];
      var msgs = [];
      for (var i = 0; i < raw.length; i++) {
        try { var m = JSON.parse(raw[i]); if (m && m.t && m.n && m.x) msgs.push(m); } catch (e) {}
      }
      res.status(200).json({ messages: msgs, now: now });
      return;
    }

    // — POST: nowa wiadomość —
    var body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || typeof body !== "object") body = {};

    var sid = "" + (body.sid || "");
    if (!/^[a-z0-9-]{8,64}$/i.test(sid)) { res.status(400).json({ error: "invalid" }); return; }

    // usuń znaki sterujące i niewidoczne (C0/C1, zero-width, separatory linii)
    var clean = function (s, max) {
      return ("" + (s == null ? "" : s))
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, "")
        .trim().slice(0, max);
    };
    var nick = clean(body.nick, 24);
    var text = clean(body.text, 100);
    if (!nick || !text) { res.status(400).json({ error: "invalid" }); return; }

    var ip = ("" + (req.headers["x-forwarded-for"] || "")).split(",")[0].trim().slice(0, 45) || "unknown";

    // limity: 1/5 s na sesję (SET NX z TTL) + 20/min na IP (stałe okno)
    var rl = await pipe([
      ["SET", "chat:rl:sid:" + sid, "1", "EX", "5", "NX"],
      ["SET", "chat:rl:ip:" + ip, "0", "EX", "60", "NX"],
      ["INCR", "chat:rl:ip:" + ip]
    ]);
    var sidFree = Array.isArray(rl) && rl[0] && rl[0].result === "OK";
    var ipCount = Array.isArray(rl) && rl[2] && typeof rl[2].result === "number" ? rl[2].result : 999;
    if (!sidFree || ipCount > 20) { res.status(429).json({ error: "rate" }); return; }

    var msg = JSON.stringify({
      i: now.toString(36) + Math.random().toString(36).slice(2, 8),   // unikalny id
      t: now, n: nick, x: text
    });
    await pipe([
      ["ZADD", KEY, now, msg],
      ["ZREMRANGEBYSCORE", KEY, 0, cutoff],                 // starsze niż 10 min — precz
      ["ZREMRANGEBYRANK", KEY, 0, -(MAX_MSG + 1)]           // zostaw tylko 50 najświeższych
    ]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(200).json({ messages: null, error: "upstream" });
  }
};
