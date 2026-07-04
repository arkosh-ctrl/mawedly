// Lightweight notification chime via the Web Audio API — no external audio
// files, no autoplay-policy issues (it's triggered by a realtime event after
// the user has already interacted with the page). Safe no-op on the server.

let audioContext: AudioContext | null = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    if (!audioContext) audioContext = new Ctor();

    const ctx = audioContext;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    // A soft two-note ping (800 → 1000 Hz) that reads as "notification" without
    // being harsh.
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.setValueAtTime(1000, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    oscillator.start(now);
    oscillator.stop(now + 0.36);
  } catch {
    // Audio is a nicety; never let it throw into the realtime handler.
  }
}
