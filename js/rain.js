/* ════════════════════════════════════════════════════════════
   RADIO ANTOMATEE — rain.js  ·  opadający kod „Matrix"
   Rysuje strumienie znaków na canvasie #rain (tło aplikacji).
   • kolor czytany z motywu (--rain: zielony lub bursztynowy),
   • smużenie przez półprzezroczyste przyciemnianie klatki,
   • ~30 fps, pauza gdy karta ukryta, statyczne przy reduce-motion.
   Moduł samodzielny — startuje sam po załadowaniu DOM.
════════════════════════════════════════════════════════════ */
(function () {
  function MatrixRain(canvas) {
    var ctx = canvas.getContext("2d");
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches; } catch (e) {}
    var GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾋﾌﾍﾎマミムメモヤユヨラリルレロワヲabcdefghijklmnopqrstuvwxyz0123456789:.=*+<>¦|".split("");
    var FS = 15;
    var W = 0, H = 0, cols = 0, drops = [], raf = 0, last = 0;

    function resize() {
      W = canvas.width = Math.floor(window.innerWidth);
      H = canvas.height = Math.floor(window.innerHeight);
      cols = Math.ceil(W / FS);
      drops = [];
      for (var i = 0; i < cols; i++) drops[i] = Math.random() * -50;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }

    function rainColor() {
      var c = "";
      try { c = getComputedStyle(document.documentElement).getPropertyValue("--rain").replace(/^\s+|\s+$/g, ""); } catch (e) {}
      return c || "#00ff66";
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return;      // ~30 fps
      last = t;
      ctx.fillStyle = "rgba(0,0,0,0.09)";   // smuga
      ctx.fillRect(0, 0, W, H);
      ctx.font = FS + "px 'Share Tech Mono', monospace";
      var col = rainColor();
      for (var i = 0; i < cols; i++) {
        var ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
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

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else if (!reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    });

    return {
      start: function () {
        resize();
        if (reduce) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); return; }
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    };
  }

  function init() {
    var c = document.getElementById("rain");
    if (!c) return;
    try { MatrixRain(c).start(); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
