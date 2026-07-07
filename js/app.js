/* ════════════════════════════════════════════════════════════
   RADIO ANTOMATEE — app.js
   Logika aplikacji: Radio Browser API, odtwarzacz, filtry,
   ulubione, blokowanie zepsutych stacji, cache listy, globus.
════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   MIRRORY API — wszystkie stacje z Radio Browser
══════════════════════════════════════════════════════════ */
var API_MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info"
];

/* Polskie tagi klubowe — uzupełniają główną listę PL. */
var PL_TAG_QUERIES = ["dance", "house", "club", "techno", "trance", "vixa", "edm"];

/* Światowe tagi — rave, klubowe i pochodne (bez ograniczenia kraju). */
var WORLD_TAG_QUERIES = [
  "rave", "hardstyle", "gabber", "hardcore", "hard techno",
  "drum and bass", "dubstep", "psytrance", "techno", "house",
  "trance", "club"
];

/* Zapytania po nazwie — gwarantują konkretne "hity"
   (Energy 2000, RadioParty) niezależnie od rankingu głosów. */
var EXTRA_NAME_QUERIES = ["energy 2000", "energy2000", "radioparty", "radio party"];

/* Stacje pasujące tutaj dostają plakietkę "HIT" i pływają na górę
   widoku "Klubowe". */
var FEATURED_RE = /(energy\s*2000|radio\s*party|radioparty)/i;

/* Co liczy się jako stacja klubowa dla szybkiego filtra "Klubowe". */
var CLUB_RE = /(dance|house|club|techno|trance|vixa|edm|rave|hands\s*up|party|energy\s*2000|hardstyle|gabber|hardcore|drum\s*(?:and|'?n'?|&)\s*bass|\bdnb\b|dubstep|psytrance|jungle|electro)/;

/* Preferowane tagi gatunków (wg priorytetu) — wybiera najbardziej
   znaczący tag zamiast pierwszego z brzegu. */
var GENRE_PRIORITY = [
  "disco polo", "vixa", "hands up", "hardstyle", "gabber", "rave",
  "hard techno", "hardcore", "drum and bass", "dnb", "dubstep",
  "psytrance", "house", "deep house", "tech house", "dance", "club",
  "techno", "trance", "edm", "electro", "minimal", "electronic",
  "pop", "rock", "hip-hop", "rap", "rnb", "jazz", "blues", "classical",
  "chillout", "lounge", "oldies", "80s", "90s", "reggae", "metal",
  "folk", "country", "news", "talk", "sport", "religia", "religious",
  "dzieci", "kids"
];

/* ══════════════════════════════════════════════════════════
   STACJE KURATOROWANE — pewne, stabilne streamy (zawsze działają)
   Dodawane niezależnie od API: nawet gdy Radio Browser nie
   odpowiada, użytkownik ma gwarantowany zestaw grających stacji.
   SomaFM: bezpłatne, wieloletnie, stałe adresy MP3 (bez CORS).
══════════════════════════════════════════════════════════ */
var CURATED = [
  { name: "SomaFM Groove Salad",        url: "https://ice1.somafm.com/groovesalad-128-mp3",      genre: "Chillout",   club: true,  featured: true },
  { name: "SomaFM Beat Blender",        url: "https://ice1.somafm.com/beatblender-128-mp3",      genre: "Deep House", club: true },
  { name: "SomaFM The Trip",            url: "https://ice1.somafm.com/thetrip-128-mp3",          genre: "Trance",     club: true },
  { name: "SomaFM DEF CON Radio",       url: "https://ice1.somafm.com/defcon-128-mp3",           genre: "Electronic", club: true,  featured: true },
  { name: "SomaFM cliqhop idm",         url: "https://ice1.somafm.com/cliqhop-128-mp3",          genre: "IDM",        club: true },
  { name: "SomaFM Dub Step Beyond",     url: "https://ice1.somafm.com/dubstep-128-mp3",          genre: "Dubstep",    club: true },
  { name: "SomaFM Suburbs of Goa",      url: "https://ice1.somafm.com/suburbsofgoa-128-mp3",     genre: "Psytrance",  club: true },
  { name: "SomaFM PopTron",             url: "https://ice1.somafm.com/poptron-128-mp3",          genre: "Electro",    club: true },
  { name: "SomaFM Vaporwaves",          url: "https://ice1.somafm.com/vaporwaves-128-mp3",       genre: "Vaporwave",  club: true },
  { name: "SomaFM Space Station Soma",  url: "https://ice1.somafm.com/spacestation-128-mp3",     genre: "Electronic", club: true },
  { name: "SomaFM Drone Zone",          url: "https://ice1.somafm.com/dronezone-128-mp3",        genre: "Ambient" },
  { name: "SomaFM Mission Control",     url: "https://ice1.somafm.com/missioncontrol-128-mp3",   genre: "Ambient" },
  { name: "SomaFM Fluid",               url: "https://ice1.somafm.com/fluid-128-mp3",            genre: "Hip-Hop" },
  { name: "SomaFM Secret Agent",        url: "https://ice1.somafm.com/secretagent-128-mp3",      genre: "Lounge" },
  { name: "SomaFM Illinois Street Lounge", url: "https://ice1.somafm.com/illstreet-128-mp3",     genre: "Lounge" },
  { name: "SomaFM Underground 80s",     url: "https://ice1.somafm.com/u80s-128-mp3",             genre: "80s" },
  { name: "SomaFM Left Coast 70s",      url: "https://ice1.somafm.com/seventies-128-mp3",        genre: "70s" },
  { name: "SomaFM Seven Inch Soul",     url: "https://ice1.somafm.com/7soul-128-mp3",            genre: "Soul" },
  { name: "SomaFM Heavyweight Reggae",  url: "https://ice1.somafm.com/reggae-128-mp3",           genre: "Reggae" },
  { name: "SomaFM Indie Pop Rocks",     url: "https://ice1.somafm.com/indiepoprocks-128-mp3",    genre: "Indie" },
  { name: "SomaFM Lush",                url: "https://ice1.somafm.com/lush-128-mp3",             genre: "Chillout" },
  { name: "SomaFM Metal Detector",      url: "https://ice1.somafm.com/metal-128-mp3",            genre: "Metal" },
  { name: "SomaFM Sonic Universe",      url: "https://ice1.somafm.com/sonicuniverse-128-mp3",    genre: "Jazz" },
  { name: "SomaFM ThistleRadio",        url: "https://ice1.somafm.com/thistle-128-mp3",          genre: "Folk" },
  { name: "SomaFM Boot Liquor",         url: "https://ice1.somafm.com/bootliquor-128-mp3",       genre: "Country" },
  { name: "SomaFM Folk Forward",        url: "https://ice1.somafm.com/folkfwd-128-mp3",          genre: "Folk" }
];

/* Zepsute stacje wygasają po 24 h. */
var BROKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/* Okres karencji zanim stacja zostanie oznaczona jako zepsuta. */
var BROKEN_GRACE_MS = 3500;

/* Cache listy stacji — aplikacja startuje natychmiast, odświeża w tle. */
var STATION_CACHE_KEY = "radioantomatee-stations-v3";
try { localStorage.removeItem("radioantomatee-stations-v2"); } catch(e){}
var STATION_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 h

/* ══════════════════════════════════════════════════════════
   STAN
══════════════════════════════════════════════════════════ */
var state = {
  stations: [], view: [], favorites: {},
  selectedIndex: 0, activeId: "",
  volume: 65, lastVolume: 65,
  filters: { q: "", country: "", genre: "", onlyFav: false, onlyClub: false, onlyPL: false, sort: "name" },
  connectTimer: null, connectToken: 0,
  brokenStations: {},
  pendingBrokenId: null,
  pendingBrokenTimer: null,
  refreshing: false
};

var globe = null;

/* ══════════════════════════════════════════════════════════
   AUDIO
══════════════════════════════════════════════════════════ */
var audioEl = null, audioState = 1, _stopping = false, hlsInstance = null;

function destroyHls(){ if(hlsInstance){try{hlsInstance.destroy();}catch(e){} hlsInstance=null;} }
function applyVolume(){ if(audioEl) try{ audioEl.volume=state.volume/100; }catch(e){} }

function getPlayer(){
  if(!audioEl){
    audioEl = new Audio();
    audioEl.preload = "none";
    /* UWAGA: bez crossOrigin="anonymous" — wymusza CORS i ucina wiele
       streamów Icecast/Shoutcast bez nagłówków CORS. */
    audioEl.addEventListener("playing", function(){ applyVolume(); if(_stopping)return; audioState=3; onPlayStateChange(3); });
    audioEl.addEventListener("pause",   function(){ if(_stopping)return; audioState=2; onPlayStateChange(2); });
    audioEl.addEventListener("waiting", function(){ if(_stopping)return; audioState=6; onPlayStateChange(6); });
    audioEl.addEventListener("stalled", function(){ if(_stopping)return; audioState=11; onPlayStateChange(11); });
    audioEl.addEventListener("error",   function(){ if(_stopping)return; onPlayerError(); });
    audioEl.addEventListener("ended",   function(){ if(_stopping)return; audioState=1; onPlayStateChange(1); });
  }
  return audioEl;
}

/* ══════════════════════════════════════════════════════════
   POMOCNICZE
══════════════════════════════════════════════════════════ */
function $(id){ return document.getElementById(id); }
function bind(el,evt,fn){ if(el) el.addEventListener(evt,fn,false); }
function stopEvt(e){ if(e.preventDefault)e.preventDefault(); if(e.stopPropagation)e.stopPropagation(); return false; }
function clamp(n,mn,mx){ n=parseInt(n,10); if(isNaN(n))n=mn; return n<mn?mn:n>mx?mx:n; }
function trim(s){ return ("" + (s==null?"":s)).replace(/^\s+|\s+$/g,""); }
function lower(s){ return trim(s).toLowerCase(); }
function safeText(s){ return ("" + (s==null?"":s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function isMobile(){ return window.innerWidth < 761; }
function nfmt(n){ try { return (+n).toLocaleString("pl-PL"); } catch(e){ return "" + n; } }
function uniqSort(arr){
  var map={},out=[];
  arr.forEach(function(v){ v=trim(v); if(v&&!map[v]){map[v]=1;out.push(v);} });
  return out.sort(function(a,b){ a=lower(a);b=lower(b);return a<b?-1:a>b?1:0; });
}
function hash32(str){
  var i,h=2166136261;
  for(i=0;i<str.length;i++){h^=str.charCodeAt(i);h=h+(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}
  return ("00000000"+(h>>>0).toString(16)).slice(-8);
}
function makeId(url,name){ return hash32(url+"|"+name); }
function capWords(s){
  return s.replace(/(^|\s|-)(\S)/g, function(m,p1,p2){ return p1 + p2.toUpperCase(); });
}
function normUrl(u){ return lower(u).replace(/\/+$/,""); }

/* — kraje: nazwy po polsku — */
var _regionNames = null;
try { _regionNames = new Intl.DisplayNames(["pl"], { type: "region" }); } catch(e){}

var _ccNameCache = {};
function countryName(cc){
  if (!cc || cc === "??") return "Nieznany";
  if (_ccNameCache[cc]) return _ccNameCache[cc];
  var n = cc;
  if (_regionNames) { try { n = _regionNames.of(cc) || cc; } catch(e){ n = cc; } }
  _ccNameCache[cc] = n;
  return n;
}

/* ══════════════════════════════════════════════════════════
   POBIERANIE STACJI (Radio Browser API)
══════════════════════════════════════════════════════════ */
async function fetchWithTimeout(url, ms){
  var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
  var timer = setTimeout(function(){ if (ctrl) { try { ctrl.abort(); } catch(e){} } }, ms);
  try {
    var resp = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: ctrl ? ctrl.signal : undefined
    });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

/* Próbuj mirrorów w losowej kolejności, aż któryś odpowie. */
async function fetchFromAnyMirror(path, perMirrorMs){
  var mirrors = API_MIRRORS.slice();
  for (var i = mirrors.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = mirrors[i]; mirrors[i] = mirrors[j]; mirrors[j] = tmp;
  }
  for (var k = 0; k < mirrors.length; k++) {
    try {
      var resp = await fetchWithTimeout(mirrors[k] + path, perMirrorMs);
      if (resp && resp.ok) {
        var data = await resp.json();
        if (Array.isArray(data)) return data;
      }
    } catch(e) { /* spróbuj następnego */ }
  }
  return null;
}

/* Wybierz najbardziej znaczący gatunek z listy tagów. */
function pickGenre(tagsStr){
  var tags = (tagsStr || "").toLowerCase().split(",").map(trim).filter(Boolean);
  for (var i = 0; i < GENRE_PRIORITY.length; i++) {
    if (tags.indexOf(GENRE_PRIORITY[i]) >= 0) return capWords(GENRE_PRIORITY[i]);
  }
  return tags[0] ? capWords(tags[0]) : "Inne";
}

/* Surowy rekord Radio Browser -> nasz obiekt stacji (albo null). */
/* — odsiew stacji o spamerskich nazwach (keyword stuffing) — */
function isJunkName(name){
  if (!name) return true;
  if (name.length > 70) return true;                       /* hurtownie słów kluczowych */
  if (/^[#–—=|*•~>]/.test(name)) return true;              /* zaczyna się od śmieciowego znaku */
  if (/^[-\s]{2,}/.test(name)) return true;                /* "-- Radio", "- - Radio" */
  if (name.indexOf(" @ ") !== -1) return true;             /* "Nazwa @ lista, tagów, spam" */
  var commas = (name.match(/,/g) || []).length;
  if (commas >= 4) return true;                            /* 4+ przecinków = lista tagów */
  var dashes = (name.match(/\s[–—-]\s|–|—/g) || []).length;
  if (dashes >= 3) return true;                            /* "A – B – C – D – E" */
  return false;
}

function normalizeStation(s){
  if (!s || !s.url_resolved || !/^https:\/\//i.test(s.url_resolved)) return null;
  if (!s.name || !trim(s.name)) return null;
  var rawName = trim(s.name);
  if (isJunkName(rawName)) return null;
  /* ID liczone z surowej nazwy (jak dotychczas) — ulubione przetrwają */
  var name = rawName.replace(/\s{2,}/g, " ");
  var tagsLower = lower(s.tags || "");
  var genre = pickGenre(s.tags);
  var cc = trim(s.countrycode || "").toUpperCase() || "??";
  var haystack = lower(name) + " " + tagsLower + " " + lower(genre);
  return {
    id: makeId(s.url_resolved, rawName),
    url: s.url_resolved,
    name: name,
    genre: genre,
    country: cc,
    bitrate: s.bitrate || 0,
    featured: FEATURED_RE.test(name),
    club: CLUB_RE.test(haystack)
  };
}

async function loadAllStations(){
  /* Wszystkie zapytania równolegle:
     1. Top PL wg głosów (jak dotychczas — nic nie znika),
     2. polskie tagi klubowe,
     3. zapytania po nazwie (Energy 2000, RadioParty…),
     4. światowy top wg głosów,
     5. światowe tagi rave / hardstyle / techno / dnb… */
  var paths = [
    "/json/stations/search?countrycode=PL&lastcheckok=1&hidebroken=true&order=votes&reverse=true&limit=500"
  ];
  PL_TAG_QUERIES.forEach(function(t){
    paths.push("/json/stations/search?countrycode=PL&tag=" + encodeURIComponent(t) +
               "&hidebroken=true&order=votes&reverse=true&limit=80");
  });
  EXTRA_NAME_QUERIES.forEach(function(n){
    paths.push("/json/stations/search?name=" + encodeURIComponent(n) +
               "&hidebroken=true&order=votes&reverse=true&limit=20");
  });
  paths.push("/json/stations/search?lastcheckok=1&hidebroken=true&order=votes&reverse=true&limit=300");
  WORLD_TAG_QUERIES.forEach(function(t){
    paths.push("/json/stations/search?tag=" + encodeURIComponent(t) +
               "&lastcheckok=1&hidebroken=true&order=votes&reverse=true&limit=60");
  });

  var results;
  try {
    results = await Promise.all(paths.map(function(p){ return fetchFromAnyMirror(p, 9000); }));
  } catch(e) { results = []; }

  /* Główna lista PL musi się udać — inaczej traktuj API jako niedostępne. */
  if (!results.length || !results[0] || !results[0].length) return [];

  var seenId = {}, seenUrl = {}, all = [];
  results.forEach(function(batch){
    if (!Array.isArray(batch)) return;
    batch.forEach(function(raw){
      var st = normalizeStation(raw);
      if (!st) return;
      var uKey = normUrl(st.url);
      if (seenId[st.id] || seenUrl[uKey]) {
        var existing = seenUrl[uKey] || seenId[st.id];
        if (existing && typeof existing === "object") {
          if (st.featured) existing.featured = true;
          if (st.club)     existing.club = true;
        }
        return;
      }
      seenId[st.id] = st;
      seenUrl[uKey] = st;
      all.push(st);
    });
  });

  all.sort(function(a,b){ var an=lower(a.name), bn=lower(b.name); return an<bn?-1:an>bn?1:0; });
  return all;
}

/* — cache listy stacji w localStorage — */
function readStationCache(){
  try {
    var raw = localStorage.getItem(STATION_CACHE_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.stations) || !obj.stations.length) return null;
    return obj; // { ts, stations }
  } catch(e){ return null; }
}
function writeStationCache(stations){
  try {
    localStorage.setItem(STATION_CACHE_KEY, JSON.stringify({ ts: Date.now(), stations: stations }));
  } catch(e){ /* limit storage — trudno, działa bez cache */ }
}

/* ══════════════════════════════════════════════════════════
   KONFIGURACJA (localStorage)
══════════════════════════════════════════════════════════ */
var STORAGE_KEY = "radioantomatee-config";
function loadConfig(){
  try {
    var raw = localStorage.getItem(STORAGE_KEY); if(!raw) return;
    var cfg = JSON.parse(raw);
    if(cfg.volume   != null) state.volume = clamp(cfg.volume,0,100);
    if(cfg.activeId)         state.activeId = "" + cfg.activeId;
    if(cfg.favorites)        state.favorites = cfg.favorites;
    if(cfg.sort)             state.filters.sort = "" + cfg.sort;
    if(cfg.brokenStations)   state.brokenStations = cfg.brokenStations;
  } catch(e){}
  pruneBrokenStations();
}
var _saveT = null;
function debouncedSave(){ clearTimeout(_saveT); _saveT = setTimeout(saveConfig, 600); }
function saveConfig(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 5,
      volume: state.volume,
      activeId: state.activeId,
      favorites: state.favorites,
      sort: state.filters.sort,
      brokenStations: state.brokenStations
    }));
  } catch(e){}
}

/* ══════════════════════════════════════════════════════════
   ZEPSUTE STACJE — auto-ukrywanie
══════════════════════════════════════════════════════════ */
function pruneBrokenStations(){
  var now = Date.now(), changed = false;
  for (var id in state.brokenStations){
    if (!state.brokenStations.hasOwnProperty(id)) continue;
    var ts = +state.brokenStations[id] || 0;
    if (now - ts > BROKEN_EXPIRY_MS) {
      delete state.brokenStations[id];
      changed = true;
    }
  }
  if (changed) saveConfig();
}

function isBroken(id){
  if (!id || !state.brokenStations[id]) return false;
  var ts = +state.brokenStations[id] || 0;
  if (Date.now() - ts > BROKEN_EXPIRY_MS) {
    delete state.brokenStations[id];
    return false;
  }
  return true;
}

function markStationBroken(id){
  if (!id) return;
  state.brokenStations[id] = Date.now();
  saveConfig();
}

function cancelPendingBroken(){
  if (state.pendingBrokenTimer) {
    clearTimeout(state.pendingBrokenTimer);
    state.pendingBrokenTimer = null;
  }
  state.pendingBrokenId = null;
}

/* Zaplanuj oznaczenie stacji jako zepsutej, chyba że "wyzdrowieje"
   w okresie karencji. */
function schedulePendingBroken(stationId){
  if (!stationId) return;
  cancelPendingBroken();
  state.pendingBrokenId = stationId;
  state.pendingBrokenTimer = setTimeout(function(){
    if (state.pendingBrokenId === stationId &&
        state.activeId === stationId &&
        audioState !== 3) {
      markStationBroken(stationId);
      updateBrokenBadge();
      renderList();
    }
    state.pendingBrokenTimer = null;
    state.pendingBrokenId = null;
  }, BROKEN_GRACE_MS);
}

function brokenCount(){
  pruneBrokenStations();
  var n = 0;
  for (var k in state.brokenStations) {
    if (state.brokenStations.hasOwnProperty(k)) n++;
  }
  return n;
}

function clearBrokenStations(){
  state.brokenStations = {};
  saveConfig();
  renderList();
  updateBrokenBadge();
  setStatus("ok", "Lista zablokowanych wyczyszczona");
}

function updateBrokenBadge(){
  var n = brokenCount();
  var el = $("brokenBadge");
  if (!el) return;
  if (n > 0) {
    el.style.display = "inline-flex";
    el.textContent = n + " zablokowana" + (n === 1 ? "" : (n < 5 ? "e" : "ych"));
  } else {
    el.style.display = "none";
  }
}

/* ══════════════════════════════════════════════════════════
   GŁOŚNOŚĆ
══════════════════════════════════════════════════════════ */
var VOL_ICON_ON  = '<path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
var VOL_ICON_OFF = '<path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';

function setVolume(v){
  v = clamp(v,0,100);
  if (v > 0) state.lastVolume = v;
  state.volume = v;
  var sl=$("volSlider"); if(sl){ sl.value = v; sl.style.setProperty("--vol", v + "%"); }
  var lbl=$("volLabel"); if(lbl) lbl.textContent = v + "%";
  var ic=$("volIcon"); if(ic) ic.innerHTML = (v === 0) ? VOL_ICON_OFF : VOL_ICON_ON;
  applyVolume();
  debouncedSave();
}

function toggleMute(){
  if (state.volume > 0) setVolume(0);
  else setVolume(state.lastVolume || 65);
}

/* ══════════════════════════════════════════════════════════
   STATUS
══════════════════════════════════════════════════════════ */
function setStatus(kind, text){
  var cls = "liveDot" + (kind ? " " + kind : "");
  $("statusDot").className = cls;
  $("statusText").textContent = text || "—";
  updateArtStatus(kind);
}

function updateArtStatus(kind){
  var artStatus = $("npArtStatus");
  if (!artStatus) return;
  if (!state.activeId) { artStatus.textContent = "Offline"; return; }
  if (kind === "ok")        artStatus.textContent = "Na żywo";
  else if (kind === "warn") artStatus.textContent = "Łączenie…";
  else if (kind === "bad")  artStatus.textContent = "Błąd";
  else artStatus.textContent = "Zatrzymane";
}

/* ══════════════════════════════════════════════════════════
   PRZYCISK PLAY
══════════════════════════════════════════════════════════ */
var ICON_PLAY  = '<path d="M7 5l12 7-12 7V5z"/>';
var ICON_PAUSE = '<rect x="6" y="5" width="4.5" height="14" rx="1"/><rect x="13.5" y="5" width="4.5" height="14" rx="1"/>';

function updatePlayButton(ps){
  var playing = (ps===3||ps===6||ps===9||ps===11);

  var btn = $("btnPlay");
  var icon = $("btnPlayIcon");
  btn.classList.toggle("playing", playing);
  icon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  btn.title = playing ? "Pauza (spacja)" : "Graj (spacja)";

  var mbp = $("mpPlay"); var mbi = $("mpPlayIcon");
  if (mbp) {
    mbp.classList.toggle("playing", playing);
    if(mbi) mbi.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  }

  var npEq  = $("npEq"); if(npEq)  npEq.classList.toggle("paused", !playing);
  var mpArt = $("mpArt"); if(mpArt) mpArt.classList.toggle("paused", !playing);

  /* equalizer aktywnego wiersza — przełączany w miejscu, bez re-renderu */
  var rowEq = document.querySelector("#stationList .miniEq");
  if (rowEq) rowEq.classList.toggle("paused", !playing);

  if (globe) globe.setPlaying(playing);

  if ("mediaSession" in navigator) {
    try { navigator.mediaSession.playbackState = playing ? "playing" : "paused"; } catch(e){}
  }
}

/* ══════════════════════════════════════════════════════════
   MEDIA SESSION (ekran blokady / słuchawki)
══════════════════════════════════════════════════════════ */
function updateMediaSession(st){
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: st ? st.name : "Radio Antomatee",
      artist: st ? (st.genre + " · " + countryName(st.country)) : "",
      album: "Radio Antomatee",
      artwork: [
        { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    });
  } catch(e){}
}

function initMediaSession(){
  if (!("mediaSession" in navigator)) return;
  var ms = navigator.mediaSession;
  var safeSet = function(action, fn){ try { ms.setActionHandler(action, fn); } catch(e){} };
  safeSet("play", function(){
    if (!(audioState===3||audioState===6||audioState===11)) togglePlayPause();
  });
  safeSet("pause", function(){
    if (audioState===3||audioState===6||audioState===11) {
      _stopping = false;
      getPlayer().pause();
    }
  });
  safeSet("stop", stopPlayback);
  safeSet("previoustrack", function(){ nextPrev(-1); });
  safeSet("nexttrack",     function(){ nextPrev(1);  });
}

/* ══════════════════════════════════════════════════════════
   TERAZ GRA + GLOBUS
══════════════════════════════════════════════════════════ */
function setNowPlaying(st){
  if(!st){
    $("npStation").innerHTML = '<span class="idle">Wybierz stację</span>';
    $("npMeta").textContent = "—";
    $("mpName").textContent = "Wybierz stację";
    $("mpMeta").textContent = "—";
    updateMediaSession(null);
    if (globe) globe.setActive(null);
    return;
  }
  var cn = countryName(st.country);
  var meta = cn + " · " + st.genre +
             (st.bitrate ? " · " + st.bitrate + " kbps" : "");
  $("npStation").textContent = st.name;
  $("npMeta").textContent = meta;
  $("mpName").textContent = st.name;
  $("mpMeta").textContent = meta;
  updateMediaSession(st);
  if (globe) globe.setActive(st.country, cn);
}

function updateStats(){
  var el = $("npStats");
  if (!el) return;
  var ccs = {}, club = 0;
  state.stations.forEach(function(s){ ccs[s.country] = 1; if (s.club) club++; });
  var nCountries = Object.keys(ccs).length;
  el.innerHTML =
    '<span class="statChip"><b>' + nfmt(state.stations.length) + '</b> stacji</span>' +
    '<span class="statChip"><b>' + nfmt(nCountries) + '</b> krajów</span>' +
    '<span class="statChip"><b>' + nfmt(club) + '</b> klubowych</span>';
}

function updateGlobeCountries(){
  if (!globe) return;
  var counts = {};
  state.stations.forEach(function(s){
    if (s.country === "??") return;
    counts[s.country] = (counts[s.country] || 0) + 1;
  });
  globe.setCountries(counts);
}

/* ══════════════════════════════════════════════════════════
   WYSZUKIWANIE STACJI
══════════════════════════════════════════════════════════ */
function getStationById(id){
  for (var i=0;i<state.stations.length;i++)
    if (state.stations[i].id === id) return state.stations[i];
  return null;
}
function getSelectedStation(){ return state.view[state.selectedIndex] || null; }
function getActiveStation(){ return state.activeId ? getStationById(state.activeId) : null; }

/* ══════════════════════════════════════════════════════════
   FILTRY
══════════════════════════════════════════════════════════ */
function renderFilterOptions(){
  /* kraj — wartości to kody ISO, etykiety: flaga + polska nazwa */
  var ccMap = {}, gc = [];
  state.stations.forEach(function(s){ ccMap[s.country] = 1; gc.push(s.genre); });

  var ccList = Object.keys(ccMap).map(function(cc){
    return { cc: cc, label: countryName(cc) };
  });
  ccList.sort(function(a,b){
    /* Polska zawsze pierwsza, potem alfabetycznie po polsku */
    if (a.cc === "PL") return -1;
    if (b.cc === "PL") return 1;
    return a.label.localeCompare(b.label, "pl");
  });

  var selC = $("filterCountry");
  selC.length = 0;
  selC.options[0] = new Option("Kraj: wszystkie", "");
  ccList.forEach(function(o){ selC.options[selC.length] = new Option(o.label, o.cc); });
  selC.value = state.filters.country || "";

  var selG = $("filterGenre");
  var genres = uniqSort(gc);
  selG.length = 0;
  selG.options[0] = new Option("Gatunek: wszystkie", "");
  genres.forEach(function(v){ selG.options[selG.length] = new Option(v, v); });
  selG.value = state.filters.genre || "";

  $("sortMode").value = state.filters.sort;
}

function sortView(list){
  var mode = state.filters.sort;
  var clubFirst = state.filters.onlyClub;
  function byName(a,b){ var an=lower(a.name), bn=lower(b.name); return an<bn?-1:an>bn?1:0; }
  list.sort(function(a,b){
    if (clubFirst && a.featured !== b.featured) return a.featured ? -1 : 1;
    if (mode==="fav") { var fa=!!state.favorites[a.id], fb=!!state.favorites[b.id]; if (fa!==fb) return fa?-1:1; }
    if (mode==="hit" && a.featured !== b.featured) return a.featured ? -1 : 1;
    if (mode==="bitrate"     && a.bitrate !== b.bitrate) return (b.bitrate||0) - (a.bitrate||0);
    if (mode==="bitrate-asc" && a.bitrate !== b.bitrate) return (a.bitrate||0) - (b.bitrate||0);
    if (mode==="genre") { var ag=lower(a.genre), bg=lower(b.genre); if (ag!==bg) return ag<bg?-1:1; }
    if (mode==="country" || mode==="country-desc") {
      var an2 = countryName(a.country), bn2 = countryName(b.country);
      if (an2 !== bn2) { var c = an2.localeCompare(bn2, "pl"); return mode==="country-desc" ? -c : c; }
    }
    if (mode==="name-desc") return -byName(a,b);
    return byName(a,b);
  });
}

function applyFilters(){
  var q       = lower(state.filters.q),
      country = state.filters.country,
      genre   = state.filters.genre,
      onlyFav = state.filters.onlyFav,
      onlyClub= state.filters.onlyClub,
      onlyPL  = state.filters.onlyPL,
      out = [];
  state.stations.forEach(function(st){
    if (isBroken(st.id) && st.id !== state.activeId) return;
    if (onlyFav && !state.favorites[st.id]) return;
    if (onlyClub && !st.club)               return;
    if (onlyPL && st.country !== "PL")      return;
    if (country && st.country !== country)  return;
    if (genre && st.genre !== genre)        return;
    if (q) {
      var h = lower(st.name + " " + st.genre + " " + st.country + " " + countryName(st.country));
      if (h.indexOf(q) < 0) return;
    }
    out.push(st);
  });
  sortView(out);
  state.view = out;
  state.selectedIndex = clamp(state.selectedIndex, 0, Math.max(0, out.length - 1));
}

/* ══════════════════════════════════════════════════════════
   RENDEROWANIE LISTY (porcjowane — płynne nawet przy 2000+ stacji)
══════════════════════════════════════════════════════════ */
var rowEls = [];
var _renderToken = 0;

function rowClass(idx, st){
  var c = "row";
  if (idx === state.selectedIndex) c += " rowSelected";
  if (st.id === state.activeId)    c += " rowActive";
  return c;
}
function updateRowClasses(){
  for (var i=0;i<rowEls.length;i++)
    if (rowEls[i]) rowEls[i].className = rowClass(i, state.view[i]);
}
function rebindRowEls(){
  var list = $("stationList");
  rowEls = [];
  list.querySelectorAll("[data-index]").forEach(function(n){
    var idx = parseInt(n.getAttribute("data-index"), 10);
    if (!isNaN(idx)) rowEls[idx] = n;
  });
}

function buildRowHtml(st, i){
  var fav    = !!state.favorites[st.id];
  var active = (st.id === state.activeId);
  return '<div class="' + rowClass(i, st) + '" data-row="1" data-index="' + i + '">' +
    '<span class="rowStar' + (fav ? ' starFav' : '') + '" data-action="fav" title="Ulubione">' + (fav ? '★' : '☆') + '</span>' +
    '<div class="rowInfo">' +
      '<div class="stationName">' +
        '<span class="snText">' + safeText(st.name) + '</span>' +
        (st.featured ? '<span class="hitBadge">HIT</span>' : '') +
      '</div>' +
      '<div class="stationSub">' +
        safeText(st.genre) +
        '<span class="dot-sep">·</span>' +
        safeText(countryName(st.country)) +
      '</div>' +
    '</div>' +
    '<div class="rowMeta">' +
      (st.bitrate ? '<span class="rowKbps">' + st.bitrate + 'k</span>' : '') +
      (active ? '<div class="miniEq' + ((audioState===3||audioState===6||audioState===11)?'':' paused') + '"><span></span><span></span><span></span></div>' : '') +
    '</div>' +
  '</div>';
}

function renderList(){
  applyFilters();
  var list = $("stationList"), prev = 0;
  try { prev = list.scrollTop; } catch(e){}
  $("countInfo").textContent = nfmt(state.view.length) + " / " + nfmt(state.stations.length);
  $("listHint").textContent  = isMobile() ? "klik = uruchom" : "dwuklik = uruchom";

  var token = ++_renderToken;
  rowEls = [];

  if (!state.view.length) {
    list.innerHTML =
      '<div class="emptyState">' +
        '<div class="emptyIcon">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        '</div>' +
        'Brak stacji pasujących do filtrów' +
      '</div>';
    updateBrokenBadge();
    return;
  }

  var html = [];
  state.view.forEach(function(st, i){ html.push(buildRowHtml(st, i)); });

  var CHUNK = 400;
  if (html.length <= CHUNK) {
    list.innerHTML = html.join("");
    list.scrollTop = prev;
    rebindRowEls();
    updateBrokenBadge();
    return;
  }

  /* pierwsza porcja natychmiast, reszta w kolejnych klatkach */
  list.innerHTML = html.slice(0, CHUNK).join("");
  list.scrollTop = prev;
  rebindRowEls();
  var i = CHUNK;
  (function step(){
    if (token !== _renderToken) return; /* nowy render unieważnia ten */
    if (i >= html.length) { rebindRowEls(); updateBrokenBadge(); return; }
    list.insertAdjacentHTML("beforeend", html.slice(i, i + CHUNK).join(""));
    i += CHUNK;
    rebindRowEls();
    requestAnimationFrame(step);
  })();
  updateBrokenBadge();
}

/* ══════════════════════════════════════════════════════════
   ZAZNACZENIE
══════════════════════════════════════════════════════════ */
function selectIndex(idx, reveal){
  if (!state.view.length) { state.selectedIndex = 0; return; }
  state.selectedIndex = clamp(idx, 0, state.view.length - 1);
  updateRowClasses();
  if (reveal) {
    var r = rowEls[state.selectedIndex];
    if (r && r.scrollIntoView) r.scrollIntoView({ block: "nearest" });
  }
}

/* ══════════════════════════════════════════════════════════
   TIMER POŁĄCZENIA
══════════════════════════════════════════════════════════ */
function stopConnectTimer(){ clearTimeout(state.connectTimer); state.connectTimer = null; }
function armConnectTimer(){
  stopConnectTimer();
  state.connectToken++;
  var tok = state.connectToken;
  state.connectTimer = setTimeout(function(){
    if (tok !== state.connectToken) return;
    if (audioState !== 3) {
      audioState = 1;
      setStatus("bad", "Nie udało się połączyć");
      updatePlayButton(1);
      if (state.activeId) schedulePendingBroken(state.activeId);
    }
  }, 15000);
}

/* ══════════════════════════════════════════════════════════
   ODTWARZANIE
══════════════════════════════════════════════════════════ */
function playUrl(url){
  try {
    var a = getPlayer(); _stopping = false; destroyHls();
    var isHls = /\.m3u8/i.test(url);

    if (isHls) {
      if (typeof Hls !== "undefined" && Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: false });
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(a);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function(){
          if (_stopping) return; applyVolume();
          var p = a.play();
          if (p && p.catch) p.catch(function(){ if (!_stopping) onPlayerError(); });
        });
        hlsInstance.on(Hls.Events.ERROR, function(ev, d){
          if (d.fatal && !_stopping) onPlayerError();
        });
        return true;
      } else if (a.canPlayType("application/vnd.apple.mpegurl")) {
        a.src = url; applyVolume();
        var p2 = a.play();
        if (p2 && p2.catch) p2.catch(function(){ if (!_stopping) onPlayerError(); });
        return true;
      } else {
        setStatus("bad", "HLS nieobsługiwany");
        return false;
      }
    }

    a.src = url; applyVolume();
    var p3 = a.play();
    if (p3 && p3.catch) p3.catch(function(){ if (!_stopping) onPlayerError(); });
    return true;
  } catch(e){ return false; }
}

function playStation(st){
  if (!st) return;

  /* Ponowne uruchomienie już grającej stacji — nic nie rób. */
  if (st.id === state.activeId &&
      (audioState === 3 || audioState === 6 || audioState === 11)) {
    return;
  }

  cancelPendingBroken();

  state.activeId = st.id;
  saveConfig();
  setNowPlaying(st);
  setStatus("warn", "Łączenie…");
  audioState = 6;
  updatePlayButton(6);

  if (!playUrl(st.url)) {
    setStatus("bad", "Nie udało się uruchomić");
    return;
  }
  armConnectTimer();
  renderList();
}

function playSelected(){ var st = getSelectedStation(); if (st) playStation(st); }

/* Wznowienie = ponowne połączenie ze streamem na żywo
   (HLS po pauzie wymaga przebudowy, a radio nie powinno grać
   z opóźnionego bufora). */
function resumeActiveStation(){
  var st = getActiveStation();
  if (!st) { playSelected(); return; }
  _stopping = false;
  cancelPendingBroken();
  setStatus("warn", "Łączenie…");
  audioState = 6;
  updatePlayButton(6);
  if (!playUrl(st.url)) {
    setStatus("bad", "Nie udało się uruchomić");
    return;
  }
  armConnectTimer();
}

function togglePlayPause(){
  if (!state.activeId) { playSelected(); return; }
  var a = getPlayer();

  if (audioState===3 || audioState===6 || audioState===9 || audioState===11) {
    _stopping = false; a.pause(); return;
  }

  resumeActiveStation();
}

function stopPlayback(){
  stopConnectTimer();
  cancelPendingBroken();
  _stopping = true;
  destroyHls();
  try {
    var a = getPlayer();
    a.pause(); a.removeAttribute("src"); a.load();
  } catch(e){}
  audioState = 1; _stopping = false;
  setStatus("", "Zatrzymane");
  updatePlayButton(1);
}

function nextPrev(dir){
  if (!state.view.length) return;
  var idx = state.selectedIndex + dir;
  if (idx < 0) idx = state.view.length - 1;
  if (idx >= state.view.length) idx = 0;
  state.selectedIndex = idx;
  updateRowClasses();
  var r = rowEls[state.selectedIndex];
  if (r && r.scrollIntoView) r.scrollIntoView({ block: "nearest" });
  playSelected();
}

function toggleFavorite(id){
  if (!id) return;
  if (state.favorites[id]) delete state.favorites[id];
  else state.favorites[id] = 1;
  saveConfig();
  renderList();
}

function clearFilters(){
  state.filters.q = state.filters.country = state.filters.genre = "";
  state.filters.onlyFav = false;
  state.filters.onlyClub = false;
  state.filters.onlyPL = false;
  $("search").value = "";
  $("filterCountry").value = "";
  $("filterGenre").value = "";
  $("onlyFav").checked = false;
  $("onlyFavChip").classList.remove("active");
  $("onlyClub").checked = false;
  $("onlyClubChip").classList.remove("active");
  $("onlyPL").checked = false;
  $("onlyPLChip").classList.remove("active");
  state.selectedIndex = 0;
  renderList();
}

/* ══════════════════════════════════════════════════════════
   ZDARZENIA ODTWARZACZA
══════════════════════════════════════════════════════════ */
function onPlayStateChange(ns){
  stopConnectTimer();
  if (ns === 3) {
    setStatus("ok", "Na żywo");
    cancelPendingBroken();
  }
  else if (ns === 2)  setStatus("warn", "Wstrzymano");
  else if (ns === 6 || ns === 11) { setStatus("warn", "Buforowanie…"); armConnectTimer(); }
  else if (ns === 1)  setStatus("", "Zatrzymane");
  updatePlayButton(ns);
}
function onPlayerError(){
  stopConnectTimer();

  /* MEDIA_ERR_ABORTED (1) — sami to spowodowaliśmy. Ignoruj. */
  var errCode = 0;
  try { errCode = (audioEl && audioEl.error) ? audioEl.error.code : 0; } catch(e){}
  if (errCode === 1) return;

  audioState = 1;
  setStatus("bad", "Błąd · Stream niedostępny");
  updatePlayButton(1);
  if (state.activeId) schedulePendingBroken(state.activeId);
}

/* ══════════════════════════════════════════════════════════
   KLIKNIĘCIA W WIERSZE
══════════════════════════════════════════════════════════ */
function resolveRow(target){
  var list = $("stationList"), el = target;
  while (el && el !== list) {
    if (el.getAttribute && el.getAttribute("data-row") === "1") return el;
    el = el.parentNode;
  }
  return null;
}

/* ══════════════════════════════════════════════════════════
   ODŚWIEŻANIE LISTY STACJI
══════════════════════════════════════════════════════════ */
/* Kuratorowane stacje jako pełne obiekty (ID, flagi) — liczone raz. */
var _curatedCache = null;
function getCuratedStations(){
  if (_curatedCache) return _curatedCache;
  _curatedCache = CURATED.map(function(c){
    var haystack = lower(c.name + " " + c.genre);
    return {
      id: makeId(c.url, c.name),
      url: c.url,
      name: c.name,
      genre: c.genre || "Inne",
      country: c.country || "US",
      bitrate: c.bitrate || 128,
      featured: (c.featured != null) ? !!c.featured : FEATURED_RE.test(c.name),
      club: (c.club != null) ? !!c.club : CLUB_RE.test(haystack),
      curated: true
    };
  });
  return _curatedCache;
}

/* Dołącz kuratorowane stacje (bez duplikatów po URL). */
function mergeCurated(list){
  list = list || [];
  var seen = {};
  list.forEach(function(s){ if (s && s.url) seen[normUrl(s.url)] = 1; });
  var extra = [];
  getCuratedStations().forEach(function(s){
    var k = normUrl(s.url);
    if (!seen[k]) { seen[k] = 1; extra.push(s); }
  });
  return extra.concat(list);
}

function adoptStations(stations){
  /* odsiej śmieciowe nazwy także z cache (starsze wersje listy) */
  stations = (stations || []).filter(function(s){ return s && s.name && !isJunkName(s.name); });
  /* zawsze dołóż pewne, kuratorowane stacje */
  stations = mergeCurated(stations);
  state.stations = stations;
  renderFilterOptions();

  if (state.activeId) {
    var st = getStationById(state.activeId);
    setNowPlaying(st || null);
    if (st) {
      applyFilters();
      for (var i = 0; i < state.view.length; i++) {
        if (state.view[i] && state.view[i].id === state.activeId) { state.selectedIndex = i; break; }
      }
    }
  } else {
    setNowPlaying(null);
  }

  renderList();
  updateBrokenBadge();
  updateGlobeCountries();
  updateStats();
}

function summarizeStatus(prefix){
  var blocked = brokenCount();
  var clubCount = 0, ccs = {};
  state.stations.forEach(function(s){ if (s.club) clubCount++; ccs[s.country] = 1; });
  var msg = nfmt(state.stations.length) + " stacji · " + nfmt(Object.keys(ccs).length) + " krajów";
  if (clubCount > 0) msg += " · " + nfmt(clubCount) + " klubowych";
  if (blocked > 0)   msg += " · " + blocked + " ukryte";
  if (prefix) msg = prefix + " · " + msg;
  setStatus("", msg);
}

async function refreshStations(showProgress){
  if (state.refreshing) return;
  state.refreshing = true;
  if (showProgress) setStatus("warn", "Pobieranie świeżej listy stacji…");
  try {
    var fresh = await loadAllStations();
    if (fresh.length) {
      writeStationCache(fresh);
      adoptStations(fresh);
      summarizeStatus(showProgress ? "Lista odświeżona" : "");
    } else if (showProgress) {
      setStatus("bad", "Nie udało się odświeżyć — API nie odpowiada");
    }
  } finally {
    state.refreshing = false;
  }
}

/* ══════════════════════════════════════════════════════════
   PODPIĘCIA UI
══════════════════════════════════════════════════════════ */
function bindUi(){
  var _st = null;
  bind($("search"), "input", function(){
    clearTimeout(_st);
    _st = setTimeout(function(){
      state.filters.q = $("search").value || "";
      state.selectedIndex = 0;
      renderList();
    }, 180);
  });
  bind($("filterCountry"), "change", function(){ state.filters.country = $("filterCountry").value || ""; state.selectedIndex=0; renderList(); });
  bind($("filterGenre"),   "change", function(){ state.filters.genre   = $("filterGenre").value   || ""; state.selectedIndex=0; renderList(); });
  bind($("sortMode"),      "change", function(){ state.filters.sort    = $("sortMode").value      || "name"; saveConfig(); renderList(); });

  function chipToggle(boxId, chipId, prop){
    bind($(boxId), "change", function(){
      state.filters[prop] = $(boxId).checked;
      $(chipId).classList.toggle("active", state.filters[prop]);
      state.selectedIndex = 0;
      renderList();
    });
  }
  chipToggle("onlyFav",  "onlyFavChip",  "onlyFav");
  chipToggle("onlyClub", "onlyClubChip", "onlyClub");
  chipToggle("onlyPL",   "onlyPLChip",   "onlyPL");

  bind($("btnClear"),   "click", clearFilters);
  bind($("btnPlay"),    "click", togglePlayPause);
  bind($("btnStop"),    "click", stopPlayback);
  bind($("btnPrev"),    "click", function(){ nextPrev(-1); });
  bind($("btnNext"),    "click", function(){ nextPrev(1);  });
  bind($("btnRefresh"), "click", function(){ refreshStations(true); });
  bind($("btnUnblock"), "click", function(){
    var n = brokenCount();
    if (n === 0) { setStatus("ok", "Brak zablokowanych stacji"); return; }
    clearBrokenStations();
  });
  bind($("btnResetStorage"), "click", function(){
    if (!window.confirm("Zresetować wszystkie ustawienia (ulubione, głośność, ostatnią stację, listę zablokowanych)?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
    state.favorites = {};
    state.brokenStations = {};
    setVolume(65);
    renderList();
    updateBrokenBadge();
    setStatus("ok", "Ustawienia zresetowane");
  });

  bind($("volSlider"), "input", function(){ setVolume(+$("volSlider").value); });
  bind($("volIcon"),   "click", toggleMute);

  bind($("mpPlay"), "click", togglePlayPause);
  bind($("mpPrev"), "click", function(){ nextPrev(-1); });
  bind($("mpNext"), "click", function(){ nextPrev(1);  });

  bind($("stationList"), "click", function(e){
    var t = e.target, row = resolveRow(t), idx;
    if (!row) return;
    idx = parseInt(row.getAttribute("data-index"), 10);
    if (isNaN(idx) || !state.view[idx]) return;
    if (t && t.getAttribute && t.getAttribute("data-action") === "fav") {
      toggleFavorite(state.view[idx].id);
      return stopEvt(e);
    }
    state.selectedIndex = idx;
    updateRowClasses();
    if (isMobile()) playSelected();
  });
  bind($("stationList"), "dblclick", function(e){
    if (isMobile()) return;
    var t = e.target, row = resolveRow(t), idx;
    if (!row) return;
    idx = parseInt(row.getAttribute("data-index"), 10);
    if (isNaN(idx) || !state.view[idx]) return;
    if (t && t.getAttribute && t.getAttribute("data-action") === "fav") return stopEvt(e);
    state.selectedIndex = idx;
    updateRowClasses();
    playSelected();
    return stopEvt(e);
  });

  bind(document, "keydown", function(e){
    var key = e.keyCode || 0, src = e.target;
    var tag = src && src.tagName ? src.tagName.toLowerCase() : "";
    var typing = (tag === "input" || tag === "textarea" || tag === "select");
    var st;
    if (typing) { if (key === 27) { src.blur(); return stopEvt(e); } return; }
    if (key === 32) { togglePlayPause(); return stopEvt(e); }
    if (key === 13) { playSelected();    return stopEvt(e); }
    if (key === 83) { $("search").focus(); return stopEvt(e); }
    if (key === 38) { selectIndex(state.selectedIndex - 1, true); return stopEvt(e); }
    if (key === 40) { selectIndex(state.selectedIndex + 1, true); return stopEvt(e); }
    if (key === 37) { nextPrev(-1); return stopEvt(e); }
    if (key === 39) { nextPrev(1);  return stopEvt(e); }
    if (key === 77) { toggleMute(); return stopEvt(e); }
    if (key === 70) { st = getSelectedStation(); if (st) toggleFavorite(st.id); }
    if (key === 27) { clearFilters(); return stopEvt(e); }
  });

  var _rt = null;
  window.addEventListener("resize", function(){ clearTimeout(_rt); _rt = setTimeout(renderList, 200); });
}

/* ══════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", async function(){
  loadConfig();
  $("onlyFav").checked = !!state.filters.onlyFav;
  $("onlyFavChip").classList.toggle("active", state.filters.onlyFav);
  $("onlyClub").checked = !!state.filters.onlyClub;
  $("onlyClubChip").classList.toggle("active", state.filters.onlyClub);
  $("onlyPL").checked = !!state.filters.onlyPL;
  $("onlyPLChip").classList.toggle("active", state.filters.onlyPL);

  getPlayer();
  initMediaSession();
  setVolume(state.volume);
  updatePlayButton(1);
  bindUi();

  /* globus */
  try { globe = new RadioGlobe($("globeCanvas")); } catch(e){ globe = null; }

  /* Service Worker — aplikacja działa jako PWA i startuje błyskawicznie */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    try { navigator.serviceWorker.register("sw.js"); } catch(e){}
  }

  /* 1) Najpierw cache — natychmiastowy start */
  var cached = readStationCache();
  if (cached) {
    adoptStations(cached.stations);
    summarizeStatus("");
    var age = Date.now() - (+cached.ts || 0);
    if (age > STATION_CACHE_TTL) {
      /* przeterminowany — odśwież w tle */
      refreshStations(false);
    } else {
      /* świeży — i tak cicho zaktualizuj w tle przy okazji */
      setTimeout(function(){ refreshStations(false); }, 4000);
    }
    return;
  }

  /* 2) Brak cache — pełne ładowanie */
  $("stationList").innerHTML =
    '<div class="loadingState"><span class="loadingPulse"></span>Ładowanie stacji z Radio Browser API…</div>';
  setStatus("warn", "Ładowanie stacji…");

  var stations = await loadAllStations();

  if (!stations.length) {
    /* API nie odpowiada — pokaż przynajmniej pewne, kuratorowane stacje */
    adoptStations([]);
    setStatus("warn", "API niedostępne — pokazuję pewne stacje. Kliknij „Odśwież”, by pobrać więcej.");
    return;
  }

  writeStationCache(stations);
  adoptStations(stations);
  summarizeStatus("");
});

/* ════════════════════════════════════════════════════════════
   MOTYWY (8 do wyboru, zapis w COOKIE) + ZWIJANE FILTRY
   Warstwa dodatkowa — nie dotyka logiki danych/odtwarzacza.
════════════════════════════════════════════════════════════ */
(function () {
  var THEME_COOKIE = "radioantomatee_theme";
  var THEMES = ["green", "amber", "cyan", "synthwave", "crimson", "violet", "cats", "naruto"];

  /* — cookies — */
  function setCookie(name, val, days) {
    var d = new Date(); d.setTime(Date.now() + days * 86400000);
    document.cookie = name + "=" + encodeURIComponent(val) +
      ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function updateMetaColor() {
    var m = document.querySelector('meta[name=theme-color]');
    if (!m) return;
    var bg = "";
    try { bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").replace(/^\s+|\s+$/g, ""); } catch (e) {}
    if (bg) m.setAttribute("content", bg);
  }

  function markSelected(name) {
    var opts = document.querySelectorAll(".themeOpt");
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.toggle("sel", opts[i].getAttribute("data-theme-val") === name);
      opts[i].setAttribute("aria-checked", opts[i].getAttribute("data-theme-val") === name ? "true" : "false");
    }
  }

  function applyTheme(name) {
    if (THEMES.indexOf(name) < 0) name = "green";
    document.documentElement.setAttribute("data-theme", name);
    updateMetaColor();
    markSelected(name);
  }

  /* zastosuj zapisany motyw natychmiast (skrypt `defer` — DOM gotowy).
     Migracja ze starego localStorage („dark" = bursztyn). */
  var saved = getCookie(THEME_COOKIE);
  if (!saved) {
    try {
      var old = localStorage.getItem("radioantomatee-theme");
      if (old === "dark") saved = "amber";
      else if (old) saved = "green";
    } catch (e) {}
    if (saved) setCookie(THEME_COOKIE, saved, 365);
  }
  applyTheme(saved || "green");

  function countActiveFilters() {
    var n = 0, f = state.filters;
    if (f.country) n++;
    if (f.genre) n++;
    if (f.onlyPL) n++;
    if (f.onlyClub) n++;
    if (f.onlyFav) n++;
    return n;
  }
  function updateFilterBadge() {
    var b = $("filterBadge"); if (!b) return;
    var n = countActiveFilters();
    if (n > 0) { b.textContent = n; b.hidden = false; } else { b.hidden = true; }
  }

  window.addEventListener("DOMContentLoaded", function () {
    /* — menu wyboru motywu — */
    var bt = $("btnTheme"), menu = $("themeMenu");
    function openMenu(open) {
      if (!menu) return;
      menu.hidden = !open;
      if (bt) bt.setAttribute("aria-expanded", open ? "true" : "false");
    }
    bind(bt, "click", function (e) { stopEvt(e); openMenu(menu.hidden); });
    bind(menu, "click", function (e) {
      var b = e.target;
      while (b && b !== menu && !(b.getAttribute && b.getAttribute("data-theme-val"))) b = b.parentNode;
      if (b && b.getAttribute && b.getAttribute("data-theme-val")) {
        var t = b.getAttribute("data-theme-val");
        applyTheme(t);
        setCookie(THEME_COOKIE, t, 365);
        openMenu(false);
      }
    });
    bind(document, "click", function (e) {
      if (!menu || menu.hidden) return;
      var n = e.target;
      while (n) { if (n === menu || n === bt) return; n = n.parentNode; }
      openMenu(false);
    });
    bind(document, "keydown", function (e) {
      if ((e.keyCode || 0) === 27 && menu && !menu.hidden) { openMenu(false); if (bt) bt.focus(); }
    });
    markSelected(document.documentElement.getAttribute("data-theme") || "green");

    /* — zwijane filtry — */
    var ft = $("btnFilters"), panel = $("filterPanel");
    bind(ft, "click", function () {
      var open = panel.classList.toggle("open");
      ft.setAttribute("aria-expanded", open ? "true" : "false");
    });

    /* odśwież odznakę liczby aktywnych filtrów przy każdej zmianie */
    bind($("filterCountry"), "change", updateFilterBadge);
    bind($("filterGenre"),   "change", updateFilterBadge);
    bind($("onlyPL"),   "change", updateFilterBadge);
    bind($("onlyClub"), "change", updateFilterBadge);
    bind($("onlyFav"),  "change", updateFilterBadge);
    bind($("btnClear"), "click", function () { setTimeout(updateFilterBadge, 0); });
    updateFilterBadge();
  });
})();
