const LUCKY_GENRES = ["pop", "hip-hop", "rock", "electronic", "jazz", "indie", "r&b", "latin"];
const HISTORY_KEY  = "vibeCheckHistory";
const MAX_HISTORY  = 10;

// --- VOLUME & STATE ---
let currentAudio   = null;
let savedVolume    = localStorage.getItem("vibeCheckVolume")
  ? parseFloat(localStorage.getItem("vibeCheckVolume")) : 0.5;

// Track last played per panel to avoid duplicates
let lastArtistId = null;
let lastGenreId  = null;
let lastLuckyId  = null;

// ── Save to history ───────────────────────────────────────────────────────────
function saveToHistory(song) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const entry = {
    track:     song.trackName,
    artist:    song.artistName,
    art:       song.artworkUrl100.replace("100x100bb", "300x300bb"),
    url:       song.trackViewUrl,
    timestamp: Date.now()
  };
  const filtered = history.filter(s => !(s.track === entry.track && s.artist === entry.artist));
  filtered.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
}

// ── Fetch — retries once if duplicate ────────────────────────────────────────
async function fetchRandomSong(query, lastId = null) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=50&media=music`;
  const res  = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0)
    throw new Error("No songs found. Try a different search.");
  let song = data.results[Math.floor(Math.random() * data.results.length)];
  // Retry once if same song as last time
  if (song.trackId === lastId && data.results.length > 1) {
    song = data.results[Math.floor(Math.random() * data.results.length)];
  }
  return song;
}

// ── Art glow: sample average colour from album art ───────────────────────────
function applyArtGlow(artEl) {
  const img = artEl.querySelector("img");
  if (!img) return;
  const apply = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 10; canvas.height = 10;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 10, 10);
      const d = ctx.getImageData(0, 0, 10, 10).data;
      let r = 0, g = 0, b = 0;
      const px = d.length / 4;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
      r = Math.round(r/px); g = Math.round(g/px); b = Math.round(b/px);
      artEl.style.boxShadow = `0 20px 60px rgba(${r},${g},${b},0.55)`;
    } catch(_) {}
  };
  if (img.complete) apply();
  else img.addEventListener("load", apply);
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function handleAudioState(container) {
  const newAudio = container.querySelector("audio");
  const albumArt = container.querySelector(".song-card__art");
  if (newAudio) {
    if (currentAudio) currentAudio.pause();
    newAudio.volume = savedVolume;
    currentAudio = newAudio;
    albumArt.addEventListener("click", () => newAudio.paused ? newAudio.play() : newAudio.pause());
    newAudio.addEventListener("volumechange", () => {
      savedVolume = newAudio.volume;
      localStorage.setItem("vibeCheckVolume", savedVolume);
    });
    newAudio.addEventListener("play",  () => albumArt.classList.add("is-playing"));
    newAudio.addEventListener("pause", () => albumArt.classList.remove("is-playing"));
    if (!newAudio.paused) albumArt.classList.add("is-playing");
  }
  applyArtGlow(albumArt);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function highResArt(url) { return url.replace("100x100bb", "600x600bb"); }

function spinnerHTML(colorClass, text) {
  return `<div class="spinner"><div class="spinner__disc ${colorClass}"></div><p class="spinner__text">${text}</p></div>`;
}
function errorHTML(msg) {
  return `<div class="error-msg"><p>${msg}</p></div>`;
}
function songCardHTML(song) {
  const audioTag = song.previewUrl
    ? `<audio autoplay src="${song.previewUrl}"></audio>`
    : `<p class="no-preview">No audio preview available</p>`;
  return `
    <div class="song-card fade-in">
      <div class="song-card__art" style="cursor:pointer;position:relative;">
        <img src="${highResArt(song.artworkUrl100)}" alt="Album art" crossorigin="anonymous" />
        <div class="play-overlay">
          <svg viewBox="0 0 24 24" fill="white" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="song-card__info">
        <p class="song-card__track" title="${song.trackName}">${song.trackName}</p>
        <p class="song-card__artist" title="${song.artistName}">${song.artistName}</p>
        <p class="song-card__album" title="${song.collectionName || ""}">${song.collectionName || ""}</p>
        ${audioTag}
      </div>
    </div>`;
}

// ── By Artist ─────────────────────────────────────────────────────────────────
const artistForm   = document.getElementById("artistForm");
const artistInput  = document.getElementById("artistInput");
const artistBtn    = document.getElementById("artistBtn");
const artistResult = document.getElementById("artistResult");

artistForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = artistInput.value.trim();
  if (!query) return;
  artistBtn.disabled = true;
  artistResult.innerHTML = spinnerHTML("spinner__disc--pink", "Digging crates...");
  try {
    const song = await fetchRandomSong(query, lastArtistId);
    lastArtistId = song.trackId;
    saveToHistory(song);
    artistResult.innerHTML = songCardHTML(song);
    handleAudioState(artistResult);
  } catch (err) {
    artistResult.innerHTML = errorHTML(err.message);
  } finally {
    artistBtn.disabled = false;
  }
});

// ── By Genre ──────────────────────────────────────────────────────────────────
const chips       = document.querySelectorAll(".chip");
const genreResult = document.getElementById("genreResult");

chips.forEach(chip => {
  chip.addEventListener("click", async () => {
    chips.forEach(c => c.disabled = true);
    genreResult.innerHTML = spinnerHTML("spinner__disc--cyan", "Finding vibes...");
    try {
      const song = await fetchRandomSong(chip.dataset.genre, lastGenreId);
      lastGenreId = song.trackId;
      saveToHistory(song);
      genreResult.innerHTML = songCardHTML(song);
      handleAudioState(genreResult);
    } catch (err) {
      genreResult.innerHTML = errorHTML(err.message);
    } finally {
      chips.forEach(c => c.disabled = false);
    }
  });
});

// ── Feeling Lucky ─────────────────────────────────────────────────────────────
const luckyBtn    = document.getElementById("luckyBtn");
const luckyReload = document.getElementById("luckyReload");
const luckyHero   = document.getElementById("luckyHero");
const luckyResult = document.getElementById("luckyResult");

async function doLucky() {
  luckyBtn.disabled = luckyReload.disabled = true;
  luckyHero.classList.add("hidden");
  luckyResult.classList.remove("hidden");
  const existing = luckyResult.querySelector(".song-card, .spinner, .error-msg");
  if (existing) existing.remove();
  const spinner = document.createElement("div");
  spinner.innerHTML = spinnerHTML("spinner__disc--lg", "Dropping needle...");
  luckyResult.appendChild(spinner.firstElementChild);
  try {
    const genre = LUCKY_GENRES[Math.floor(Math.random() * LUCKY_GENRES.length)];
    const song  = await fetchRandomSong(genre, lastLuckyId);
    lastLuckyId = song.trackId;
    saveToHistory(song);
    luckyResult.querySelector(".spinner, .error-msg")?.remove();
    const card = document.createElement("div");
    card.innerHTML = songCardHTML(song);
    luckyResult.appendChild(card.firstElementChild);
    handleAudioState(luckyResult);
  } catch (err) {
    luckyResult.querySelector(".spinner")?.remove();
    const errEl = document.createElement("div");
    errEl.innerHTML = errorHTML(err.message);
    luckyResult.appendChild(errEl.firstElementChild);
  } finally {
    luckyBtn.disabled = luckyReload.disabled = false;
  }
}

luckyBtn.addEventListener("click", doLucky);
luckyReload.addEventListener("click", doLucky);

// ── Page fade-in on load ──────────────────────────────────────────────────────
document.body.style.opacity = "0";
document.body.style.transition = "opacity 0.3s ease";
window.addEventListener("load", () => { document.body.style.opacity = "1"; });
