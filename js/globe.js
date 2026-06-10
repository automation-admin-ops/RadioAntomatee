/* ════════════════════════════════════════════════════════════
   RADIO ANTOMATEE — globe.js
   Obracająca się kula ziemska na <canvas> (bez bibliotek 3D).
   Kropki lądów z LAND_DOTS (Natural Earth), markery krajów,
   podświetlenie kraju aktualnie grającej stacji.
════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var DEG = Math.PI / 180;

  function RadioGlobe(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    /* — stan kamery — */
    this.yaw = -19 * DEG;          // start: Europa z przodu
    this.pitch = 24 * DEG;
    this.targetYaw = null;         // null = swobodna rotacja
    this.targetPitch = 24 * DEG;
    this.spinSpeed = 0.10;         // rad/s w trybie swobodnym

    /* — stan radia — */
    this.countries = {};           // { CC: liczba stacji }
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
    this._observe();
    this.resize();
    this.start();
  }

  /* Prekalkulacja wektorów 3D dla kropek lądu (raz). */
  RadioGlobe.prototype._prepareDots = function () {
    var dots = (typeof LAND_DOTS !== "undefined") ? LAND_DOTS : [];
    var n = dots.length;
    this.dotX = new Float32Array(n);
    this.dotY = new Float32Array(n);
    this.dotZ = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var lat = dots[i][0] * DEG, lon = dots[i][1] * DEG;
      var cl = Math.cos(lat);
      this.dotX[i] = cl * Math.cos(lon);
      this.dotY[i] = Math.sin(lat);
      this.dotZ[i] = cl * Math.sin(lon);
    }
    this.dotCount = n;
  };

  RadioGlobe.prototype._observe = function () {
    var self = this;
    /* pauza gdy karta w tle */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.stop(); else self.start();
    });
    /* pauza gdy canvas poza ekranem */
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        self._visible = !!(entries[0] && entries[0].isIntersecting);
        if (self._visible) self.start();
      }, { threshold: 0.01 });
      io.observe(this.canvas);
    }
    /* responsywny rozmiar */
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
    this.R = Math.min(this.w, this.h) * 0.385;
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
      /* obróć kulę tak, by kraj był z przodu */
      this.targetYaw = ll[1] * DEG - Math.PI / 2;
      this.targetPitch = Math.max(-38, Math.min(48, ll[0] * 0.85)) * DEG;
    } else {
      this.targetYaw = null;
      this.targetPitch = 24 * DEG;
    }
    if (!this._running) this._draw(0);
  };

  RadioGlobe.prototype.setPlaying = function (on) {
    this.playing = !!on;
    if (!this._running) this._draw(0);
  };

  /* — markery krajów — */

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
        /* skala logarytmiczna — Polska z setkami stacji nie przykrywa globu */
        r: 1.6 + Math.min(3.4, Math.log(cnt + 1) * 0.9)
      });
    }
    this.markers = out;
  };

  /* — pętla animacji — */

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
      /* ~30 fps wystarcza i oszczędza baterię */
      if (t - self._lastT >= 30) {
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
      /* płynny dojazd do kraju + delikatne kołysanie gdy gra */
      var sway = this.playing ? Math.sin(Date.now() / 1700) * 0.07 : 0;
      var dy = shortestAngle(this.targetYaw + sway - this.yaw);
      this.yaw += dy * Math.min(1, dt * 2.6);
    } else {
      this.yaw += this.spinSpeed * dt;
      if (this.yaw > Math.PI) this.yaw -= 2 * Math.PI;
    }
    var dp = this.targetPitch - this.pitch;
    this.pitch += dp * Math.min(1, dt * 2.2);
  };

  /* — render — */

  RadioGlobe.prototype._draw = function (time) {
    var ctx = this.ctx;
    if (!this.w || !this.h) return;
    var W = this.w, H = this.h, R = this.R, cx = this.cx, cy = this.cy;

    ctx.clearRect(0, 0, W, H);

    /* tło — głęboki, ciepły kosmos pasujący do palety */
    var bg = ctx.createRadialGradient(cx - R * 0.5, cy - R * 0.6, R * 0.2, cx, cy, Math.max(W, H) * 0.75);
    bg.addColorStop(0, "#461c0b");
    bg.addColorStop(0.45, "#2a1108");
    bg.addColorStop(1, "#150904");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* poświata atmosfery */
    var glow = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.34);
    glow.addColorStop(0, "rgba(232,110,50,0)");
    glow.addColorStop(0.55, "rgba(232,110,50,0.16)");
    glow.addColorStop(0.8, "rgba(232,110,50,0.05)");
    glow.addColorStop(1, "rgba(232,110,50,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.34, 0, 2 * Math.PI);
    ctx.fill();

    /* tarcza kuli */
    var sphere = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.45, R * 0.1, cx, cy, R);
    sphere.addColorStop(0, "#5e2810");
    sphere.addColorStop(0.55, "#421a0a");
    sphere.addColorStop(1, "#240e05");
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fill();

    /* rim light */
    ctx.strokeStyle = "rgba(255,200,160,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 0.5, 0, 2 * Math.PI);
    ctx.stroke();

    var sy = Math.sin(this.yaw), cyaw = Math.cos(this.yaw);
    var sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);

    /* kropki lądu */
    var i, x, y, z, rx, rz, ry2, rz2, sxp, syp, depth, rr, a;
    for (i = 0; i < this.dotCount; i++) {
      x = this.dotX[i]; y = this.dotY[i]; z = this.dotZ[i];
      rx = x * cyaw + z * sy;          /* yaw wokół osi Y */
      rz = -x * sy + z * cyaw;
      ry2 = y * cp - rz * sp;          /* pitch wokół osi X */
      rz2 = y * sp + rz * cp;
      if (rz2 <= 0.02) continue;       /* tylna półkula niewidoczna */
      sxp = cx + rx * R;
      syp = cy - ry2 * R;
      depth = rz2;                     /* 0..1 — głębia */
      rr = (0.7 + depth * 0.85) * (R / 150);
      a = 0.18 + depth * 0.5;
      ctx.fillStyle = "rgba(255,239,221," + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(sxp, syp, rr, 0, 2 * Math.PI);
      ctx.fill();
    }

    /* markery krajów ze stacjami */
    var m, mx, mz, my2, mz2, msx, msy, isActive, mr;
    var markers = this.markers || [];
    var activePt = null;
    for (i = 0; i < markers.length; i++) {
      m = markers[i];
      mx = m.x * cyaw + m.z * sy;
      mz = -m.x * sy + m.z * cyaw;
      my2 = m.y * cp - mz * sp;
      mz2 = m.y * sp + mz * cp;
      if (mz2 <= 0.04) continue;
      msx = cx + mx * R;
      msy = cy - my2 * R;
      isActive = (m.cc === this.activeCC);
      mr = m.r * (R / 150) * (0.75 + mz2 * 0.35);

      if (isActive) { activePt = { x: msx, y: msy, r: mr, depth: mz2 }; continue; }

      ctx.fillStyle = "rgba(245,158,90," + (0.35 + mz2 * 0.45).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(msx, msy, mr, 0, 2 * Math.PI);
      ctx.fill();
    }

    /* aktywny kraj — rysowany na końcu, na wierzchu */
    if (activePt) {
      var pulse = this.playing ? (0.5 + 0.5 * Math.sin(time * 4)) : 0.25;
      /* pierścień pulsu */
      ctx.strokeStyle = "rgba(255,170,90," + (0.6 - pulse * 0.35).toFixed(3) + ")";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, activePt.r + 5 + pulse * 7, 0, 2 * Math.PI);
      ctx.stroke();
      /* poświata */
      var ag = ctx.createRadialGradient(activePt.x, activePt.y, 0, activePt.x, activePt.y, activePt.r * 5);
      ag.addColorStop(0, "rgba(255,150,60,0.55)");
      ag.addColorStop(1, "rgba(255,150,60,0)");
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, activePt.r * 5, 0, 2 * Math.PI);
      ctx.fill();
      /* punkt */
      ctx.fillStyle = "#ffd9b0";
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, activePt.r + 1.2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#c2410c";
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, Math.max(1.4, activePt.r * 0.45), 0, 2 * Math.PI);
      ctx.fill();

      /* etykieta kraju */
      if (this.activeLabel) {
        var label = this.activeLabel;
        ctx.font = "700 11px 'Plus Jakarta Sans', sans-serif";
        var tw = ctx.measureText(label).width;
        var lx = activePt.x, ly = activePt.y - activePt.r - 16;
        if (ly < 18) ly = activePt.y + activePt.r + 22;
        if (lx - tw / 2 - 8 < 4) lx = tw / 2 + 12;
        if (lx + tw / 2 + 8 > W - 4) lx = W - tw / 2 - 12;
        ctx.fillStyle = "rgba(23,10,5,0.72)";
        roundRect(ctx, lx - tw / 2 - 8, ly - 10, tw + 16, 19, 9);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,200,160,0.3)";
        ctx.lineWidth = 1;
        roundRect(ctx, lx - tw / 2 - 8, ly - 10, tw + 16, 19, 9);
        ctx.stroke();
        ctx.fillStyle = "#ffe9d6";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, lx, ly);
      }
    }

    /* delikatny terminator (cień) z prawej strony */
    var shade = ctx.createRadialGradient(cx - R * 0.5, cy - R * 0.5, R * 0.3, cx, cy, R);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(0.82, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(10,4,2,0.45)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fill();
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
