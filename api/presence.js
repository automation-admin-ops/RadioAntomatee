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
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {          // tylko GET i POST
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  var URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  var TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!URL || !TOKEN) { res.status(200).json({ count: null, error: "no-redis-config" }); return; }

  // — wczytaj ciało (JSON albo beacon jako tekst) —
  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  var sid = "" + (body.sid || "");
  var sidOk = /^[a-z0-9-]{8,64}$/i.test(sid);                   // zły/brak sid → bez pulsu, ale count wraca
  var leave = body.leave === true || (req.query && req.query.leave === "1");

  var ip = ("" + (req.headers["x-forwarded-for"] || "")).split(",")[0].trim().slice(0, 45) || "unknown";
  var RLKEY = "presence:rl:" + ip;
  var RLMAX = 120;               // maks. żądań/min z jednego IP (IP bywa wspólne: NAT/CGNAT)

  var KEY = "presence:online";
  var now = Date.now();
  var WINDOW = 150000;           // sesja „żywa" 150 s od ostatniego pulsu —
                                 // toleruje dławienie kart w tle (~1 puls/min);
                                 // zamknięcie karty i tak zdejmuje od razu (leave)
  var cutoff = now - WINDOW;

  // Rate-limit: STAŁE okno 60 s. SET..NX zakłada klucz z TTL tylko gdy go
  // nie ma — TTL biegnie od PIERWSZEGO żądania w oknie i klucz wygasa.
  // (Poprzednio EXPIRE przy każdym żądaniu wiecznie przedłużał TTL, więc
  // licznik nigdy się nie zerował i po ~12 min pulsy każdego stałego
  // słuchacza były odrzucane — licznik „się psuł".)
  var cmds = [["SET", RLKEY, "0", "EX", "60", "NX"], ["INCR", RLKEY]];
  var pulse = false;
  if (req.method === "GET") {                                   // podgląd bez dopisywania
    cmds.push(["ZREMRANGEBYSCORE", KEY, 0, cutoff], ["ZCARD", KEY]);
  } else if (leave) {                                           // jawne wyjście
    if (sidOk) cmds.push(["ZREM", KEY, sid]);
    cmds.push(["ZREMRANGEBYSCORE", KEY, 0, cutoff], ["ZCARD", KEY]);
  } else {                                                      // puls
    cmds.push(["ZREMRANGEBYSCORE", KEY, 0, cutoff]);
    if (sidOk) { cmds.push(["ZADD", KEY, now, sid]); pulse = true; }
    cmds.push(["ZCARD", KEY]);
  }

  try {
    var r = await fetch(URL + "/pipeline", {
      method: "POST",
      headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(cmds)
    });
    var data = await r.json();
    var rl = Array.isArray(data) && data[1] && typeof data[1].result === "number" ? data[1].result : 0; // wynik INCR
    var last = Array.isArray(data) ? data[data.length - 1] : null;     // ZCARD = ostatnia komenda
    var count = last && typeof last.result === "number" ? last.result : null;

    // ponad limit → cofnij puls (pipeline nie umie pominąć ZADD warunkowo)
    if (pulse && rl > RLMAX) {
      try {
        var r2 = await fetch(URL + "/pipeline", {
          method: "POST",
          headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify([["ZREM", KEY, sid], ["ZCARD", KEY]])
        });
        var data2 = await r2.json();
        var last2 = Array.isArray(data2) ? data2[data2.length - 1] : null;
        if (last2 && typeof last2.result === "number") count = last2.result;
      } catch (e2) { /* count zostaje z pierwszego pipeline */ }
    }

    if (typeof count === "number") count = Math.min(count, 9999);
    res.status(200).json({ count: count });
  } catch (e) {
    res.status(200).json({ count: null, error: "upstream" });
  }
};
