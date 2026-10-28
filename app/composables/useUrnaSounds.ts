/**
 * Web Audio API sound synthesizer for the virtual ballot box (Urna Eletrônica).
 * Fails silently in environments where AudioContext is restricted or unavailable.
 */
export function useUrnaSounds() {
  const getAudioContextCtor = (): typeof AudioContext | undefined => {
    if (typeof window === 'undefined') return undefined
    return (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    )
  }

  const playKeySound = (): void => {
    try {
      const AudioCtx = getAudioContextCtor()
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } catch {
      // Audio playback might be restricted or unsupported
    }
  }

  const playConfirmationSound = (): void => {
    try {
      const AudioCtx = getAudioContextCtor()
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(950, ctx.currentTime)
      osc.frequency.setValueAtTime(1400, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.8)
    } catch {
      // Audio playback might be restricted or unsupported
    }
  }

  return {
    playKeySound,
    playConfirmationSound,
  }
}
