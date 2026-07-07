/* ════════════════════════════════════════════════════════════
   RADIO ANTOMATEE — globe.js  ·  Realistyczna Ziemia (canvas 2D)
   Obracająca się planeta bez bibliotek 3D:
   • niebieskie oceany z cieniowaniem dzień/noc (terminator),
   • lądy z LAND_DOTS (Natural Earth) — zieleń/pustynie/lód wg szerokości,
   • świecąca atmosfera (tint z motywu), gwiezdne tło, siatka południków,
   • markery krajów ze stacjami + pulsujący aktywny kraj z etykietą,
   • światła miast po stronie nocnej, płynny dojazd do kraju.
════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var DEG = Math.PI / 180;

  function _cssVar(name, fb){
    try{
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).replace(/^\s+|\s+$/g,"");
      return v || fb;
    }catch(e){ return fb; }
  }
  function themeRGB(){ return _cssVar("--globe-rgb","0,255,65"); }
  function themeCore(){ return _cssVar("--globe-core","#d6ffdf"); }

  /* deterministyczny „random" 0..1 dla indeksu (bez Math.random w renderze) */
  function frand(i){
    var x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function RadioGlobe(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    /* — kamera — */
    this.yaw = -19 * DEG;            // start: Europa z przodu
    this.pitch = 20 * DEG;
    this.targetYaw = null;           // null = swobodna rotacja
    this.targetPitch = 20 * DEG;
    this.spinSpeed = 0.085;          // rad/s w trybie swobodnym

    /* — kierunek słońca (świat) — nieruchomy, terminator sam sunie po obrocie */
    var sunLat = 16 * DEG, sunLon = -34 * DEG, scl = Math.cos(sunLat);
    this.sun = { x: scl * Math.cos(sunLon), y: Math.sin(sunLat), z: scl * Math.sin(sunLon) };

    /* — stan radia — */
    this.countries = {};
    this.activeCC = null;
    this.activeLabel = "";
    this.playing = false;

    this.reducedMotion = false;
    try {
      this.reducedMotion = global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}

    this._visible = true;
    this._running = false;
    this._lastT = 0;
    this._raf = 0;
    this._dpr = 1;

    this._prepareDots();
    this._prepareStars();
    this._observe();
    this.resize();
    this.start();
  }

  /* Prekalkulacja wektorów 3D dla kropek lądu + koloru bazowego wg szerokości. */
  RadioGlobe.prototype._prepareDots = function () {
    var dots = (typeof LAND_DOTS !== "undefined") ? LAND_DOTS : [];
    var n = dots.length;
    this.dotX = new Float32Array(n);
    this.dotY = new Float32Array(n);
    this.dotZ = new Float32Array(n);
    this.dotR = new Float32Array(n);   // 0..1 czerwony bazowy
    this.dotG = new Float32Array(n);
    this.dotB = new Float32Array(n);
    this.dotCity = new Uint8Array(n);  // 1 = świeci nocą (miasto)
    for (var i = 0; i < n; i++) {
      var lat = dots[i][0], lon = dots[i][1];
      var latR = lat * DEG, lonR = lon * DEG, cl = Math.cos(latR);
      this.dotX[i] = cl * Math.cos(lonR);
      this.dotY[i] = Math.sin(latR);
      this.dotZ[i] = cl * Math.sin(lonR);

      var alat = Math.abs(lat), r, g, b, jig = frand(i) * 0.16 - 0.08;
      if (alat > 66) {            // strefy polarne — lód/śnieg
        r = 0.86; g = 0.90; b = 0.95;
      } else if (alat > 50) {     // tajga / chłodna zieleń
        r = 0.30; g = 0.45; b = 0.30;
      } else if (alat >= 18 && alat <= 33 && frand(i * 3.3) > 0.42) {
        r = 0.70; g = 0.60; b = 0.38;   // pas pustyń
      } else {                    // umiarkowana/tropikalna zieleń
        r = 0.24; g = 0.50; b = 0.28;
      }
      this.dotR[i] = Math.max(0, Math.min(1, r + jig));
      this.dotG[i] = Math.max(0, Math.min(1, g + jig));
      this.dotB[i] = Math.max(0, Math.min(1, b + jig * 0.5));
      this.dotCity[i] = (frand(i * 7.7) > 0.86) ? 1 : 0;   // ~14% punktów = światła
    }
    this.dotCount = n;
  };

  /* Gwiezdne tło — stałe pozycje (seed), delikatne migotanie. */
  RadioGlobe.prototype._prepareStars = function () {
    var N = 90, s = [];
    for (var i = 0; i < N; i++) {
      s.push({ x: frand(i + 1), y: frand(i * 2.3 + 5), r: 0.4 + frand(i * 5.1) * 1.1, p: frand(i * 9.2) * 6.28 });
    }
    this.stars = s;
  };

  RadioGlobe.prototype._observe = function () {
    var self = this;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.stop(); else self.start();
    });
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        self._visible = !!(entries[0] && entries[0].isIntersecting);
        if (self._visible) self.start(); else self.stop();
      }, { threshold: 0.01 });
      io.observe(this.canvas);
    }
    if (typeof ResizeObserver !== "undefined") {
      var ro = new ResizeObserver(function () { self.resize(); });
      ro.observe(this.canvas);
    } else {
      global.addEventListener("resize", function () { self.resize(); });
    }
  };

  RadioGlobe.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    this._dpr = dpr;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.w = rect.width;
    this.h = rect.height;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.R = Math.min(this.w, this.h) * 0.40;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    if (!this._running) this._draw(0);
  };

  /* — API publiczne — */
  RadioGlobe.prototype.setCountries = function (counts) {
    this.countries = counts || {};
    this._buildMarkers();
    if (!this._running) this._draw(0);
  };

  RadioGlobe.prototype.setActive = function (cc, label) {
    this.activeCC = cc || null;
    this.activeLabel = label || "";
    var ll = (cc && typeof COUNTRY_LL !== "undefined") ? COUNTRY_LL[cc] : null;
    if (ll) {
      this.targetYaw = ll[1] * DEG - Math.PI / 2;
      this.targetPitch = Math.max(-40, Math.min(50, ll[0] * 0.9)) * DEG;
    } else {
      this.targetYaw = null;
      this.targetPitch = 20 * DEG;
    }
    if (!this._running) this._draw(0);
  };

  RadioGlobe.prototype.setPlaying = function (on) {
    this.playing = !!on;
    if (!this._running) this._draw(0);
  };

  RadioGlobe.prototype._buildMarkers = function () {
    var out = [], cc, ll, cnt;
    if (typeof COUNTRY_LL === "undefined") { this.markers = out; return; }
    for (cc in this.countries) {
      if (!this.countries.hasOwnProperty(cc)) continue;
      ll = COUNTRY_LL[cc];
      if (!ll) continue;
      cnt = this.countries[cc] || 1;
      var lat = ll[0] * DEG, lon = ll[1] * DEG, cl = Math.cos(lat);
      out.push({
        cc: cc,
        x: cl * Math.cos(lon),
        y: Math.sin(lat),
        z: cl * Math.sin(lon),
        r: 1.7 + Math.min(3.6, Math.log(cnt + 1) * 0.95)
      });
    }
    this.markers = out;
  };

  /* — pętla — */
  RadioGlobe.prototype.start = function () {
    if (this._running || !this._visible || document.hidden) return;
    if (this.reducedMotion) { this._snapToTarget(); this._draw(0); return; }
    this._running = true;
    this._lastT = 0;
    var self = this;
    this._raf = global.requestAnimationFrame(function step(t) {
      if (!self._running) return;
      if (!self._lastT) self._lastT = t;
      var dt = Math.min(0.05, (t - self._lastT) / 1000);
      if (t - self._lastT >= 28) {
        self._lastT = t;
        self._update(dt <= 0 ? 0.033 : Math.max(dt, 0.03));
        self._draw(t / 1000);
      }
      self._raf = global.requestAnimationFrame(step);
    });
  };

  RadioGlobe.prototype.stop = function () {
    this._running = false;
    if (this._raf) global.cancelAnimationFrame(this._raf);
  };

  RadioGlobe.prototype._snapToTarget = function () {
    if (this.targetYaw !== null) this.yaw = this.targetYaw;
    this.pitch = this.targetPitch;
  };

  function shortestAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  RadioGlobe.prototype._update = function (dt) {
    if (this.targetYaw !== null) {
      var sway = this.playing ? Math.sin(Date.now() / 1800) * 0.06 : 0;
      var dy = shortestAngle(this.targetYaw + sway - this.yaw);
      this.yaw += dy * Math.min(1, dt * 2.4);
    } else {
      this.yaw += this.spinSpeed * dt;
      if (this.yaw > Math.PI) this.yaw -= 2 * Math.PI;
    }
    var dp = this.targetPitch - this.pitch;
    this.pitch += dp * Math.min(1, dt * 2.1);
  };

  /* rotacja wektora świata -> widok (yaw wokół Y, potem pitch wokół X) */
  function rot(x, y, z, sy, cyaw, sp, cp, out) {
    var rx = x * cyaw + z * sy;
    var rz = -x * sy + z * cyaw;
    out[0] = rx;
    out[1] = y * cp - rz * sp;
    out[2] = y * sp + rz * cp;
  }

  function smooth(a, b, t){ t = (t - a) / (b - a); if (t < 0) t = 0; if (t > 1) t = 1; return t * t * (3 - 2 * t); }

  /* — render — */
  RadioGlobe.prototype._draw = function (time) {
    var ctx = this.ctx;
    if (!this.w || !this.h) return;
    var W = this.w, H = this.h, R = this.R, cx = this.cx, cy = this.cy;
    var RGB = themeRGB(), CORE = themeCore();

    ctx.clearRect(0, 0, W, H);

    var sy = Math.sin(this.yaw), cyaw = Math.cos(this.yaw);
    var sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    var v = [0, 0, 0];

    /* słońce w przestrzeni widoku (do umiejscowienia dnia/refleksu) */
    rot(this.sun.x, this.sun.y, this.sun.z, sy, cyaw, sp, cp, v);
    var sunVX = v[0], sunVY = v[1], sunVZ = v[2];
    var lightPX = cx + sunVX * R * 0.72;
    var lightPY = cy - sunVY * R * 0.72;

    /* ── gwiazdy w tle ── */
    var i;
    for (i = 0; i < this.stars.length; i++) {
      var st = this.stars[i];
      var tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.5 + st.p));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillStyle = "#eaf2ff";
      ctx.beginPath();
      ctx.arc(st.x * W, st.y * H, st.r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* ── poświata atmosfery (tint motywu) ── */
    var glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.42);
    glow.addColorStop(0, "rgba(" + RGB + ",0)");
    glow.addColorStop(0.5, "rgba(" + RGB + ",0.20)");
    glow.addColorStop(0.78, "rgba(" + RGB + ",0.06)");
    glow.addColorStop(1, "rgba(" + RGB + ",0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.42, 0, 6.283);
    ctx.fill();

    /* ── ocean: kula z cieniem dzień/noc wyśrodkowanym na słońcu ── */
    var oc = ctx.createRadialGradient(lightPX, lightPY, R * 0.05, cx, cy, R * 1.25);
    oc.addColorStop(0,    "rgba(70,150,210,1)");     // rozświetlony dzień
    oc.addColorStop(0.28, "rgba(34,104,168,1)");
    oc.addColorStop(0.55, "rgba(16,60,112,1)");
    oc.addColorStop(0.78, "rgba(7,30,64,1)");
    oc.addColorStop(1,    "rgba(3,12,32,1)");        // głęboka noc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = oc;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    /* ── siatka południków/równoleżników (delikatna) ── */
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = "rgba(150,200,240,0.10)";
    this._drawGraticule(ctx, sy, cyaw, sp, cp, R, cx, cy);

    /* ── lądy ── */
    var x, y, z, sxp, syp, depth, rr, light, day, cr, cg, cb;
    var sunx = this.sun.x, suny = this.sun.y, sunz = this.sun.z;
    var Rk = R / 150;
    for (i = 0; i < this.dotCount; i++) {
      x = this.dotX[i]; y = this.dotY[i]; z = this.dotZ[i];
      rot(x, y, z, sy, cyaw, sp, cp, v);
      if (v[2] <= 0.015) continue;             // tylna półkula
      sxp = cx + v[0] * R;
      syp = cy - v[1] * R;
      depth = v[2];
      light = x * sunx + y * suny + z * sunz;  // -1..1 (niezależne od obrotu)
      day = smooth(-0.18, 0.22, light);        // 0 noc .. 1 dzień
      rr = (1.15 + depth * 0.5) * Rk;

      if (day > 0.06) {
        var shade = 0.32 + day * 0.68;
        cr = (this.dotR[i] * shade * 255) | 0;
        cg = (this.dotG[i] * shade * 255) | 0;
        cb = (this.dotB[i] * shade * 255) | 0;
        ctx.fillStyle = "rgb(" + cr + "," + cg + "," + cb + ")";
        ctx.globalAlpha = 0.55 + depth * 0.45;
        ctx.beginPath();
        ctx.arc(sxp, syp, rr, 0, 6.283);
        ctx.fill();
      } else {
        /* strona nocna — ciemny ląd + ewentualne światła miast */
        ctx.globalAlpha = 0.5 + depth * 0.3;
        ctx.fillStyle = "rgb(10,20,30)";
        ctx.beginPath();
        ctx.arc(sxp, syp, rr, 0, 6.283);
        ctx.fill();
        if (this.dotCity[i]) {
          var flick = 0.6 + 0.4 * Math.sin(time * 3 + i);
          ctx.globalAlpha = (0.25 + depth * 0.4) * flick;
          ctx.fillStyle = "rgb(255,214,140)";
          ctx.beginPath();
          ctx.arc(sxp, syp, rr * 0.62, 0, 6.283);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    /* ── refleks słoneczny na oceanie ── */
    if (sunVZ > 0) {
      var spec = ctx.createRadialGradient(lightPX, lightPY, 0, lightPX, lightPY, R * 0.5);
      spec.addColorStop(0, "rgba(210,235,255,0.28)");
      spec.addColorStop(0.4, "rgba(150,205,245,0.10)");
      spec.addColorStop(1, "rgba(150,205,245,0)");
      ctx.fillStyle = spec;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }

    ctx.restore();  // koniec clip kuli

    /* ── cienki pierścień atmosfery na krawędzi ── */
    var rim = ctx.createRadialGradient(cx, cy, R * 0.93, cx, cy, R * 1.06);
    rim.addColorStop(0, "rgba(" + RGB + ",0)");
    rim.addColorStop(0.6, "rgba(150,205,245,0.16)");
    rim.addColorStop(0.82, "rgba(" + RGB + ",0.34)");
    rim.addColorStop(1, "rgba(" + RGB + ",0)");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.06, 0, 6.283);
    ctx.fill();

    /* ── markery krajów ze stacjami ── */
    var m, msx, msy, isActive, mr, mz2, activePt = null;
    var markers = this.markers || [];
    for (i = 0; i < markers.length; i++) {
      m = markers[i];
      rot(m.x, m.y, m.z, sy, cyaw, sp, cp, v);
      mz2 = v[2];
      if (mz2 <= 0.04) continue;
      msx = cx + v[0] * R;
      msy = cy - v[1] * R;
      isActive = (m.cc === this.activeCC);
      mr = m.r * Rk * (0.78 + mz2 * 0.32);
      if (isActive) { activePt = { x: msx, y: msy, r: mr, depth: mz2 }; continue; }
      ctx.fillStyle = "rgba(" + RGB + "," + (0.4 + mz2 * 0.5).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(msx, msy, mr, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255," + (0.3 + mz2 * 0.3).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(msx, msy, Math.max(0.8, mr * 0.4), 0, 6.283);
      ctx.fill();
    }

    /* ── aktywny kraj — na wierzchu ── */
    if (activePt) {
      var pulse = this.playing ? (0.5 + 0.5 * Math.sin(time * 4)) : 0.25;
      ctx.strokeStyle = "rgba(" + RGB + "," + (0.62 - pulse * 0.32).toFixed(3) + ")";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, activePt.r + 5 + pulse * 8, 0, 6.283);
      ctx.stroke();

      var ag = ctx.createRadialGradient(activePt.x, activePt.y, 0, activePt.x, activePt.y, activePt.r * 5.5);
      ag.addColorStop(0, "rgba(" + RGB + ",0.6)");
      ag.addColorStop(1, "rgba(" + RGB + ",0)");
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, activePt.r * 5.5, 0, 6.283);
      ctx.fill();

      ctx.fillStyle = CORE;
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, activePt.r + 1.4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = "rgb(" + RGB + ")";
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, Math.max(1.5, activePt.r * 0.45), 0, 6.283);
      ctx.fill();

      if (this.activeLabel) {
        var label = this.activeLabel;
        ctx.font = "12px 'Share Tech Mono', monospace";
        var twd = ctx.measureText(label).width;
        var lx = activePt.x, ly = activePt.y - activePt.r - 16;
        if (ly < 18) ly = activePt.y + activePt.r + 22;
        if (lx - twd / 2 - 8 < 4) lx = twd / 2 + 12;
        if (lx + twd / 2 + 8 > W - 4) lx = W - twd / 2 - 12;
        ctx.fillStyle = "rgba(3,10,20,0.8)";
        roundRect(ctx, lx - twd / 2 - 8, ly - 10, twd + 16, 19, 9);
        ctx.fill();
        ctx.strokeStyle = "rgba(" + RGB + ",0.4)";
        ctx.lineWidth = 1;
        roundRect(ctx, lx - twd / 2 - 8, ly - 10, twd + 16, 19, 9);
        ctx.stroke();
        ctx.fillStyle = CORE;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, lx, ly);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }
    }
  };

  /* Siatka geograficzna: równoleżniki co 30°, południki co 30°. */
  RadioGlobe.prototype._drawGraticule = function (ctx, sy, cyaw, sp, cp, R, cx, cy) {
    var v = [0, 0, 0], lat, lon, first, x, y, z, cl;
    /* równoleżniki */
    for (lat = -60; lat <= 60; lat += 30) {
      var latR = lat * DEG; cl = Math.cos(latR); y = Math.sin(latR);
      ctx.beginPath(); first = true;
      for (lon = 0; lon <= 360; lon += 9) {
        var lonR = lon * DEG;
        rot(cl * Math.cos(lonR), y, cl * Math.sin(lonR), sy, cyaw, sp, cp, v);
        if (v[2] <= 0.02) { first = true; continue; }
        x = cx + v[0] * R; z = cy - v[1] * R;
        if (first) { ctx.moveTo(x, z); first = false; } else ctx.lineTo(x, z);
      }
      ctx.stroke();
    }
    /* południki */
    for (lon = 0; lon < 180; lon += 30) {
      ctx.beginPath(); first = true;
      for (lat = -90; lat <= 90; lat += 6) {
        var la = lat * DEG, lo = lon * DEG; cl = Math.cos(la);
        rot(cl * Math.cos(lo), Math.sin(la), cl * Math.sin(lo), sy, cyaw, sp, cp, v);
        if (v[2] <= 0.02) { first = true; continue; }
        x = cx + v[0] * R; z = cy - v[1] * R;
        if (first) { ctx.moveTo(x, z); first = false; } else ctx.lineTo(x, z);
      }
      ctx.stroke();
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  global.RadioGlobe = RadioGlobe;
})(window);
