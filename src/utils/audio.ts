/**
 * audio.ts — Procedural sound effects using Web Audio API.
 * No external audio files needed. All sounds synthesized in real time.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AudioContextClass();
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
    playGlide(start, end, "sawtooth", now + t, dur, 0.33, c);
    // Sub-octave harmony (triangle — adds body)
    playGlide(start / 2, end / 2, "triangle", now + t, dur, 0.21, c);
  });

  // Final very low groan — seals the defeat
  playGlide(200, 80, "sawtooth", now + 1.22, 0.55, 0.26, c);
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
// BGM (BACKGROUND MUSIC) CONTROLLER (HTML5 Audio for stable mobile streaming)
// ─────────────────────────────────────────────────────────────────────────────

let bgmAudioEl: HTMLAudioElement | null = null;
let isMuted = false;

function getPlatformBGMVolume(): number {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return 0.5;
  }
  const ua = navigator.userAgent.toLowerCase();
  
  // iOS detection
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);
  
  if (isAndroid) {
    return 1.0; // Max volume for mobile speakers
  } else if (isIOS) {
    return 1.0; // Max volume for mobile speakers
  } else {
    return 0.6; // Comfortable desktop volume
  }
}

export function initBGM() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("camo_bgm_muted");
  isMuted = stored === "true";
}

export function preloadBGM() {
  if (typeof window === "undefined") return;
  if (!bgmAudioEl) {
    bgmAudioEl = new Audio("/audio/bgm.mp3");
    bgmAudioEl.loop = true;
    bgmAudioEl.volume = getPlatformBGMVolume();
    bgmAudioEl.preload = "auto";
  }
}

export function playBGM(): boolean {
  initBGM();
  if (isMuted) return false;
  
  if (!bgmAudioEl) {
    preloadBGM();
  }
  
  if (bgmAudioEl && bgmAudioEl.paused) {
    bgmAudioEl.volume = getPlatformBGMVolume();
    bgmAudioEl.play().catch(err => {
      console.warn("[BGM] HTML5 Audio play failed. Waiting for interaction.", err);
    });
  }
  return true;
}

export function pauseBGM() {
  if (bgmAudioEl && !bgmAudioEl.paused) {
    bgmAudioEl.pause();
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
