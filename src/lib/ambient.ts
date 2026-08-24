// Faz 4 çekirdeği: prosedürel ambient underscore
// Safari dersleri: context'i kullanıcı hareketinde yarat · await resume + ikinci deneme ·
// sekme gizlenince suspend edilir → visibilitychange ile yönetilir.

export interface AmbientMood {
  /** 0..1 — filtre açıklığı + hava parlaklığı */
  brightness: number
  /** 0..1 — akordsuzluk + daralma + gürültü */
  tension: number
}

type Nodes = {
  master: GainNode
  filt: BiquadFilterNode
  oscB: OscillatorNode
  noiseFilt: BiquadFilterNode
  noiseGain: GainNode
  /** filtre süpürme genliği — gerilimle açılır */
  lfoGain: GainNode
  /** kalp-atışı katmanı — gerilimle hızlanır ve derinleşir */
  pulseLfo: OscillatorNode
  pulseDepth: GainNode
}

export class AmbientEngine {
  private ctx: AudioContext | null = null
  private n: Nodes | null = null
  playing = false
  private onState?: (playing: boolean) => void

  constructor(onState?: (playing: boolean) => void) {
    this.onState = onState
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx || !this.playing) return
        if (document.hidden) this.ctx.suspend().catch(() => {})
        else this.ctx.resume().catch(() => {})
      })
    }
  }

  /** Kullanıcı hareketi içinde çağrılmalı. true = gerçekten çalıştı. */
  async start(): Promise<boolean> {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return false
    if (!this.ctx) this.ctx = new AC()

    // Safari: resume async + ilk denemeyi bazen yutar
    if (!this.isRunning()) {
      try { await this.ctx.resume() } catch {}
      if (!this.isRunning()) {
        await new Promise(r => setTimeout(r, 120))
        try { await this.ctx.resume() } catch {}
      }
    }
    if (!this.isRunning()) return false

    if (!this.n) this.n = this.build()
    this.n.master.gain.setTargetAtTime(0.85, this.ctx.currentTime, 1.2)
    this.playing = true
    this.onState?.(true)
    return true
  }

  stop(): void {
    if (!this.ctx || !this.n) return
    this.n.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4)
    this.playing = false
    this.onState?.(false)
  }

  toggle(): Promise<boolean> {
    return this.playing ? (this.stop(), Promise.resolve(false)) : this.start()
  }

  /** Sentiment'ten türeyen ruh hâli — yumuşak geçişle sürülür */
  setMood(m: AmbientMood): void {
    if (!this.ctx || !this.n) return
    const t = this.ctx.currentTime
    this.n.filt.frequency.setTargetAtTime(280 + m.brightness * 950, t, 1.4)
    this.n.filt.Q.setTargetAtTime(1 + m.tension * 2.4, t, 1.4)
    this.n.oscB.frequency.setTargetAtTime(110.6 + m.tension * 2.6, t, 2)
    this.n.noiseFilt.frequency.setTargetAtTime(750 + m.brightness * 1250, t, 1.6)
    this.n.noiseGain.gain.setTargetAtTime(0.06 + m.tension * 0.09, t, 1.6)
    // Duygu eşlemesi v2: gerilim yükseldikçe filtre süpürmesi genişler ve
    // drone'a kalp-atışı gibi derinleşen bir nabız biner.
    this.n.lfoGain.gain.setTargetAtTime(120 + m.tension * 180, t, 2)
    this.n.pulseLfo.frequency.setTargetAtTime(0.12 + m.tension * 0.45, t, 2.2)
    this.n.pulseDepth.gain.setTargetAtTime(0.012 + m.tension * 0.055, t, 2.2)
  }

  dispose(): void {
    this.stop()
    this.ctx?.close().catch(() => {})
    this.ctx = null
    this.n = null
  }

  private isRunning(): boolean {
    return this.ctx?.state === 'running'
  }

  private build(): Nodes {
    const ctx = this.ctx!
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)

    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'
    filt.frequency.value = 500; filt.Q.value = 1.1
    const g = ctx.createGain(); g.gain.value = 0.30
    let oscB!: OscillatorNode
    const mk = (type: OscillatorType, f: number) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f
      o.connect(filt); o.start(); return o
    }
    mk('sawtooth', 110); oscB = mk('sawtooth', 110.8)    // A2 + detune
    mk('sine', 55)                                       // A1 (kulaklık katmanı)
    mk('triangle', 164.8)                                // E3 beşli (laptop hoparlör için)
    filt.connect(g); g.connect(master)

    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 140
    lfo.connect(lfoGain); lfoGain.connect(filt.frequency); lfo.start()

    // Nefes/puls: drone kazancına binen yavaş LFO — gerilimle hızlanır (kalp atışı hissi)
    const pulseLfo = ctx.createOscillator(); pulseLfo.type = 'sine'; pulseLfo.frequency.value = 0.15
    const pulseDepth = ctx.createGain(); pulseDepth.gain.value = 0.02
    pulseLfo.connect(pulseDepth); pulseDepth.connect(g.gain); pulseLfo.start()

    const len = ctx.sampleRate * 3
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const ch = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; ch[i] = last * 3 }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
    const noiseFilt = ctx.createBiquadFilter(); noiseFilt.type = 'bandpass'
    noiseFilt.frequency.value = 850; noiseFilt.Q.value = 0.6
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.08
    noise.connect(noiseFilt); noiseFilt.connect(noiseGain); noiseGain.connect(master)
    noise.start()

    return { master, filt, oscB, noiseFilt, noiseGain, lfoGain, pulseLfo, pulseDepth }
  }
}
