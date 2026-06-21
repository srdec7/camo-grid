/**
 * audio.ts — Procedural sound effects using Web Audio API.
 * No external audio files needed. All sounds synthesized in real time.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Low-level: play a single oscillator tone */
function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  startTime: number,
  gainPeak: number,
  c: AudioContext,
  detune = 0
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  if (detune) osc.detune.setValueAtTime(detune, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Low-level: play a tone with a frequency glide (portamento) */
function playGlide(
  freqStart: number,
  freqEnd: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number,
  c: AudioContext
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, startTime);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SOUND FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 🏆 WIN / LEVEL CLEAR — Triumphant multi-layer fanfare
 * Layer 1: Fast rising arpeggio (C5→E5→G5→C6→E6)
 * Layer 2: Rich held chord (triangle + sine harmonics)
 * Layer 3: High sparkle shimmer at the peak
 */
export function playWinSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // ── Layer 1: Rising arpeggio melody (triangle — bright & clear)
  const arpNotes = [
    { freq: 523.25, t: 0.00 },   // C5
    { freq: 659.25, t: 0.09 },   // E5
    { freq: 783.99, t: 0.18 },   // G5
    { freq: 1046.5, t: 0.27 },   // C6
    { freq: 1318.5, t: 0.36 },   // E6  ← climax note
  ];
  arpNotes.forEach(({ freq, t }) => {
    playTone(freq,       "triangle", 0.35, now + t, 0.95, c);
    playTone(freq * 2,   "sine",     0.15, now + t, 0.45, c); // octave shimmer
  });

  // ── Layer 2: Full triumphant chord hits at the peak (0.36s)
  // C6 + E6 + G6 major chord — rich & full
  const chordNotes = [1046.5, 1318.5, 1567.98];
  chordNotes.forEach((freq, i) => {
    playTone(freq, "triangle", 0.70, now + 0.40, 0.90 - i * 0.10, c);
    playTone(freq, "sine",     0.70, now + 0.40, 0.45 - i * 0.05, c, 8); // slight detune for warmth
  });

  // ── Layer 3: Sparkle shimmer (very high triangle — glittery highs)
  const sparkle = [2093, 2637, 3136]; // C7 E7 G7
  sparkle.forEach((freq, i) => {
    playTone(freq, "triangle", 0.12, now + 0.42 + i * 0.04, 0.60, c);
  });

  // ── Layer 4: Low bass punch at the start for impact
  playTone(130.81, "triangle", 0.25, now, 0.90, c); // C3 bass
  playTone(261.63, "triangle", 0.20, now + 0.27, 0.75, c); // C4 mid bass at peak
}

/**
 * 💀 FAIL / OUT OF MOVES — Classic descending "wah-wah-wah" defeat sound
 * Three falling glides, each lower and slower — comedic yet clear defeat cue
 */
export function playFailSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // Three descending "wah" glides — each one drops lower
  const wahs = [
    { start: 466, end: 311, t: 0.00, dur: 0.38 },   // wah 1 — Bb4 → Eb4
    { start: 370, end: 247, t: 0.34, dur: 0.42 },   // wah 2 — F#4 → B3
    { start: 294, end: 185, t: 0.72, dur: 0.55 },   // wah 3 — D4 → F#3 (slow, sad end)
  ];

  wahs.forEach(({ start, end, t, dur }) => {
    // Main slide (sawtooth — brassy wah feel)
    playGlide(start, end, "sawtooth", now + t, dur, 0.95, c);
    // Sub-octave harmony (triangle — adds body)
    playGlide(start / 2, end / 2, "triangle", now + t, dur, 0.60, c);
  });

  // Final very low groan — seals the defeat
  playGlide(200, 80, "sawtooth", now + 1.22, 0.55, 0.75, c);
}

/** ✨ Bright coin chime — ascending C major arpeggio */
export function playCoinSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone(freq, "triangle", 0.18, now + i * 0.07, 0.95, c);
  });
}

/** 💖 Soft heart chime — warm sine wave chord */
export function playHeartSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  [330, 415, 494].forEach((freq, i) => {
    playTone(freq, "sine", 0.35, now + i * 0.04, 0.90, c);
  });
}

/** 🔢 Short click tick for rolling counter */
export function playTickSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  playTone(880, "square", 0.04, now, 0.90, c);
}

/** 👆 Tile tap — subtle soft click */
export function playTapSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  playTone(660, "sine", 0.06, now, 0.95, c);
}

// ─────────────────────────────────────────────────────────────────────────────
// BGM (BACKGROUND MUSIC) CONTROLLER (Web Audio API implementation for mobile compatibility)
// ─────────────────────────────────────────────────────────────────────────────

let bgmBuffer: AudioBuffer | null = null;
let bgmSource: AudioBufferSourceNode | null = null;
let bgmGainNode: GainNode | null = null;
let isMuted = false;
let isPlaying = false;
let bgmStartTime = 0;
let bgmPauseOffset = 0;
let bgmLoadPromise: Promise<AudioBuffer | null> | null = null;

function getPlatformBGMVolume(): number {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return 0.01;
  }
  const ua = navigator.userAgent.toLowerCase();
  
  // iOS detection (iPhone, iPad, iPod, and iPadOS 13+)
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  
  const isAndroid = /android/.test(ua);
  
  if (isAndroid) {
    return 0.07; // 20x boost for Android to be audible on phone speakers
  } else if (isIOS) {
    return 0.0035; // Quiet BGM on iPhone as requested
  } else {
    return 0.007; // Desktop default
  }
}

export function initBGM() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("camo_bgm_muted");
  isMuted = stored === "true";
}

function loadBgmBuffer(c: AudioContext): Promise<AudioBuffer | null> {
  if (bgmBuffer) return Promise.resolve(bgmBuffer);
  if (bgmLoadPromise) return bgmLoadPromise;

  console.log("[BGM] Fetching BGM from server...");
  bgmLoadPromise = fetch("/audio/bgm.mp3")
    .then(res => {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.arrayBuffer();
    })
    .then(arrayBuffer => {
      console.log("[BGM] Decoding audio data...");
      return new Promise<AudioBuffer>((resolve, reject) => {
        c.decodeAudioData(arrayBuffer, resolve, reject);
      });
    })
    .then(buffer => {
      console.log("[BGM] Decoding succeeded!");
      bgmBuffer = buffer;
      return buffer;
    })
    .catch(err => {
      console.error("[BGM] Failed to load or decode BGM:", err);
      bgmLoadPromise = null;
      return null;
    });

  return bgmLoadPromise;
}

export function preloadBGM() {
  if (typeof window === "undefined") return;
  const c = getCtx();
  if (c) {
    loadBgmBuffer(c);
  }
}

function startBGMNode(c: AudioContext, buffer: AudioBuffer) {
  try {
    bgmSource = c.createBufferSource();
    bgmSource.buffer = buffer;
    bgmSource.loop = true;

    bgmGainNode = c.createGain();
    const volume = getPlatformBGMVolume();
    bgmGainNode.gain.setValueAtTime(volume, c.currentTime);

    bgmSource.connect(bgmGainNode);
    bgmGainNode.connect(c.destination);

    const offset = bgmPauseOffset % buffer.duration;
    bgmSource.start(0, offset);
    bgmStartTime = c.currentTime - offset;
    isPlaying = true;
    console.log(`[BGM] Playback started at offset: ${offset.toFixed(2)}s with volume: ${volume}`);
  } catch (err) {
    console.warn("[BGM] Failed to start Web Audio BGM node:", err);
  }
}

export function playBGM(): boolean {
  initBGM();
  if (isMuted) return false;

  const c = getCtx();
  if (!c) return false;

  if (isPlaying && bgmSource) {
    return true;
  }

  if (bgmBuffer) {
    startBGMNode(c, bgmBuffer);
    return true;
  } else {
    console.log("[BGM] Buffer not ready. Loading in background...");
    loadBgmBuffer(c).then(buffer => {
      if (buffer && !isMuted && !isPlaying) {
        startBGMNode(c, buffer);
      }
    });
    return false;
  }
}

export function pauseBGM() {
  if (bgmSource && isPlaying) {
    const c = getCtx();
    if (c) {
      bgmPauseOffset = c.currentTime - bgmStartTime;
    }
    try {
      bgmSource.stop();
    } catch {}
    bgmSource = null;
    isPlaying = false;
  }
}

export function toggleBGM(): boolean {
  initBGM();
  isMuted = !isMuted;
  localStorage.setItem("camo_bgm_muted", isMuted ? "true" : "false");
  
  if (isMuted) {
    pauseBGM();
  } else {
    playBGM();
  }
  return !isMuted;
}

export function isBGMEnabled(): boolean {
  initBGM();
  return !isMuted;
}
