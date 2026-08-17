import { useEffect, useRef, useState } from 'react'
import './App.css'

/* =========================================================
   CAB PLAYLIST — YouTube Music Playlist Engine
   ========================================================= */

// YouTube Music Playlist IDs provided by user
const NEW_PLAYLIST_ID = 'RDCLAK5uy_kt3gC0XuT4rhFT3nXCLAhprwdQ0xieyYA'
const RETRO_PLAYLIST_ID = 'PLeatb7hupNV_AWUl_7ttbsKeCQh8tF5N4'

function formatTime(sec) {
  sec = Math.floor(sec || 0)
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function App() {
  const [category, setCategory] = useState('new') // 'new' | 'retro'
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [duration, setDuration] = useState('0:00')
  const [progress, setProgress] = useState(0)
  const [clock, setClock] = useState('')
  const [fare, setFare] = useState(120.0)
  const [distance, setDistance] = useState(12.4)
  const [statusText, setStatusText] = useState('READY')
  const [isHonking, setIsHonking] = useState(false)
  const [ytDropdown, setYtDropdown] = useState(false)

  // Dynamic Metadata State (Extracted dynamically from active playlist stream)
  const [songTitle, setSongTitle] = useState('Trending City Hits')
  const [songArtist, setSongArtist] = useState('Late Night Driving Bangers')
  const [coverId, setCoverId] = useState('OEi0w9W40tA')

  // Refs for bulletproof state access in callbacks
  const categoryRef = useRef('new')

  // Per-playlist last played index — persisted in localStorage
  const lastIndexRef = useRef({
    new: parseInt(localStorage.getItem('cab_idx_new') || '0', 10),
    retro: parseInt(localStorage.getItem('cab_idx_retro') || '0', 10),
  })

  const saveIndex = (cat, idx) => {
    lastIndexRef.current[cat] = idx
    localStorage.setItem(`cab_idx_${cat}`, String(idx))
  }

  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const timerRef = useRef(null)
  const fareTimerRef = useRef(null)
  const seekLockRef = useRef(0)

  // Clock & YouTube API setup
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase())
    }
    updateClock()
    const clockInterval = setInterval(updateClock, 1000)

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    window.onYouTubeIframeAPIReady = () => {
      initYTPlayer()
    }

    if (window.YT && window.YT.Player) {
      initYTPlayer()
    }

    return () => {
      clearInterval(clockInterval)
      clearInterval(timerRef.current)
      clearInterval(fareTimerRef.current)
    }
  }, [])

  const updateSongMeta = () => {
    if (!playerRef.current || typeof playerRef.current.getVideoData !== 'function') return
    const data = playerRef.current.getVideoData()
    if (!data) return

    if (data.title) {
      const parts = data.title.split(' - ')
      if (parts.length >= 2) {
        setSongTitle(parts.slice(0, -1).join(' - ').trim())
        setSongArtist(parts[parts.length - 1].trim())
      } else {
        setSongTitle(data.title)
        setSongArtist(data.author || 'City Night Safar')
      }
    }
    if (data.video_id) {
      setCoverId(data.video_id)
    }
  }

  // Instant progressive meta updater to remove track switching delay
  const triggerFastMetaUpdate = () => {
    updateSongMeta()
    setTimeout(updateSongMeta, 50)
    setTimeout(updateSongMeta, 180)
    setTimeout(updateSongMeta, 450)
  }

  const initYTPlayer = () => {
    if (playerRef.current) return
    const activePlaylistId = categoryRef.current === 'new' ? NEW_PLAYLIST_ID : RETRO_PLAYLIST_ID

    playerRef.current = new window.YT.Player('yt', {
      playerVars: {
        listType: 'playlist',
        list: activePlaylistId,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        autoplay: 0,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          readyRef.current = true
          setStatusText('READY')
          triggerFastMetaUpdate()
        },
        onError: () => {
          setStatusText('SKIPPING...')
          setTimeout(() => {
            skipToNext()
          }, 300)
        },
        onStateChange: (e) => {
          const state = e.data
          const playing = state === window.YT.PlayerState.PLAYING
          const buffering = state === window.YT.PlayerState.BUFFERING

          setIsPlaying(playing)
          updateSongMeta()

          if (playing) {
            setStatusText('HIRED')
            // Save current playlist index whenever a song starts playing
            if (playerRef.current && typeof playerRef.current.getPlaylistIndex === 'function') {
              const idx = playerRef.current.getPlaylistIndex()
              if (idx >= 0) saveIndex(categoryRef.current, idx)
            }
            startProgressTimer()
            startFareTimer()
          } else if (buffering) {
            setStatusText('CHANGING...')
          } else {
            setStatusText(state === window.YT.PlayerState.PAUSED ? 'PAUSED' : 'WAITING')
            stopProgressTimer()
            stopFareTimer()
          }

          if (state === window.YT.PlayerState.ENDED) {
            skipToNext()
          }
        },
      },
    })
  }

  // Playlist Category Switcher
  const switchCategory = (newCat) => {
    if (newCat === categoryRef.current) return

    // Save current index before leaving
    if (playerRef.current && typeof playerRef.current.getPlaylistIndex === 'function') {
      const idx = playerRef.current.getPlaylistIndex()
      if (idx >= 0) saveIndex(categoryRef.current, idx)
    }

    categoryRef.current = newCat
    setCategory(newCat)
    setStatusText('CHANGING...')
    setIsPlaying(false)
    stopProgressTimer()
    stopFareTimer()

    const listId = newCat === 'new' ? NEW_PLAYLIST_ID : RETRO_PLAYLIST_ID
    const resumeIdx = lastIndexRef.current[newCat] || 0

    if (readyRef.current && playerRef.current) {
      if (typeof playerRef.current.stopVideo === 'function') {
        playerRef.current.stopVideo()
      }
      if (typeof playerRef.current.cuePlaylist === 'function') {
        playerRef.current.cuePlaylist({
          listType: 'playlist',
          list: listId,
          index: resumeIdx,
        })
      } else if (typeof playerRef.current.loadPlaylist === 'function') {
        playerRef.current.loadPlaylist({
          listType: 'playlist',
          list: listId,
          index: resumeIdx,
        })
      }
      setTimeout(triggerFastMetaUpdate, 300)
    }
  }

  // Safe Next Song Switcher
  const skipToNext = () => {
    if (readyRef.current && playerRef.current && typeof playerRef.current.nextVideo === 'function') {
      playerRef.current.nextVideo()
      triggerFastMetaUpdate()
    }
  }

  // Progress & Fare Timers
  const startProgressTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (Date.now() < seekLockRef.current) return
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return

      const curr = playerRef.current.getCurrentTime() || 0
      const dur = playerRef.current.getDuration() || 0

      setCurrentTime(formatTime(curr))
      setDuration(formatTime(dur))
      setProgress(dur ? (curr / dur) * 100 : 0)

      updateSongMeta()
    }, 200)
  }

  const stopProgressTimer = () => {
    clearInterval(timerRef.current)
  }

  const startFareTimer = () => {
    clearInterval(fareTimerRef.current)
    fareTimerRef.current = setInterval(() => {
      setFare((prev) => +(prev + 0.5).toFixed(2))
      setDistance((prev) => +(prev + 0.05).toFixed(2))
    }, 2000)
  }

  const stopFareTimer = () => {
    clearInterval(fareTimerRef.current)
  }

  const handlePlayPause = () => {
    if (!readyRef.current || !playerRef.current) return
    const st = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : -1

    if (st === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  const handleNext = () => {
    if (readyRef.current && playerRef.current && typeof playerRef.current.nextVideo === 'function') {
      playerRef.current.nextVideo()
      triggerFastMetaUpdate()
    }
  }

  const handlePrev = () => {
    if (readyRef.current && playerRef.current && typeof playerRef.current.previousVideo === 'function') {
      playerRef.current.previousVideo()
      triggerFastMetaUpdate()
    }
  }

  const handleSeek = (e) => {
    if (!readyRef.current || !playerRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const dur = playerRef.current.getDuration() || 0
    const seekTime = pct * dur

    setProgress(pct * 100)
    setCurrentTime(formatTime(seekTime))

    seekLockRef.current = Date.now() + 2000
    playerRef.current.seekTo(seekTime, true)
  }

  // Taxi Horn Audio Synthesizer — Single continuous 2-second horn blast
  const playTaxiHorn = () => {
    if (isHonking) return
    setIsHonking(true)
    setTimeout(() => setIsHonking(false), 2000)

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      const startTime = ctx.currentTime
      const stopTime = startTime + 2.0

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sawtooth'
      osc2.type = 'square'

      osc1.frequency.setValueAtTime(420, startTime)
      osc2.frequency.setValueAtTime(510, startTime)

      gain.gain.setValueAtTime(0.01, startTime)
      gain.gain.linearRampToValueAtTime(0.24, startTime + 0.05)
      gain.gain.setValueAtTime(0.24, stopTime - 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, stopTime)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(startTime)
      osc2.start(startTime)
      osc1.stop(stopTime)
      osc2.stop(stopTime)
    } catch (err) {
      console.log('Audio Context error:', err)
    }
  }

  return (
    <div className="app-container">
      {/* Background Layers */}
      <div className={`city-bg ${isPlaying ? 'playing' : ''}`} />
      <div className="rain-layer" />
      <div className="rain-drops" />

      {/* Header Navigation */}
      <header>
        <div className="cab-status-pill">
          <span className="status-dot" />
          <span>CAB GPS • {clock}</span>
        </div>
        <nav className="nav-links">
          {/* YouTube Playlists Dropdown Icon */}
          <div className="yt-dropdown-wrap" onMouseLeave={() => setYtDropdown(false)}>
            <button
              className="yt-icon-btn"
              onClick={() => setYtDropdown(v => !v)}
              aria-label="Open YouTube Playlists"
              title="YouTube Playlists"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="yt-icon-svg">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </button>
            {ytDropdown && (
              <div className="yt-dropdown-menu">
                <a
                  href={`https://music.youtube.com/playlist?list=${NEW_PLAYLIST_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="yt-dropdown-item"
                  onClick={() => setYtDropdown(false)}
                >
                  🔥 New Trending Hits
                </a>
                <a
                  href={`https://music.youtube.com/playlist?list=${RETRO_PLAYLIST_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="yt-dropdown-item"
                  onClick={() => setYtDropdown(false)}
                >
                  📻 Classic Retro Bangers
                </a>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Headline */}
      <div className="hero-title">
        <h1>{category === 'new' ? 'CAB PLAYLIST' : 'कैब प्लेलिस्ट'}</h1>
        <p>Late night city drive. Window down. Soft rain. Full volume.</p>
        
        {/* Playlist Category Selector Tabs */}
        <div className="playlist-tabs">
          <button
            className={`tab-btn ${category === 'new' ? 'active' : ''}`}
            onClick={() => switchCategory('new')}
          >
            🔥 New Trending Hits
          </button>
          <button
            className={`tab-btn ${category === 'retro' ? 'active' : ''}`}
            onClick={() => switchCategory('retro')}
          >
            📻 Classic Retro Playlist
          </button>
        </div>
      </div>

      {/* Custom Taxi Meter Audio Player Console */}
      <div className="cab-player-container">
        {/* Roof Taxi Light Indicator */}
        <div className={`roof-light ${isPlaying ? 'hired' : ''}`}>
          <div className="roof-light-text">
            {isPlaying ? 'TAXI — HIRED' : 'TAXI — VACANT'}
          </div>
        </div>

        {/* Main Taxi Meter Console Panel */}
        <div className="cab-meter-panel">
          {/* Yellow/Black Checkered Strip */}
          <div className="checker-strip" />

          {/* Meter Digital HUD */}
          <div className="meter-hud">
            <div className="hud-item">
              <span className="hud-label">FARE</span>
              <span className="hud-value">₹ {fare.toFixed(2)}</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">TRIP DISTANCE</span>
              <span className="hud-value">{distance.toFixed(1)} KM</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">METER STATUS</span>
              <span className={`hud-value ${isPlaying ? 'status-on' : ''}`}>
                {statusText}
              </span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="player-row">
            <div
              className={`yt-screen ${isPlaying ? 'playing' : ''}`}
              style={{
                backgroundImage: `url(https://i.ytimg.com/vi/${coverId}/hqdefault.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div id="yt" />
            </div>
            <div className="meta-info">
              <div className="song-title">{songTitle}</div>
              <div className="artist-name">— {songArtist}</div>
            </div>
            <div className="controls-group">
              <button
                className="btn-ctrl"
                onClick={handlePrev}
                aria-label="Previous track"
              >
                ⏮
              </button>
              <button
                className="btn-ctrl btn-play"
                onClick={handlePlayPause}
                aria-label="Play or pause track"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                className="btn-ctrl"
                onClick={handleNext}
                aria-label="Next track"
              >
                ⏭
              </button>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="progress-bar-wrap">
            <span>{currentTime}</span>
            <div className="track-line" onClick={handleSeek}>
              <div className="track-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{duration}</span>
          </div>

          {/* Cab Bumper Stickers / Mudflaps */}
          <div className="cab-bumper-stickers">
            <div className="sticker">METER DOWN • AC ON 🚕</div>
            <div className="sticker">NO BARGAIN • CITY SAFAR ✨</div>
          </div>
        </div>

        {/* Horn Easter Egg Button */}
        <div className="horn-btn-wrap">
          <button
            className={`horn-btn ${isHonking ? 'active' : ''}`}
            onClick={playTaxiHorn}
          >
            {isHonking ? '🔊 HONKING CAB HORN (2S)...' : '🎺 HONK TAXI HORN'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
