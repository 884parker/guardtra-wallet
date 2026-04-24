/**
 * Pause Wallet — Notification & Sound Utility
 * 
 * Provides:
 *   - Browser push notifications (requires user permission)
 *   - Custom alert sounds via Web Audio API
 *   - Easy to swap in a custom .mp3/.wav later
 * 
 * Usage:
 *   import { notify, requestNotificationPermission, playAlertSound } from '@/lib/notifications';
 *   
 *   // Request permission (call once, e.g., on first login)
 *   await requestNotificationPermission();
 *   
 *   // Send a notification with sound
 *   notify({ title: 'Security Alert', body: 'Too many PIN attempts', level: 'critical' });
 *   
 *   // Play sound only
 *   playAlertSound('warning');
 */

// ─── Permission ───

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted';
}

// ─── Sound Generation (Web Audio API) ───

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Custom sound file path — set this to use a .mp3/.wav instead of generated tones.
 * Example: '/sounds/pause-alert.mp3'
 * Set to null to use generated Web Audio tones.
 */
let customSoundFile = null;

export function setCustomSoundFile(path) {
  customSoundFile = path;
}

/**
 * Play a custom audio file.
 */
function playAudioFile(src, volume = 0.7) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {
    // Autoplay blocked — user interaction required
    console.warn('[Notifications] Audio playback blocked by browser');
  });
}

/**
 * Generate and play a distinctive tone using Web Audio API.
 * 
 * Levels:
 *   'info'     — gentle double-chime (new notification)
 *   'warning'  — attention-grabbing rising tone
 *   'critical' — urgent pulsing alarm (lockout, breach attempt)
 *   'success'  — pleasant confirmation ding
 */
export function playAlertSound(level = 'warning') {
  // If custom sound file is set, use that instead
  if (customSoundFile) {
    playAudioFile(customSoundFile, level === 'critical' ? 1.0 : 0.7);
    return;
  }

  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    switch (level) {
      case 'info': {
        // Gentle double chime — two soft tones
        [0, 0.15].forEach((delay, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = i === 0 ? 880 : 1100; // A5 → C#6
          gain.gain.setValueAtTime(0.15, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.3);
        });
        break;
      }

      case 'warning': {
        // Rising attention tone — sweep up
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }

      case 'critical': {
        // Urgent pulsing alarm — three rapid pulses at high pitch
        for (let i = 0; i < 3; i++) {
          const delay = i * 0.2;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 1200;
          gain.gain.setValueAtTime(0.2, now + delay);
          gain.gain.setValueAtTime(0.2, now + delay + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.15);
        }
        // Follow with a lower warning tone
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(600, now + 0.65);
        osc2.frequency.linearRampToValueAtTime(300, now + 1.1);
        gain2.gain.setValueAtTime(0.15, now + 0.65);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(now + 0.65);
        osc2.stop(now + 1.1);
        break;
      }

      case 'success': {
        // Pleasant ascending ding
        [0, 0.12].forEach((delay, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = i === 0 ? 660 : 990; // E5 → B5
          gain.gain.setValueAtTime(0.2, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.4);
        });
        break;
      }
    }
  } catch (err) {
    console.warn('[Notifications] Audio failed:', err);
  }
}

// ─── Unified Notify ───

/**
 * Send a notification with optional sound.
 * 
 * @param {object} opts
 * @param {string} opts.title    — Notification title
 * @param {string} opts.body     — Notification body text
 * @param {string} opts.level    — 'info' | 'warning' | 'critical' | 'success'
 * @param {boolean} opts.sound   — Play sound (default: true)
 * @param {boolean} opts.browser — Send browser notification (default: true)
 * @param {string} opts.icon     — Optional icon URL
 */
export function notify({
  title = 'Pause Wallet',
  body = '',
  level = 'info',
  sound = true,
  browser = true,
  icon = undefined,
} = {}) {
  // Play sound
  if (sound) {
    playAlertSound(level);
  }

  // Browser notification
  if (browser && canNotify()) {
    try {
      const n = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: `pause-${level}-${Date.now()}`,
        requireInteraction: level === 'critical',
        silent: true, // We handle our own sound
      });

      // Auto-close non-critical notifications after 8 seconds
      if (level !== 'critical') {
        setTimeout(() => n.close(), 8000);
      }
    } catch (err) {
      console.warn('[Notifications] Browser notification failed:', err);
    }
  }
}
