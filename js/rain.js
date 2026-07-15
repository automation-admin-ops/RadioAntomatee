/* ════════════════════════════════════════════════════════════
   RADIO ANTOMATEE — rain.js  ·  Tło zależne od motywu
   Jeden silnik cząsteczek na canvasie #rain, wiele trybów —
   każdy motyw ma WŁASNE, inne tło (nie deszcz kodu Matrix):
     matrix  — opadający kod (zielony)      → motyw green
     bokeh   — świecące bąbelki             → amber
     snow    — padający śnieg                → cyan/lód
     grid    — retro perspektywa + słońce    → synthwave
     petals  — opadające płatki              → crimson
     stars   — dryfujące gwiazdy + meteor    → violet
     cats    — spadające kotki 🐱            → cats
     leaves  — liście + wiry Uzumaki 🍥🌀    → naruto
   Zmiana motywu NIE resetuje deszczu — stary tryb płynnie
   wygasza się (cząsteczki lecą dalej), a nowy rozjaśnia się
   równolegle (crossfade), więc ikonki zmieniają się w locie.
   API: window.RadioBG.setMode(name). Sam startuje po DOM.
════════════════════════════════════════════════════════════ */
(function () {
  var THEME_MODE = {
    green: "matrix", amber: "bokeh", cyan: "snow", synthwave: "grid",
    crimson: "petals", violet: "stars", cats: "cats", naruto: "leaves"
  };

  function BG(canvas) {
    var ctx = canvas.getContext("2d");
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches; } catch (e) {}

    var MATRIX_G = "アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾋﾌﾍﾎマミムメモヤユヨラリルレロワヲ0123456789:.=*+<>".split("");
    var CATS = ["🐱", "🐾", "😺", "🐈", "😸", "🧶", "🐟"];
    var LEAVES = ["🍥", "🌀", "🍁", "🍂", "🍃", "🍥", "🌀", "忍"];

    var W = 0, H = 0, raf = 0, last = 0, t = 0;
    /* cur = tryb aktywny, prev = tryb wygaszany podczas przejścia.
       fade rośnie 0→1: siła nowego = fade, starego = 1-fade. */
    var cur = null, prev = null, fade = 1, FADE_DUR = 1.2;

    function cssvar(n, fb) {
      try { var v = getComputedStyle(document.documentElement).getPropertyValue(n).replace(/^\s+|\s+$/g, ""); return v || fb; }
      catch (e) { return fb; }
    }
    function rgbOf(n, fb) {
      /* zamień #rrggbb na "r,g,b" (dla rgba z alfą) */
      var c = cssvar(n, fb);
      if (c.charAt(0) === "#") {
        var h = c.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16);
      }
      return fb;
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    /* Pre-renderowany sprite miękkiej świecącej kuli (offscreen canvas).
       Tworzony RAZ w seed() zamiast createRadialGradient per cząsteczka
       per klatkę — w pętli wystarczy drawImage + globalAlpha.
       bokeh=true → jaśniejszy rdzeń (dwustopniowy gradient). */
    function makeSprite(col, bokeh) {
      var c = document.createElement("canvas"), SZ = 64, R = SZ / 2;
      c.width = SZ; c.height = SZ;
      var sc = c.getContext("2d");
      var g = sc.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0, "rgba(" + col + ",1)");
      if (bokeh) g.addColorStop(0.7, "rgba(" + col + ",0.4)");
      g.addColorStop(1, "rgba(" + col + ",0)");
      sc.fillStyle = g; sc.fillRect(0, 0, SZ, SZ);
      return c;
    }

    /* Stan pojedynczego trybu — własne cząsteczki, by dwa tryby
       mogły grać jednocześnie podczas crossfade. */
    function makeState(m) {
      return { mode: m, trail: 0, parts: [], drops: [], gridOff: 0, shoot: null, shootTimer: 3 };
    }

    function seed(s) {
      s.parts = []; s.drops = []; s.gridOff = 0; s.shoot = null; s.shootTimer = 3;
      /* zapamiętaj kolory MOTYWU w chwili tworzenia stanu — dzięki temu
         podczas zmiany motywu stary tryb zachowuje swoje kolory i płynnie
         zanika, a nowy pojawia się w nowych kolorach (bez przeskoku barwy) */
      s.rainHex = cssvar("--rain", "#00ff66");
      s.rainRGB = rgbOf("--rain", "0,255,102");
      var m = s.mode, i, n;
      if (m === "matrix") {
        s.trail = 0.09;
        var cols = Math.ceil(W / 15);
        for (i = 0; i < cols; i++) s.drops[i] = Math.random() * -50;
      } else if (m === "cats" || m === "leaves") {
        s.trail = 0; n = Math.max(10, Math.round(W / 90));
        for (i = 0; i < n; i++) s.parts.push(emoji(m, true));
      } else if (m === "snow") {
        s.trail = 0; n = Math.max(30, Math.round(W / 14));
        for (i = 0; i < n; i++) s.parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(1, 3.4), vy: rnd(18, 55), ph: rnd(0, 6.28), sw: rnd(8, 26) });
      } else if (m === "stars") {
        s.trail = 0.06; n = Math.max(40, Math.round(W / 10));
        for (i = 0; i < n; i++) s.parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.4, 1.8), vx: rnd(-6, -1), ph: rnd(0, 6.28), tw: rnd(1, 2.4) });
      } else if (m === "petals") {
        s.trail = 0; n = Math.max(16, Math.round(W / 44));
        s.sprite = makeSprite(s.rainRGB, false);
        for (i = 0; i < n; i++) s.parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(7, 20), vy: rnd(20, 46), vx: rnd(-10, 10), ph: rnd(0, 6.28), sw: rnd(14, 34), a: rnd(0.1, 0.26) });
      } else if (m === "bokeh") {
        s.trail = 0; n = Math.max(20, Math.round(W / 40));
        s.sprite = makeSprite(s.rainRGB, true);
        for (i = 0; i < n; i++) s.parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(8, 34), vy: rnd(-30, -8), vx: rnd(-9, 9), ph: rnd(0, 6.28), sw: rnd(10, 26), a: rnd(0.07, 0.2) });
      } else if (m === "grid") {
        s.trail = 0;
      }
    }

    /* spread=true → rozłóż na całym ekranie (start/​crossfade),
       inaczej pojaw się nad ekranem (respawn) */
    function emoji(m, spread) {
      var set = (m === "cats") ? CATS : LEAVES;
      return { x: Math.random() * W, y: spread ? rnd(-H, H) : rnd(-H, -20), sz: rnd(16, 30), vy: rnd(40, 95), vx: rnd(-18, 18), rot: rnd(0, 6.28), vr: rnd(-1.4, 1.4), ch: set[(Math.random() * set.length) | 0], ph: rnd(0, 6.28) };
    }

    function frame(t2) {
      raf = requestAnimationFrame(frame);
      if (t2 - last < 33) return;
      var dt = Math.min(0.06, (t2 - last) / 1000);
      last = t2; t += dt;

      if (prev) {
        /* crossfade: czyścimy klatkę i rysujemy obie warstwy z alfą */
        ctx.clearRect(0, 0, W, H);
        fade = Math.min(1, fade + dt / FADE_DUR);
        drawLayer(prev, dt, 1 - fade);
        drawLayer(cur, dt, fade);
        if (fade >= 1) prev = null;
      } else {
        /* normalnie: smużenie (matrix/stars) lub czyszczenie */
        if (cur.trail > 0) { ctx.fillStyle = "rgba(0,0,0," + cur.trail + ")"; ctx.fillRect(0, 0, W, H); }
        else ctx.clearRect(0, 0, W, H);
        drawLayer(cur, dt, 1);
      }
    }

    function drawLayer(s, dt, A) {
      if (A <= 0) return;
      var m = s.mode;
      if (m === "matrix") drawMatrix(s, dt, A);
      else if (m === "cats" || m === "leaves") drawEmoji(s, dt, A);
      else if (m === "snow") drawSnow(s, dt, A);
      else if (m === "stars") drawStars(s, dt, A);
      else if (m === "petals") drawPetals(s, dt, A);
      else if (m === "bokeh") drawBokeh(s, dt, A);
      else if (m === "grid") drawGrid(s, dt, A);
    }

    function drawMatrix(s, dt, A) {
      var FS = 15, col = s.rainHex, drops = s.drops;
      ctx.font = FS + "px 'Share Tech Mono', monospace";
      ctx.globalAlpha = A;
      for (var i = 0; i < drops.length; i++) {
        var ch = MATRIX_G[(Math.random() * MATRIX_G.length) | 0];
        var x = i * FS, y = drops[i] * FS;
        if (y > 0) {
          /* jaśniejszy kolor zamiast kosztownego shadowBlur */
          ctx.fillStyle = Math.random() > 0.86 ? "#d6ffe0" : col;
          ctx.fillText(ch, x, y);
        }
        if (y > H && Math.random() > 0.975) drops[i] = Math.random() * -20;
        drops[i] += 0.5 + Math.random() * 0.55;
      }
      ctx.globalAlpha = 1;
    }

    function drawEmoji(s, dt, A) {
      var parts = s.parts;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t + p.ph) * 12) * dt; p.rot += p.vr * dt;
        if (p.y > H + 30) { parts[i] = emoji(s.mode, false); continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.font = p.sz + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.9 * A; ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function drawSnow(s, dt, A) {
      var parts = s.parts;
      ctx.fillStyle = "rgba(" + s.rainRGB + ",0.9)";
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += Math.sin(t * 0.8 + p.ph) * p.sw * dt;
        if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
        ctx.globalAlpha = (0.55 + 0.4 * Math.sin(p.ph + t)) * A;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawStars(s, dt, A) {
      var parts = s.parts, col = s.rainRGB;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * dt; if (p.x < -2) { p.x = W + 2; p.y = Math.random() * H; }
        ctx.globalAlpha = (0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph))) * A;
        ctx.fillStyle = i % 5 === 0 ? "rgb(" + col + ")" : "#eaf0ff";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* meteor od czasu do czasu */
      s.shootTimer -= dt;
      if (!s.shoot && s.shootTimer <= 0) { s.shoot = { x: rnd(W * 0.3, W), y: rnd(0, H * 0.4), len: rnd(120, 240), life: 1 }; s.shootTimer = rnd(4, 9); }
      if (s.shoot) {
        s.shoot.x -= 520 * dt; s.shoot.y += 190 * dt; s.shoot.life -= dt * 1.1;
        if (s.shoot.life <= 0) s.shoot = null;
        else {
          var g = ctx.createLinearGradient(s.shoot.x, s.shoot.y, s.shoot.x + s.shoot.len, s.shoot.y - s.shoot.len * 0.36);
          g.addColorStop(0, "rgba(255,255,255," + (s.shoot.life * A) + ")");
          g.addColorStop(1, "rgba(" + col + ",0)");
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(s.shoot.x, s.shoot.y); ctx.lineTo(s.shoot.x + s.shoot.len, s.shoot.y - s.shoot.len * 0.36); ctx.stroke();
        }
      }
    }

    function drawPetals(s, dt, A) {
      var parts = s.parts, spr = s.sprite;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 0.7 + p.ph) * p.sw) * dt; p.ph += dt * 0.6;
        if (p.y > H + 24) { p.y = -24; p.x = Math.random() * W; }
        ctx.globalAlpha = (p.a + 0.06) * A;
        ctx.drawImage(spr, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
    }

    function drawBokeh(s, dt, A) {
      var parts = s.parts, spr = s.sprite;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 0.5 + p.ph) * p.sw) * dt; p.ph += dt * 0.4;
        if (p.y < -36) { p.y = H + 36; p.x = Math.random() * W; }
        var pulse = 0.7 + 0.3 * Math.sin(t * 1.2 + p.ph);
        ctx.globalAlpha = (p.a * pulse + 0.05) * A;
        ctx.drawImage(spr, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
    }

    function drawGrid(s, dt, A) {
      s.gridOff = (s.gridOff + dt * 0.35) % 1;
      var col = s.rainRGB;
      var hy = H * 0.46, vpx = W / 2;
      /* słońce nad horyzontem */
      ctx.globalAlpha = A;
      var sg = ctx.createRadialGradient(vpx, hy, 4, vpx, hy, H * 0.28);
      sg.addColorStop(0, "rgba(" + col + ",0.5)");
      sg.addColorStop(0.6, "rgba(" + col + ",0.12)");
      sg.addColorStop(1, "rgba(" + col + ",0)");
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(vpx, hy, H * 0.28, 0, 6.283); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.rect(0, hy, W, H - hy); ctx.clip();
      ctx.strokeStyle = "rgba(" + col + ",0.5)"; ctx.lineWidth = 1.4;
      /* linie poziome — perspektywa */
      for (var k = 0; k < 16; k++) {
        var f = (k + s.gridOff) / 16; var yy = hy + f * f * (H - hy);
        ctx.globalAlpha = (0.15 + 0.6 * f) * A;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      }
      /* linie pionowe — zbieżne do punktu ucieczki */
      ctx.globalAlpha = 0.4 * A;
      for (var j = -10; j <= 10; j++) {
        ctx.beginPath(); ctx.moveTo(vpx + j * (W / 8), H); ctx.lineTo(vpx + j * 6, hy); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    function resize() {
      W = canvas.width = Math.floor(window.innerWidth);
      H = canvas.height = Math.floor(window.innerHeight);
      if (cur) seed(cur);
      if (prev) seed(prev);
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else if (!reduce) { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(frame); }
    });

    return {
      setMode: function (m) {
        if (!m) return;
        if (!cur) { cur = makeState(m); seed(cur); return; }
        if (m === cur.mode && !prev) return;
        if (reduce) {
          /* bez animacji: natychmiastowa zamiana */
          cur = makeState(m); seed(cur); prev = null; fade = 1;
          ctx.clearRect(0, 0, W, H);
          return;
        }
        /* rozpocznij crossfade: dotychczasowy tryb leci dalej i gaśnie */
        prev = cur;
        cur = makeState(m); seed(cur);
        fade = 0;
      },
      start: function () {
        var th = ""; try { th = document.documentElement.getAttribute("data-theme") || ""; } catch (e) {}
        cur = makeState(THEME_MODE[th] || "matrix");
        prev = null; fade = 1;
        resize();
        if (reduce) { ctx.clearRect(0, 0, W, H); return; }
        cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(frame);
      },
      /* Wstrzymanie/wznowienie — używane podczas View Transition, aby
         canvas nie ruszał się „pod maską" i nie było przeskoku pozycji
         przy odsłonięciu; crossfade trybu gra się na żywo po wznowieniu. */
      pause: function () { cancelAnimationFrame(raf); raf = 0; },
      resume: function () {
        if (reduce || document.hidden) return;
        cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(frame);
      }
    };
  }

  function init() {
    var c = document.getElementById("rain");
    if (!c) return;
    try { window.RadioBG = BG(c); window.RadioBG.start(); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
