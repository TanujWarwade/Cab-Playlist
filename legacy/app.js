// ===== PLAYLIST ID =====
const PLAYLIST_ID = 'PLeatb7hupNV_AWUl_7ttbsKeCQh8tF5N4';

// ===== BACKGROUND MOODS (changes with each song) =====
const bgGradients = [
  // 1. Dusk Red (default)
  'linear-gradient(to bottom, #08092a 0%, #16083a 18%, #5a1418 42%, #b02808 64%, #d44010 76%, #c03800 86%, #141414 100%)',
  // 2. Purple Night
  'linear-gradient(to bottom, #0a0520 0%, #1a0840 18%, #3a1058 42%, #6a1078 64%, #8a2088 76%, #5a0858 86%, #080810 100%)',
  // 3. Ocean Midnight
  'linear-gradient(to bottom, #020c20 0%, #041830 18%, #065070 42%, #0878a0 64%, #0a90b8 76%, #056080 86%, #020c14 100%)',
  // 4. Amber Dusk
  'linear-gradient(to bottom, #0c0800 0%, #1c1000 18%, #483008 42%, #886808 64%, #b08810 76%, #906010 86%, #0a0800 100%)',
  // 5. Forest Night
  'linear-gradient(to bottom, #020a02 0%, #041808 18%, #084820 42%, #0a6828 64%, #0c7830 76%, #084820 86%, #020804 100%)',
  // 6. Rose Dawn
  'linear-gradient(to bottom, #100818 0%, #200828 18%, #582030 42%, #904060 64%, #b05070 76%, #803050 86%, #100810 100%)',
];
let bgIdx = 0;
let lastVideoId = '';

const skyBg = document.getElementById('skyBg');

function changeBg() {
  skyBg.style.opacity = '0';
  setTimeout(() => {
    bgIdx = (bgIdx + 1) % bgGradients.length;
    skyBg.style.background = bgGradients[bgIdx];
    skyBg.style.opacity = '1';
  }, 720);
}

// ===== DOM =====
const btnPlay    = document.getElementById('btnPlay');
const btnPrev    = document.getElementById('btnPrev');
const btnNext    = document.getElementById('btnNext');
const btnShuffle = document.getElementById('btnShuffle');
const btnRepeat  = document.getElementById('btnRepeat');
const songName   = document.getElementById('songName');
const songBy     = document.getElementById('songBy');
const tCurr      = document.getElementById('tCurr');
const tTotal     = document.getElementById('tTotal');
const progFill   = document.getElementById('progFill');
const progThumb  = document.getElementById('progThumb');
const progWrap   = document.getElementById('progWrap');
const vinyl      = document.getElementById('vinyl');
const wavebars   = document.getElementById('wavebars');
const volSlider  = document.getElementById('volSlider');
const hornBtn    = document.getElementById('hornBtn');
const hornRipple = document.getElementById('hornRipple');
const kmVal      = document.getElementById('kmVal');
const busWrap    = document.getElementById('busWrap');

// ===== STATE =====
let ytPlayer   = null;
let isPlaying  = false;
let isShuffle  = false;
let isRepeat   = false;
let progTimer  = null;

// ===== STARS =====
const starsEl = document.getElementById('stars');
for (let i = 0; i < 90; i++) {
  const s = document.createElement('span');
  s.style.cssText = `
    left:${Math.random()*100}%;
    top:${Math.random()*62}%;
    width:${Math.random()<0.25 ? 3:2}px;
    height:${Math.random()<0.25 ? 3:2}px;
    animation-delay:${(Math.random()*5).toFixed(2)}s;
    animation-duration:${(1.5+Math.random()*3).toFixed(2)}s;
  `;
  starsEl.appendChild(s);
}



// ===== YOUTUBE IFRAME API =====
// Load the IFrame API script
(function loadYTAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
})();

// Called automatically by YouTube API when ready
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    playerVars: {
      listType:       'playlist',
      list:           PLAYLIST_ID,
      autoplay:       0,
      controls:       0,
      disablekb:      1,
      fs:             0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel:            0,
      origin:         location.origin || 'http://localhost:5500',
    },
    events: {
      onReady:       onPlayerReady,
      onStateChange: onStateChange,
    },
  });
};

function onPlayerReady(event) {
  // Set initial volume
  event.target.setVolume(parseInt(volSlider.value));
  updateSongMeta();
  // Show the song info as soon as ready
  setTimeout(updateSongMeta, 1500);
}

// YT Player states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
function onStateChange(event) {
  const state = event.data;

  if (state === YT.PlayerState.PLAYING) {
    setPlaying(true);
    // Detect new song → change background
    const vd = ytPlayer.getVideoData ? ytPlayer.getVideoData() : {};
    const vid = vd ? vd.video_id : '';
    if (vid && vid !== lastVideoId) {
      lastVideoId = vid;
      changeBg();
    }
    updateSongMeta();
    startProgTimer();
  } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.BUFFERING) {
    setPlaying(false);
    stopProgTimer();
  } else if (state === YT.PlayerState.ENDED) {
    if (isRepeat) {
      ytPlayer.seekTo(0);
      ytPlayer.playVideo();
    } else {
      ytPlayer.nextVideo();
    }
  }
}

// ===== SONG META =====
function updateSongMeta() {
  if (!ytPlayer || typeof ytPlayer.getVideoData !== 'function') return;
  const data = ytPlayer.getVideoData();
  if (data && data.title) {
    // YouTube titles are often "Song - Artist" format
    const parts = data.title.split(' - ');
    if (parts.length >= 2) {
      songName.textContent = parts.slice(0, -1).join(' - ').trim();
      songBy.textContent   = parts[parts.length - 1].trim();
    } else {
      songName.textContent = data.title;
      songBy.textContent   = data.author || '';
    }
  }
}

// ===== PLAYING STATE =====
function setPlaying(playing) {
  isPlaying = playing;
  btnPlay.textContent = playing ? '⏸' : '▶';
  if (playing) {
    vinyl.classList.add('playing');
    wavebars.classList.add('active');
  } else {
    vinyl.classList.remove('playing');
    wavebars.classList.remove('active');
  }
}

// ===== PROGRESS TIMER =====
function startProgTimer() {
  stopProgTimer();
  progTimer = setInterval(updateProgress, 1000);
}
function stopProgTimer() {
  clearInterval(progTimer);
}
function updateProgress() {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  const curr = ytPlayer.getCurrentTime() || 0;
  const dur  = ytPlayer.getDuration()     || 0;
  if (dur <= 0) return;

  const pct = (curr / dur) * 100;
  progFill.style.width  = pct + '%';
  progThumb.style.left  = pct + '%';
  tCurr.textContent  = fmtTime(curr);
  tTotal.textContent = fmtTime(dur);
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// ===== CONTROLS =====
btnPlay.addEventListener('click', () => {
  if (!ytPlayer) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

btnPrev.addEventListener('click', () => {
  if (!ytPlayer) return;
  const curr = ytPlayer.getCurrentTime() || 0;
  if (curr > 5) {
    ytPlayer.seekTo(0, true);
  } else {
    ytPlayer.previousVideo();
    setTimeout(updateSongMeta, 800);
  }
});

btnNext.addEventListener('click', () => {
  if (!ytPlayer) return;
  ytPlayer.nextVideo();
  setTimeout(updateSongMeta, 800);
});

btnShuffle.addEventListener('click', () => {
  isShuffle = !isShuffle;
  btnShuffle.classList.toggle('on', isShuffle);
  if (ytPlayer) ytPlayer.setShuffle(isShuffle);
});

btnRepeat.addEventListener('click', () => {
  isRepeat = !isRepeat;
  btnRepeat.classList.toggle('on', isRepeat);
  if (ytPlayer) ytPlayer.setLoop(isRepeat);
});

// Progress bar seek
progWrap.addEventListener('click', (e) => {
  if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
  const rect = progWrap.getBoundingClientRect();
  const pct  = (e.clientX - rect.left) / rect.width;
  const dur  = ytPlayer.getDuration() || 0;
  ytPlayer.seekTo(pct * dur, true);
  updateProgress();
});

// Volume
volSlider.addEventListener('input', () => {
  if (ytPlayer) ytPlayer.setVolume(parseInt(volSlider.value));
});

// ===== HORN BUTTON =====
hornBtn.addEventListener('click', () => {
  // Ripple rings
  for (let i = 0; i < 3; i++) {
    const r = document.createElement('div');
    r.className = 'ripple-ring';
    r.style.width = r.style.height = '36px';
    r.style.animationDelay = (i * 0.22) + 's';
    hornRipple.appendChild(r);
    setTimeout(() => r.remove(), 900 + i * 220);
  }
  // Bus shake on horn
  busWrap.style.animationName = 'busHonk';
  setTimeout(() => { busWrap.style.animationName = 'busIdle'; }, 600);
  // Horn bounce
  hornBtn.style.transform = 'scale(0.88)';
  setTimeout(() => { hornBtn.style.transform = ''; }, 140);
});

// ===== KM COUNTER =====
let km = 649;
setInterval(() => {
  km += Math.floor(Math.random() * 3 + 1);
  kmVal.textContent = km;
}, 3500);

// ===== SHAYARI (one at a time, same place) =====
const shayaris = [
  "गंगा तेरा पानी अमृत।",
  "जब कोई बात बिगड़ जाए।",
  "हम तुम एक कमरे में बंद हों।",
  "दिल है छोटा सा, छोटी सी आशा।",
  "रफ़्तार में है ज़िंदगी।",
  "सड़क पर चलते जाओ।",
  "ये राहें कभी न ख़त्म हों।",
  "बस चलती रहे, ज़िंदगी गुज़रती रहे।",
  "हर मोड़ पर एक नई कहानी।",
  "चलते रहना ही मंज़िल है।",
];

const shayariEl = document.getElementById('shayariText');
let shayariIdx  = 0;

function showShayari() {
  // Fade out
  shayariEl.classList.remove('visible');
  setTimeout(() => {
    shayariIdx = (shayariIdx + 1) % shayaris.length;
    shayariEl.textContent = shayaris[shayariIdx];
    // Fade in
    shayariEl.classList.add('visible');
  }, 950);
}

// Show first immediately
shayariEl.textContent = shayaris[0];
shayariEl.classList.add('visible');
setInterval(showShayari, 5000); // Change every 5 sec
