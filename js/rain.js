/* ════════════════════════════════════════════════════════════
   RADIO ANTOMATEE — rain.js  ·  Tło zależne od motywu
   Jeden silnik cząsteczek na canvasie #rain, wiele trybów —
   każdy motyw ma WŁASNE, inne tło (nie deszcz kodu Matrix):
     matrix  — opadający kod (zielony)      → motyw green
     dust    — ciepły pył (sepia)           → amber
     snow    — padający śnieg                → cyan/lód
     grid    — retro perspektywa + słońce    → synthwave
     embers  — unoszące się iskry            → crimson
     stars   — dryfujące gwiazdy + meteor    → violet
     cats    — spadające kotki 🐱            → cats
     leaves  — liście + znaki ninja 🍥       → naruto
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
    var mode = "matrix", trail = 0.09, parts = [], drops = [], gridOff = 0, shoot = null, shootTimer = 3;

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

    function resize() {
      W = canvas.width = Math.floor(window.innerWidth);
      H = canvas.height = Math.floor(window.innerHeight);
      initMode();
    }

    function initMode() {
      parts = []; drops = []; gridOff = 0; shoot = null;
      var i, n;
      if (mode === "matrix") {
        trail = 0.09;
        var cols = Math.ceil(W / 15);
        for (i = 0; i < cols; i++) drops[i] = Math.random() * -50;
      } else if (mode === "cats" || mode === "leaves") {
        trail = 0; n = Math.max(10, Math.round(W / 90));
        for (i = 0; i < n; i++) parts.push(emoji());
      } else if (mode === "snow") {
        trail = 0; n = Math.max(30, Math.round(W / 14));
        for (i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(1, 3.4), vy: rnd(18, 55), ph: rnd(0, 6.28), sw: rnd(8, 26) });
      } else if (mode === "embers") {
        trail = 0.12; n = Math.max(20, Math.round(W / 26));
        for (i = 0; i < n; i++) parts.push(ember(true));
      } else if (mode === "stars") {
        trail = 0.06; n = Math.max(40, Math.round(W / 10));
        for (i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.4, 1.8), vx: rnd(-6, -1), ph: rnd(0, 6.28), tw: rnd(1, 2.4) });
      } else if (mode === "dust") {
        trail = 0; n = Math.max(24, Math.round(W / 34));
        for (i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.8, 2.6), vx: rnd(-7, 7), vy: rnd(-14, -4), ph: rnd(0, 6.28), a: rnd(0.15, 0.5) });
      } else if (mode === "petals") {
        trail = 0; n = Math.max(16, Math.round(W / 44));
        for (i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(7, 20), vy: rnd(20, 46), vx: rnd(-10, 10), ph: rnd(0, 6.28), sw: rnd(14, 34), a: rnd(0.1, 0.26) });
      } else if (mode === "bokeh") {
        trail = 0; n = Math.max(20, Math.round(W / 40));
        for (i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(8, 34), vy: rnd(-30, -8), vx: rnd(-9, 9), ph: rnd(0, 6.28), sw: rnd(10, 26), a: rnd(0.07, 0.2) });
      } else if (mode === "grid") {
        trail = 0;
      }
    }

    function emoji() {
      var set = (mode === "cats") ? CATS : LEAVES;
      return { x: Math.random() * W, y: rnd(-H, 0), sz: rnd(16, 30), vy: rnd(40, 95), vx: rnd(-18, 18), rot: rnd(0, 6.28), vr: rnd(-1.4, 1.4), ch: set[(Math.random() * set.length) | 0], ph: rnd(0, 6.28) };
    }
    function ember(anywhere) {
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, r: rnd(1, 2.8), vy: rnd(-46, -16), vx: rnd(-10, 10), life: rnd(0.5, 1), fl: rnd(0, 6.28) };
    }

    function frame(t2) {
      raf = requestAnimationFrame(frame);
      if (t2 - last < 33) return;
      var dt = Math.min(0.06, (t2 - last) / 1000);
      last = t2; t += dt;

      if (trail > 0) { ctx.fillStyle = "rgba(0,0,0," + trail + ")"; ctx.fillRect(0, 0, W, H); }
      else ctx.clearRect(0, 0, W, H);

      if (mode === "matrix") drawMatrix();
      else if (mode === "cats" || mode === "leaves") drawEmoji(dt);
      else if (mode === "snow") drawSnow(dt);
      else if (mode === "embers") drawEmbers(dt);
      else if (mode === "stars") drawStars(dt);
      else if (mode === "dust") drawDust(dt);
      else if (mode === "petals") drawPetals(dt);
      else if (mode === "bokeh") drawBokeh(dt);
      else if (mode === "grid") drawGrid(dt);
    }

    function drawMatrix() {
      var FS = 15, col = cssvar("--rain", "#00ff66");
      ctx.font = FS + "px 'Share Tech Mono', monospace";
      for (var i = 0; i < drops.length; i++) {
        var ch = MATRIX_G[(Math.random() * MATRIX_G.length) | 0];
        var x = i * FS, y = drops[i] * FS;
        if (y > 0) {
          if (Math.random() > 0.86) { ctx.fillStyle = "#d6ffe0"; ctx.shadowColor = col; ctx.shadowBlur = 8; }
          else { ctx.fillStyle = col; ctx.shadowBlur = 0; }
          ctx.fillText(ch, x, y);
          ctx.shadowBlur = 0;
        }
        if (y > H && Math.random() > 0.975) drops[i] = Math.random() * -20;
        drops[i] += 0.5 + Math.random() * 0.55;
      }
    }

    function drawEmoji(dt) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t + p.ph) * 12) * dt; p.rot += p.vr * dt;
        if (p.y > H + 30) { parts[i] = emoji(); parts[i].y = -30; continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.font = p.sz + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.9; ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function drawSnow(dt) {
      ctx.fillStyle = "rgba(" + rgbOf("--rain", "170,225,255") + ",0.9)";
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += Math.sin(t * 0.8 + p.ph) * p.sw * dt;
        if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
        ctx.globalAlpha = 0.55 + 0.4 * Math.sin(p.ph + t);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawEmbers(dt) {
      var base = rgbOf("--rain", "255,90,60");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 2 + p.fl) * 8) * dt; p.life -= dt * 0.32;
        if (p.life <= 0 || p.y < -10) { parts[i] = ember(false); continue; }
        var fl = 0.6 + 0.4 * Math.sin(t * 8 + p.fl);
        ctx.globalAlpha = Math.max(0, p.life) * fl;
        ctx.fillStyle = "rgb(" + base + ")"; ctx.shadowColor = "rgb(" + base + ")"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    function drawStars(dt) {
      var col = rgbOf("--rain", "169,112,255");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * dt; if (p.x < -2) { p.x = W + 2; p.y = Math.random() * H; }
        ctx.globalAlpha = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph));
        ctx.fillStyle = i % 5 === 0 ? "rgb(" + col + ")" : "#eaf0ff";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* meteor od czasu do czasu */
      shootTimer -= dt;
      if (!shoot && shootTimer <= 0) { shoot = { x: rnd(W * 0.3, W), y: rnd(0, H * 0.4), len: rnd(120, 240), life: 1 }; shootTimer = rnd(4, 9); }
      if (shoot) {
        shoot.x -= 520 * dt; shoot.y += 190 * dt; shoot.life -= dt * 1.1;
        if (shoot.life <= 0) shoot = null;
        else {
          var g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x + shoot.len, shoot.y - shoot.len * 0.36);
          g.addColorStop(0, "rgba(255,255,255," + shoot.life + ")");
          g.addColorStop(1, "rgba(" + col + ",0)");
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x + shoot.len, shoot.y - shoot.len * 0.36); ctx.stroke();
        }
      }
    }

    function drawDust(dt) {
      var col = rgbOf("--rain", "255,176,0");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += (p.vx + Math.sin(t * 0.5 + p.ph) * 6) * dt; p.y += p.vy * dt;
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6;
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t + p.ph));
        ctx.fillStyle = "rgb(" + col + ")"; ctx.shadowColor = "rgb(" + col + ")"; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    function drawPetals(dt) {
      var col = rgbOf("--rain", "225,29,29");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 0.7 + p.ph) * p.sw) * dt; p.ph += dt * 0.6;
        if (p.y > H + 24) { p.y = -24; p.x = Math.random() * W; }
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, "rgba(" + col + "," + (p.a + 0.06) + ")");
        g.addColorStop(1, "rgba(" + col + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }

    function drawBokeh(dt) {
      var col = rgbOf("--rain", "232,147,12");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 0.5 + p.ph) * p.sw) * dt; p.ph += dt * 0.4;
        if (p.y < -36) { p.y = H + 36; p.x = Math.random() * W; }
        var pulse = 0.7 + 0.3 * Math.sin(t * 1.2 + p.ph);
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, "rgba(" + col + "," + (p.a * pulse + 0.05) + ")");
        g.addColorStop(0.7, "rgba(" + col + "," + (p.a * pulse * 0.4) + ")");
        g.addColorStop(1, "rgba(" + col + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }

    function drawGrid(dt) {
      gridOff = (gridOff + dt * 0.35) % 1;
      var col = rgbOf("--rain", "255,60,166");
      var sun = rgbOf("--globe-core", "255,120,200");
      var hy = H * 0.46, vpx = W / 2;
      /* słońce nad horyzontem */
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
        var f = (k + gridOff) / 16; var yy = hy + f * f * (H - hy);
        ctx.globalAlpha = 0.15 + 0.6 * f;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      }
      /* linie pionowe — zbieżne do punktu ucieczki */
      ctx.globalAlpha = 0.4;
      for (var j = -10; j <= 10; j++) {
        ctx.beginPath(); ctx.moveTo(vpx + j * (W / 8), H); ctx.lineTo(vpx + j * 6, hy); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else if (!reduce) { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(frame); }
    });

    return {
      setMode: function (m) {
        if (!m || m === mode) return;
        mode = m; initMode();
        ctx.clearRect(0, 0, W, H);
      },
      start: function () {
        var th = ""; try { th = document.documentElement.getAttribute("data-theme") || ""; } catch (e) {}
        mode = THEME_MODE[th] || "matrix";
        resize();
        if (reduce) { ctx.clearRect(0, 0, W, H); return; }
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
