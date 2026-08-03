/* ════════════════════════════════════════════════════════════
   RADIO ANTOMATEE - app.js
   Logika aplikacji: Radio Browser API, odtwarzacz, filtry,
   ulubione, blokowanie zepsutych stacji, cache listy, globus.
════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   MIRRORY API - wszystkie stacje z Radio Browser
══════════════════════════════════════════════════════════ */
var API_MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info"
];

/* Polskie tagi klubowe - uzupełniają główną listę PL. */
var PL_TAG_QUERIES = ["dance", "house", "club", "techno", "trance", "vixa", "edm"];

/* Światowe tagi - rave, klubowe i pochodne (bez ograniczenia kraju). */
var WORLD_TAG_QUERIES = [
  "rave", "hardstyle", "gabber", "hardcore", "hard techno",
  "drum and bass", "dubstep", "psytrance", "techno", "house",
  "trance", "club"
];

/* Zapytania po nazwie - gwarantują konkretne "hity"
   (Energy 2000, RadioParty) niezależnie od rankingu głosów. */
var EXTRA_NAME_QUERIES = ["energy 2000", "energy2000", "radioparty", "radio party"];

/* Stacje pasujące tutaj dostają plakietkę "HIT" i pływają na górę
   widoku "Klubowe". */
var FEATURED_RE = /(energy\s*2000|radio\s*party|radioparty)/i;

/* Co liczy się jako stacja klubowa dla szybkiego filtra "Klubowe". */
var CLUB_RE = /(dance|house|club|techno|trance|vixa|edm|rave|hands\s*up|party|energy\s*2000|hardstyle|gabber|hardcore|drum\s*(?:and|'?n'?|&)\s*bass|\bdnb\b|dubstep|psytrance|jungle|electro)/;

/* Preferowane tagi gatunków (wg priorytetu) - wybiera najbardziej
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
   STACJE KURATOROWANE - pewne, stabilne streamy (zawsze działają)
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

/* Cache listy stacji - aplikacja startuje natychmiast, odświeża w tle. */
var STATION_CACHE_KEY = "radioantomatee-stations-v4";
try { localStorage.removeItem("radioantomatee-stations-v2"); localStorage.removeItem("radioantomatee-stations-v3"); } catch(e){}
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
    /* UWAGA: bez crossOrigin="anonymous" - wymusza CORS i ucina wiele
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
function safeText(s){ return ("" + (s==null?"":s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
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

/* - kraje: nazwy po polsku - */
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
/* - odsiew stacji o spamerskich nazwach (keyword stuffing) - */
function isJunkName(name){
  if (!name) return true;
  if (name.length > 70) return true;                       /* hurtownie słów kluczowych */
  if (/^[#--=|*•~>]/.test(name)) return true;              /* zaczyna się od śmieciowego znaku */
  if (/^[-\s]{2,}/.test(name)) return true;                /* "-- Radio", "- - Radio" */
  if (name.indexOf(" @ ") !== -1) return true;             /* "Nazwa @ lista, tagów, spam" */
  var commas = (name.match(/,/g) || []).length;
  if (commas >= 4) return true;                            /* 4+ przecinków = lista tagów */
  var dashes = (name.match(/\s[---]\s|-|-/g) || []).length;
  if (dashes >= 3) return true;                            /* "A - B - C - D - E" */
  return false;
}

function normalizeStation(s){
  if (!s || !s.url_resolved || !/^https:\/\//i.test(s.url_resolved)) return null;
  if (!s.name || !trim(s.name)) return null;
  var rawName = trim(s.name);
  if (isJunkName(rawName)) return null;
  /* ID liczone z surowej nazwy (jak dotychczas) - ulubione przetrwają */
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
    /* koercja do liczby - bitrate z publicznego API to dane niezaufane,
       a trafia do innerHTML; string mógłby przemycić HTML (XSS) */
    bitrate: (parseInt(s.bitrate, 10) > 0 ? parseInt(s.bitrate, 10) : 0),
    featured: FEATURED_RE.test(name),
    club: CLUB_RE.test(haystack)
  };
}

async function loadAllStations(){
  /* Wszystkie zapytania równolegle:
     1. Top PL wg głosów (jak dotychczas - nic nie znika),
     2. polskie tagi klubowe,
     3. zapytania po nazwie (Energy 2000, RadioParty…),
     4. światowy top wg głosów,
     5. światowe tagi rave / hardstyle / techno / dnb… */
  var paths = [
    "/json/stations/search?countrycode=PL&lastcheckok=1&hidebroken=true&order=votes&reverse=true&limit=1000"
  ];
  PL_TAG_QUERIES.forEach(function(t){
    paths.push("/json/stations/search?countrycode=PL&tag=" + encodeURIComponent(t) +
               "&hidebroken=true&order=votes&reverse=true&limit=80");
  });
  EXTRA_NAME_QUERIES.forEach(function(n){
    paths.push("/json/stations/search?name=" + encodeURIComponent(n) +
               "&hidebroken=true&order=votes&reverse=true&limit=20");
  });
  paths.push("/json/stations/search?lastcheckok=1&hidebroken=true&order=votes&reverse=true&limit=2500");
  WORLD_TAG_QUERIES.forEach(function(t){
    paths.push("/json/stations/search?tag=" + encodeURIComponent(t) +
               "&lastcheckok=1&hidebroken=true&order=votes&reverse=true&limit=60");
  });

  var results;
  try {
    results = await Promise.all(paths.map(function(p){ return fetchFromAnyMirror(p, 9000); }));
  } catch(e) { results = []; }

  /* Główna lista PL musi się udać - inaczej traktuj API jako niedostępne. */
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

/* - cache listy stacji w localStorage - */
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
  } catch(e){ /* limit storage - trudno, działa bez cache */ }
}

/* ══════════════════════════════════════════════════════════
   KONFIGURACJA (localStorage)
══════════════════════════════════════════════════════════ */
var STORAGE_KEY = "radioantomatee-config";
function loadConfig(){
  try {
    var raw = localStorage.getItem(STORAGE_KEY); if(!raw) return;
    var cfg = JSON.parse(raw);
    if (!cfg || typeof cfg !== "object") return;
    if(cfg.volume   != null) state.volume = clamp(+cfg.volume || 0, 0, 100);
    if(cfg.activeId)         state.activeId = "" + cfg.activeId;
    /* walidacja kształtu - uszkodzony/zmanipulowany zapis nie może
       podmienić favorites na tablicę/string i wysypać reszty logiki */
    if(cfg.favorites && typeof cfg.favorites === "object" && !Array.isArray(cfg.favorites))
      state.favorites = cfg.favorites;
    if(typeof cfg.sort === "string") state.filters.sort = cfg.sort;
  } catch(e){}
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
      sort: state.filters.sort
    }));
  } catch(e){}
}

/* Uwaga: dawne auto-blokowanie stacji usunięto w całości - stacje
   pochodzą z Radio Browser API (lastcheckok=1 & hidebroken=true, serwer
   sam weryfikuje że grają) + kuratorowanej listy SomaFM. Gdy stream
   chwilowo nie odpowiada, aplikacja pokazuje tylko status błędu. */

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
  $("statusText").textContent = text || "-";
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
  var playing = (ps===3||ps===6||ps===11);

  var btn = $("btnPlay");
  var icon = $("btnPlayIcon");
  btn.classList.toggle("playing", playing);
  icon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  btn.title = playing ? "Pauza (spacja)" : "Graj (spacja)";
  btn.setAttribute("aria-label", playing ? "Pauza" : "Graj");

  var npEq  = $("npEq"); if(npEq)  npEq.classList.toggle("paused", !playing);
  var mpArt = $("mpArt"); if(mpArt) mpArt.classList.toggle("paused", !playing);

  /* equalizer aktywnego wiersza - przełączany w miejscu, bez re-renderu */
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
    $("npMeta").textContent = "-";
    $("mpName").textContent = "Wybierz stację";
    $("mpMeta").textContent = "-";
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
  /* kraj - lista WSZYSTKICH krajów z Radio Browser (241), gdy dostępna;
     dzięki temu można wybrać dowolny kraj, a jego stacje dociągamy na
     żywo (liveFetchCountry). Przed załadowaniem listy - fallback do
     krajów z aktualnie wczytanych stacji. */
  var gc = [];
  state.stations.forEach(function(s){ gc.push(s.genre); });

  var ccList;
  if (ALL_COUNTRIES && ALL_COUNTRIES.length) {
    ccList = ALL_COUNTRIES.map(function(cc){ return { cc: cc, label: countryName(cc) }; });
  } else {
    var ccMap = {};
    state.stations.forEach(function(s){ if (s.country && s.country !== "??") ccMap[s.country] = 1; });
    ccList = Object.keys(ccMap).map(function(cc){ return { cc: cc, label: countryName(cc) }; });
  }
  ccList.sort(function(a,b){
    if (a.cc === "PL") return -1;
    if (b.cc === "PL") return 1;
    return a.label.localeCompare(b.label, "pl");
  });

  var selC = $("filterCountry");
  selC.length = 0;
  selC.options[0] = new Option("Kraj: wszystkie", "");
  ccList.forEach(function(o){ selC.options[selC.length] = new Option(o.label, o.cc); });
  selC.value = state.filters.country || "";
  if (selC.value !== (state.filters.country || "")) {
    state.filters.country = "";
    selC.value = "";
  }

  var selG = $("filterGenre");
  var genres = uniqSort(gc);
  selG.length = 0;
  selG.options[0] = new Option("Gatunek: wszystkie", "");
  genres.forEach(function(v){ selG.options[selG.length] = new Option(v, v); });
  selG.value = state.filters.genre || "";
  if (selG.value !== (state.filters.genre || "")) {
    state.filters.genre = "";
    selG.value = "";
  }

  $("sortMode").value = state.filters.sort;
  if (window._updateFilterBadge) window._updateFilterBadge();
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
   RENDEROWANIE LISTY (porcjowane - płynne nawet przy 2000+ stacji)
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
    if (rowEls[i]) {
      rowEls[i].className = rowClass(i, state.view[i]);
      rowEls[i].setAttribute("aria-selected", i === state.selectedIndex ? "true" : "false");
    }
  var list = $("stationList");
  if (list) list.setAttribute("aria-activedescendant", "strow-" + state.selectedIndex);
}
function rebindRowEls(){
  var list = $("stationList");
  rowEls = [];
  list.querySelectorAll("[data-index]").forEach(function(n){
    var idx = parseInt(n.getAttribute("data-index"), 10);
    if (!isNaN(idx)) rowEls[idx] = n;
  });
}

/* Punktowa podmiana jednego wiersza (gwiazdka, equalizer aktywnej
   stacji) - bez niszczenia i odtwarzania całej ~500-elementowej siatki */
function patchRow(idx){
  var el = rowEls[idx], st = state.view[idx];
  if (!el || !st) return;
  var tmp = document.createElement("div");
  tmp.innerHTML = buildRowHtml(st, idx);
  var fresh = tmp.firstChild;
  el.parentNode.replaceChild(fresh, el);
  rowEls[idx] = fresh;
}
function indexOfStationId(id){
  if (!id) return -1;
  for (var i = 0; i < state.view.length; i++)
    if (state.view[i].id === id) return i;
  return -1;
}

function stationInitial(name){
  var m = ("" + (name || "")).match(/[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż]/);
  return safeText((m ? m[0] : (name || "•").charAt(0) || "•").toUpperCase());
}

function buildRowHtml(st, i){
  var fav    = !!state.favorites[st.id];
  var active = (st.id === state.activeId);
  var playing = (audioState===3||audioState===6||audioState===11);
  var kbps   = +st.bitrate || 0;   /* defensywnie: zawsze liczba w HTML */
  return '<div class="' + rowClass(i, st) + '" data-row="1" data-index="' + i + '"' +
      ' role="option" id="strow-' + i + '" aria-selected="' + (i === state.selectedIndex ? 'true' : 'false') + '">' +
    '<div class="rowArt">' +
      '<span class="rowArtInitial">' + stationInitial(st.name) + '</span>' +
      (active ? '<div class="rowArtEq miniEq' + (playing ? '' : ' paused') + '"><span></span><span></span><span></span></div>' : '') +
    '</div>' +
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
      (kbps ? '<span class="rowKbps">' + kbps + 'k</span>' : '') +
      '<button type="button" class="rowStar' + (fav ? ' starFav' : '') + '" data-action="fav"' +
        ' aria-pressed="' + (fav ? 'true' : 'false') + '"' +
        ' aria-label="Ulubione: ' + safeText(st.name) + '" title="Ulubione">' + (fav ? '★' : '☆') + '</button>' +
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
    return;
  }

  var html = [];
  state.view.forEach(function(st, i){ html.push(buildRowHtml(st, i)); });

  var CHUNK = 400;
  if (html.length <= CHUNK) {
    list.innerHTML = html.join("");
    list.scrollTop = prev;
    rebindRowEls();
    return;
  }

  /* pierwsza porcja natychmiast, reszta w kolejnych klatkach;
     rebind i finalne przywrócenie scrolla dopiero PO ostatniej porcji
     (rebind per porcja = O(n²), a scroll ustawiony za wcześnie ucinał
     się do wysokości pierwszej porcji) */
  list.innerHTML = html.slice(0, CHUNK).join("");
  list.scrollTop = prev;
  var i = CHUNK;
  (function step(){
    if (token !== _renderToken) return; /* nowy render unieważnia ten */
    if (i >= html.length) {
      rebindRowEls();
      if (prev > list.scrollTop) list.scrollTop = prev;
      return;
    }
    list.insertAdjacentHTML("beforeend", html.slice(i, i + CHUNK).join(""));
    i += CHUNK;
    requestAnimationFrame(step);
  })();
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
      setStatus("bad", navigator.onLine ? "Nie udało się połączyć" : "Brak połączenia z internetem");
      updatePlayButton(1);
    }
  }, 15000);
}

/* ══════════════════════════════════════════════════════════
   ODTWARZANIE
══════════════════════════════════════════════════════════ */
/* Token generacji odtwarzania - każde playUrl/stop go inkrementuje.
   Asynchroniczne odrzucenie play() STAREJ stacji (AbortError przy
   przełączaniu A→B) niesie stary token i jest ignorowane - nie kasuje
   watchdoga ani statusu łączenia NOWEJ stacji. */
var _playToken = 0;

function playUrl(url){
  try {
    var a = getPlayer(); _stopping = false; destroyHls();
    _playToken++;
    var tok = _playToken;
    var stale = function(){ return _stopping || tok !== _playToken; };
    var isHls = /\.m3u8/i.test(url);

    if (isHls) {
      if (typeof Hls !== "undefined" && Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: false });
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(a);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function(){
          if (stale()) return; applyVolume();
          var p = a.play();
          if (p && p.catch) p.catch(function(){ if (!stale()) onPlayerError(); });
        });
        hlsInstance.on(Hls.Events.ERROR, function(ev, d){
          if (d.fatal && !stale()) onPlayerError();
        });
        return true;
      } else if (a.canPlayType("application/vnd.apple.mpegurl")) {
        a.src = url; applyVolume();
        var p2 = a.play();
        if (p2 && p2.catch) p2.catch(function(){ if (!stale()) onPlayerError(); });
        return true;
      } else if (typeof Hls === "undefined") {
        setStatus("bad", "Nie udało się załadować odtwarzacza HLS (brak sieci?)");
        return false;
      } else {
        setStatus("bad", "HLS nieobsługiwany");
        return false;
      }
    }

    a.src = url; applyVolume();
    var p3 = a.play();
    if (p3 && p3.catch) p3.catch(function(){ if (!stale()) onPlayerError(); });
    return true;
  } catch(e){ return false; }
}

function playStation(st){
  if (!st) return;

  /* Ponowne uruchomienie już grającej stacji - nic nie rób. */
  if (st.id === state.activeId &&
      (audioState === 3 || audioState === 6 || audioState === 11)) {
    return;
  }

  if (!navigator.onLine) {
    setStatus("bad", "Brak połączenia z internetem");
    return;
  }

  var prevActive = indexOfStationId(state.activeId);
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
  /* punktowo: stary aktywny wiersz traci equalizer, nowy go dostaje */
  if (prevActive >= 0) patchRow(prevActive);
  patchRow(indexOfStationId(st.id));
}

function playSelected(){ var st = getSelectedStation(); if (st) playStation(st); }

/* Wznowienie = ponowne połączenie ze streamem na żywo
   (HLS po pauzie wymaga przebudowy, a radio nie powinno grać
   z opóźnionego bufora). */
function resumeActiveStation(){
  var st = getActiveStation();
  if (!st) { playSelected(); return; }
  _stopping = false;
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

  if (audioState===3 || audioState===6 || audioState===11) {
    _stopping = false; a.pause(); return;
  }

  resumeActiveStation();
}

function stopPlayback(){
  stopConnectTimer();
  _stopping = true;
  _playToken++;               /* unieważnij wiszące promisy play() */
  destroyHls();
  try {
    var a = getPlayer();
    a.pause(); a.removeAttribute("src"); a.load();
  } catch(e){}
  /* _stopping zostaje true aż do następnego playUrl - asynchroniczne
     odrzucenie przerwanego play() nie pokaże fałszywego "Błąd" po Stop */
  audioState = 1;
  setStatus("", "Zatrzymane");
  updatePlayButton(1);
}

function nextPrev(dir){
  if (!state.view.length) return;
  /* nawiguj względem GRAJĄCEJ stacji (jeśli jest na liście) - z ekranu
     blokady "następna" ma znaczyć następną po tej, która gra, a nie po
     przypadkowym zaznaczeniu sprzed godziny */
  var base = state.selectedIndex;
  if (state.activeId) {
    var ai = indexOfStationId(state.activeId);
    if (ai >= 0) base = ai;
  }
  var idx = base + dir;
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
  /* pełny rerender tylko gdy ulubione wpływają na skład/kolejność listy */
  if (state.filters.onlyFav || state.filters.sort === "fav") { renderList(); return; }
  patchRow(indexOfStationId(id));
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
  if (window._updateFilterBadge) window._updateFilterBadge();
}

/* ══════════════════════════════════════════════════════════
   ZDARZENIA ODTWARZACZA
══════════════════════════════════════════════════════════ */
function onPlayStateChange(ns){
  stopConnectTimer();
  if (ns === 3) setStatus("ok", "Na żywo");
  else if (ns === 2)  setStatus("warn", "Wstrzymano");
  else if (ns === 6 || ns === 11) { setStatus("warn", "Buforowanie…"); armConnectTimer(); }
  else if (ns === 1)  setStatus("", "Zatrzymane");
  updatePlayButton(ns);
}
function onPlayerError(){
  stopConnectTimer();

  /* MEDIA_ERR_ABORTED (1) - sami to spowodowaliśmy. Ignoruj. */
  var errCode = 0;
  try { errCode = (audioEl && audioEl.error) ? audioEl.error.code : 0; } catch(e){}
  if (errCode === 1) return;

  audioState = 1;
  setStatus("bad", navigator.onLine ? "Błąd · Stream niedostępny" : "Brak połączenia z internetem");
  updatePlayButton(1);
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
/* Kuratorowane stacje jako pełne obiekty (ID, flagi) - liczone raz. */
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
  /* walidacja także danych z cache localStorage: śmieciowe nazwy,
     wyłącznie https:// (jak w normalizeStation) i liczbowy bitrate -
     zmanipulowany/staroformatowy cache nie ominie zabezpieczeń */
  stations = (stations || []).filter(function(s){
    return s && s.name && !isJunkName(s.name) && /^https:\/\//i.test(s.url || "");
  });
  stations.forEach(function(s){ s.bitrate = (parseInt(s.bitrate, 10) > 0 ? parseInt(s.bitrate, 10) : 0); });
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
  updateGlobeCountries();
  updateStats();
}

function summarizeStatus(prefix){
  var clubCount = 0, ccs = {};
  state.stations.forEach(function(s){ if (s.club) clubCount++; ccs[s.country] = 1; });
  var msg = nfmt(state.stations.length) + " stacji · " + nfmt(Object.keys(ccs).length) + " krajów";
  if (clubCount > 0) msg += " · " + nfmt(clubCount) + " klubowych";
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
      setStatus("bad", "Nie udało się odświeżyć - API nie odpowiada");
    }
  } finally {
    state.refreshing = false;
  }
}

/* ══════════════════════════════════════════════════════════
   DOCIĄGANIE NA ŻYWO (cała baza ~61k na żądanie)
   Baza startowa to top ~kilka tys. stacji; resztę świata (dowolny
   kraj / dowolna nazwa) pobieramy z Radio Browser dopiero, gdy
   użytkownik jej zaszuka albo wybierze kraj z listy.
══════════════════════════════════════════════════════════ */
var ALL_COUNTRIES = null;                 /* ["US","DE",...] - kraje z >0 stacji */
var COUNTRIES_KEY = "radioantomatee-countries-v1";
var _fetchedCC = {};                       /* kody krajów już dociągnięte */
var _searchedTerms = {};                   /* frazy już wyszukane w sieci */
var _netToken = 0;

/* Dołącz nowe stacje do już wczytanych (bez duplikatów). Zwraca ile dodano. */
function mergeLiveStations(rawArray){
  if (!Array.isArray(rawArray) || !rawArray.length) return 0;
  var idSet = {}, urlSet = {};
  for (var i = 0; i < state.stations.length; i++) {
    idSet[state.stations[i].id] = 1;
    urlSet[normUrl(state.stations[i].url)] = 1;
  }
  var added = 0;
  for (var j = 0; j < rawArray.length; j++) {
    var st = normalizeStation(rawArray[j]);   /* odsiew śmieci/https/bitrate */
    if (!st) continue;
    var uKey = normUrl(st.url);
    if (idSet[st.id] || urlSet[uKey]) continue;
    idSet[st.id] = 1; urlSet[uKey] = 1;
    state.stations.push(st);
    added++;
  }
  if (added) {
    renderFilterOptions();
    renderList();
    updateGlobeCountries();
    updateStats();
  }
  return added;
}

/* Pełna lista krajów (raz, z cache 7 dni) - zasila filtr kraju. */
async function loadCountries(){
  try {
    var raw = localStorage.getItem(COUNTRIES_KEY);
    if (raw) {
      var c = JSON.parse(raw);
      if (c && Array.isArray(c.list) && (Date.now() - (+c.ts || 0) < 7 * 24 * 3600 * 1000)) {
        ALL_COUNTRIES = c.list; renderFilterOptions(); return;
      }
    }
  } catch(e){}
  var data = await fetchFromAnyMirror("/json/countries", 9000);
  if (!Array.isArray(data)) return;
  var list = [];
  data.forEach(function(o){
    var cc = trim(o.iso_3166_1 || "").toUpperCase();
    if (cc.length === 2 && (+o.stationcount || 0) > 0) list.push(cc);
  });
  if (!list.length) return;
  ALL_COUNTRIES = list;
  try { localStorage.setItem(COUNTRIES_KEY, JSON.stringify({ ts: Date.now(), list: list })); } catch(e){}
  renderFilterOptions();
}

/* Dociągnij stacje wybranego kraju (raz na kraj). */
async function liveFetchCountry(cc){
  cc = trim(cc).toUpperCase();
  if (!cc || _fetchedCC[cc]) return;
  _fetchedCC[cc] = 1;
  var path = "/json/stations/search?countrycode=" + encodeURIComponent(cc) +
             "&hidebroken=true&order=votes&reverse=true&limit=400";
  var data = await fetchFromAnyMirror(path, 9000);
  if (data && data.length) mergeLiveStations(data);
}

/* Dociągnij stacje pasujące do wpisanej frazy (raz na frazę).
   Szukamy równolegle po NAZWIE (np. „RMF") i po TAGU (np. „reggaeton",
   „salsa", „lofi"), więc trafiają zarówno konkretne stacje, jak i gatunki. */
async function liveSearch(q){
  q = lower(q);
  if (q.length < 2 || _searchedTerms[q]) return;
  _searchedTerms[q] = 1;
  var tok = ++_netToken;
  var enc = encodeURIComponent(q);
  var byName = "/json/stations/search?name=" + enc + "&hidebroken=true&order=votes&reverse=true&limit=100";
  var byTag  = "/json/stations/search?tag="  + enc + "&hidebroken=true&order=votes&reverse=true&limit=100";
  var res = await Promise.all([ fetchFromAnyMirror(byName, 8000), fetchFromAnyMirror(byTag, 8000) ]);
  if (tok !== _netToken) return;        /* pojawiła się nowsza fraza */
  var combined = [];
  if (Array.isArray(res[0])) combined = combined.concat(res[0]);
  if (Array.isArray(res[1])) combined = combined.concat(res[1]);
  if (combined.length) mergeLiveStations(combined);
}

/* ══════════════════════════════════════════════════════════
   PODPIĘCIA UI
══════════════════════════════════════════════════════════ */
function bindUi(){
  var _st = null, _netT = null;
  bind($("search"), "input", function(){
    clearTimeout(_st);
    _st = setTimeout(function(){
      state.filters.q = $("search").value || "";
      state.selectedIndex = 0;
      renderList();
    }, 180);
    /* osobny, dłuższy debounce na zapytanie sieciowe - dociąga z całej
       bazy stacje, których nie ma jeszcze lokalnie */
    clearTimeout(_netT);
    _netT = setTimeout(function(){ liveSearch($("search").value || ""); }, 500);
  });
  bind($("filterCountry"), "change", function(){
    state.filters.country = $("filterCountry").value || "";
    state.selectedIndex = 0;
    renderList();
    if (state.filters.country) liveFetchCountry(state.filters.country);
  });
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
  bind($("btnResetStorage"), "click", function(){
    if (!window.confirm("Zresetować wszystkie ustawienia (ulubione, głośność, ostatnią stację)?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
    state.favorites = {};
    setVolume(65);
    renderList();
    setStatus("ok", "Ustawienia zresetowane");
  });

  bind($("volSlider"), "input", function(){ setVolume(+$("volSlider").value); });
  bind($("volIcon"),   "click", toggleMute);


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
    /* na dotyku (także tablet/laptop dotykowy >760px) dwuklik nie
       istnieje - pojedyncze tapnięcie uruchamia stację */
    if (isMobile() || e.pointerType === "touch") playSelected();
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
    /* nie przechwytuj skrótów systemowych (Ctrl+F, Alt+←, Cmd+…) */
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    /* fokus na elemencie interaktywnym (przycisk, link, menu motywów):
       Enter/Spacja muszą aktywować TEN element, a nie globalny skrót -
       inaczej cały UI jest nieobsługiwalny klawiaturą (WCAG 2.1.1) */
    if (src && src.closest && src.closest("button, a, [role='menu']")) {
      if (key === 27) {
        var tm = $("themeMenu");
        if (tm && !tm.hidden) return;      /* menu samo się zamknie */
        clearFilters(); return stopEvt(e);
      }
      return;
    }
    if (key === 32) { togglePlayPause(); return stopEvt(e); }
    if (key === 13) { playSelected();    return stopEvt(e); }
    if (key === 83) { $("search").focus(); return stopEvt(e); }
    if (key === 38) { selectIndex(state.selectedIndex - 1, true); return stopEvt(e); }
    if (key === 40) { selectIndex(state.selectedIndex + 1, true); return stopEvt(e); }
    if (key === 37) { nextPrev(-1); return stopEvt(e); }
    if (key === 39) { nextPrev(1);  return stopEvt(e); }
    if (key === 77) { toggleMute(); return stopEvt(e); }
    if (key === 70) { st = getSelectedStation(); if (st) toggleFavorite(st.id); }
    if (key === 27) {
      var tm2 = $("themeMenu");
      if (tm2 && !tm2.hidden) return;      /* Escape zamyka menu, nie filtry */
      clearFilters(); return stopEvt(e);
    }
  });

  /* resize zmienia tylko tekst podpowiedzi - pełny rerender listy
     ~500 kart przy każdej zmianie rozmiaru okna był zbędny */
  var _rt = null;
  window.addEventListener("resize", function(){
    clearTimeout(_rt);
    _rt = setTimeout(function(){
      var h = $("listHint");
      if (h) h.textContent = isMobile() ? "klik = uruchom" : "dwuklik = uruchom";
    }, 200);
  });

  /* stan sieci - jasny komunikat zamiast 15-sekundowego timeoutu */
  window.addEventListener("offline", function(){
    setStatus("bad", "Brak połączenia z internetem");
  });
  window.addEventListener("online", function(){
    setStatus("ok", "Połączenie przywrócone");
  });
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

  /* pełna lista krajów do filtra (w tle) - pozwala wybrać dowolny kraj,
     którego stacje dociągniemy na żywo */
  loadCountries();

  /* globus - ze stylem bieżącego motywu */
  try {
    globe = new RadioGlobe($("globeCanvas"));
    globe.setTheme(document.documentElement.getAttribute("data-theme") || "green");
  } catch(e){ globe = null; }

  /* Service Worker - aplikacja działa jako PWA i startuje błyskawicznie
     (także na localhost, żeby dało się testować lokalnie) */
  var swOk = location.protocol === "https:" ||
             location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && swOk) {
    try {
      navigator.serviceWorker.register("sw.js").then(function(reg){
        /* SWR serwuje starą wersję do następnej wizyty - przynajmniej
           powiedz użytkownikowi, że nowa czeka po odświeżeniu */
        reg.addEventListener("updatefound", function(){
          var w = reg.installing;
          if (!w) return;
          w.addEventListener("statechange", function(){
            if (w.state === "installed" && navigator.serviceWorker.controller) {
              setStatus("ok", "Nowa wersja gotowa - odśwież stronę");
            }
          });
        });
      }).catch(function(){});
    } catch(e){}
  }

  /* 1) Najpierw cache - natychmiastowy start */
  var cached = readStationCache();
  if (cached) {
    adoptStations(cached.stations);
    summarizeStatus("");
    var age = Date.now() - (+cached.ts || 0);
    if (age > STATION_CACHE_TTL) {
      /* przeterminowany - odśwież w tle */
      refreshStations(false);
    } else {
      /* świeży - i tak cicho zaktualizuj w tle przy okazji */
      setTimeout(function(){ refreshStations(false); }, 4000);
    }
    return;
  }

  /* 2) Brak cache - pełne ładowanie */
  $("stationList").innerHTML =
    '<div class="loadingState"><span class="loadingPulse"></span>Ładowanie stacji z Radio Browser API…</div>';
  setStatus("warn", "Ładowanie stacji…");

  var stations = await loadAllStations();

  if (!stations.length) {
    /* API nie odpowiada - pokaż przynajmniej pewne, kuratorowane stacje */
    adoptStations([]);
    setStatus("warn", "API niedostępne - pokazuję pewne stacje. Kliknij „Odśwież”, by pobrać więcej.");
    return;
  }

  writeStationCache(stations);
  adoptStations(stations);
  summarizeStatus("");
});

/* ════════════════════════════════════════════════════════════
   MOTYWY (8 do wyboru, zapis w COOKIE) + ZWIJANE FILTRY
   Warstwa dodatkowa - nie dotyka logiki danych/odtwarzacza.
════════════════════════════════════════════════════════════ */
(function () {
  var THEME_COOKIE = "radioantomatee_theme";
  var THEMES = ["green", "amber", "cyan", "synthwave", "crimson", "violet", "cats", "naruto"];
  /* każdy motyw ma własny tryb tła (silnik w rain.js) */
  var THEME_BG = {
    green: "matrix", amber: "bokeh", cyan: "snow", synthwave: "grid",
    crimson: "petals", violet: "stars", cats: "cats", naruto: "leaves"
  };

  /* rozgłoś motyw do globusa i tła (jeśli już istnieją) */
  function applyThemeEffects(name) {
    try { if (typeof globe !== "undefined" && globe && globe.setTheme) globe.setTheme(name); } catch (e) {}
    try { if (window.RadioBG && window.RadioBG.setMode) window.RadioBG.setMode(THEME_BG[name] || "matrix"); } catch (e) {}
  }

  /* - cookies - */
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
    applyThemeEffects(name);
  }

  function prefersReduced() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  }

  /* Płynne przejście między motywami - View Transitions API (Chrome).
     Bez wsparcia / reduce-motion / trwającej tranzycji: natychmiast
     (tło i tak robi własny płynny crossfade cząsteczek).
     _desiredTheme trzyma OSTATNIO żądany motyw - callback tranzycji
     i finalne uzgodnienie zawsze stosują właśnie jego, więc szybkie
     przełączanie nigdy nie gubi ostatniego wyboru. */
  var _vtBusy = false, _desiredTheme = null;
  function switchTheme(name) {
    _desiredTheme = name;
    if (!document.startViewTransition || prefersReduced() || _vtBusy) {
      applyTheme(name);
      return;
    }
    _vtBusy = true;
    document.documentElement.classList.add("theme-anim");
    /* zamroź deszcz na czas tranzycji - canvas nie rusza się „pod maską"
       migawki, więc po odsłonięciu nie ma przeskoku pozycji; crossfade
       trybu deszczu odgrywa się na żywo dopiero po wznowieniu */
    try { if (window.RadioBG && window.RadioBG.pause) window.RadioBG.pause(); } catch (e) {}
    var done = function () {
      _vtBusy = false;
      document.documentElement.classList.remove("theme-anim");
      /* uzgodnij stan końcowy z ostatnim żądaniem */
      if (document.documentElement.getAttribute("data-theme") !== _desiredTheme) {
        applyTheme(_desiredTheme);
      }
      try { if (window.RadioBG && window.RadioBG.resume) window.RadioBG.resume(); } catch (e) {}
    };
    var vt;
    try { vt = document.startViewTransition(function () { applyTheme(_desiredTheme); }); }
    catch (e) { applyTheme(_desiredTheme); done(); return; }
    /* obsłuż wszystkie promisy, by przerwana tranzycja nie rzucała
       nieobsłużonym błędem (InvalidStateError przy szybkich zmianach) */
    if (vt) {
      if (vt.finished && vt.finished.then) vt.finished.then(done, done);
      else done();
      if (vt.ready && vt.ready.then) vt.ready.then(null, function () {});
      if (vt.updateCallbackDone && vt.updateCallbackDone.then) vt.updateCallbackDone.then(null, function () {});
    } else { done(); }
  }

  /* zastosuj zapisany motyw natychmiast (skrypt `defer` - DOM gotowy).
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
  /* udostępnij poza IIFE - clearFilters/renderFilterOptions odświeżają
     odznakę po programowej zmianie filtrów (brak zdarzeń change) */
  window._updateFilterBadge = updateFilterBadge;

  window.addEventListener("DOMContentLoaded", function () {
    /* - menu wyboru motywu - */
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
        setCookie(THEME_COOKIE, t, 365);
        openMenu(false);
        switchTheme(t);
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

    /* - rail filtrów: przycisk „Filtry” w nagłówku (mobile) rozwija rail - */
    var ft = $("btnFiltersMobile"), rail = $("filterRail");
    bind(ft, "click", function () {
      if (!rail) return;
      var open = rail.classList.toggle("open");
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
