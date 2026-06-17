/* ════════════════════════════════════════════════════════════
   Radio Antomatee — /api/presence  (Vercel Serverless Function)
   Licznik osób korzystających z aplikacji „w tej chwili".

   Działanie: w Upstash Redis trzymamy sorted-set, gdzie
   member = anonimowy identyfikator sesji, score = czas ostatniego
   „pulsu" (ms). Każde wywołanie kasuje wpisy starsze niż WINDOW,
   dopisuje bieżącą sesję i zwraca liczność zbioru (ZCARD).

   Wymaga zmiennych środowiskowych (ustawia je integracja
   Upstash w Marketplace Vercela):
     KV_REST_API_URL / KV_REST_API_TOKEN
     (albo UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)

   Bez skonfigurowanej bazy funkcja zwraca {count:null} — aplikacja
   działa normalnie, po prostu nie pokazuje licznika.
════════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  var URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  var TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!URL || !TOKEN) { res.status(200).json({ count: null, error: "no-redis-config" }); return; }

  // — wczytaj ciało (JSON albo beacon jako tekst) —
  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  var sid = ("" + (body.sid || "")).slice(0, 64) || ("anon" + Math.random().toString(36).slice(2, 10));
  var leave = body.leave === true || (req.query && req.query.leave === "1");

  var KEY = "presence:online";
  var now = Date.now();
  var WINDOW = 60000;            // sesja „żywa" 60 s od ostatniego pulsu
  var cutoff = now - WINDOW;

  var cmds;
  if (req.method === "GET") {                                   // podgląd bez dopisywania
    cmds = [["ZREMRANGEBYSCORE", KEY, 0, cutoff], ["ZCARD", KEY]];
  } else if (leave) {                                           // jawne wyjście
    cmds = [["ZREM", KEY, sid], ["ZREMRANGEBYSCORE", KEY, 0, cutoff], ["ZCARD", KEY]];
  } else {                                                      // puls
    cmds = [["ZREMRANGEBYSCORE", KEY, 0, cutoff], ["ZADD", KEY, now, sid], ["ZCARD", KEY]];
  }

  try {
    var r = await fetch(URL + "/pipeline", {
      method: "POST",
      headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(cmds)
    });
    var data = await r.json();
    var last = Array.isArray(data) ? data[data.length - 1] : null;     // ZCARD = ostatnia komenda
    var count = last && typeof last.result === "number" ? last.result : null;
    res.status(200).json({ count: count });
  } catch (e) {
    res.status(200).json({ count: null, error: "upstream" });
  }
};
