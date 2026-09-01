// Faz 4 çekirdeği: prosedürel ambient underscore
// Safari dersleri: context'i kullanıcı hareketinde yarat · await resume + ikinci deneme ·
// sekme gizlenince suspend edilir → visibilitychange ile yönetilir.
// Sinyal zinciri:  kaynaklar → preFx → [dry | convolver→wet] → level → duck → çıkış
import { ambientParams, type AmbientMood } from './ambientParams'

export type { AmbientMood }

/** Taban seviye. Konuşmayla yarışmamalı — replik boyunca ayrıca duck edilir. */
const LEVEL = 0.30
const DUCK = 0.45

type Nodes = {
  level: GainNode
  duck: GainNode
  preFx: GainNode
  dry: GainNode
  wet: GainNode
  filt: BiquadFilterNode
  oscB: OscillatorNode
  /** gerilimle beşliden minör altıya kayan üst katman */
  tensionOsc: OscillatorNode
  noiseFilt: BiquadFilterNode
  noiseGain: GainNode
  /** filtre süpürme genliği — gerilimle açılır */
  lfoGain: GainNode
  /** kalp-atışı katmanı — gerilimle hızlanır ve derinleşir */
  pulseLfo: OscillatorNode
  pulseDepth: GainNode
  /** stereo dolaşma — iki drone katmanı zıt yönde gezer */
  panLfo: OscillatorNode
}

export class AmbientEngine {
  private ctx: AudioContext | null = null
  private n: Nodes | null = null
  playing = false
  private onState?: (playing: boolean) => void
  private shimmerTimer: ReturnType<typeof setTimeout> | null = null
  private shimmerWeight = 0.5
  private ducked = false

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
    this.n.level.gain.setTargetAtTime(LEVEL, this.ctx.currentTime, 1.2)
    this.playing = true
    this.onState?.(true)
    this.scheduleShimmer()
    return true
  }

  stop(): void {
    if (this.shimmerTimer) { clearTimeout(this.shimmerTimer); this.shimmerTimer = null }
    if (!this.ctx || !this.n) return
    this.n.level.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4)
    this.playing = false
    this.onState?.(false)
  }

  toggle(): Promise<boolean> {
    return this.playing ? (this.stop(), Promise.resolve(false)) : this.start()
  }

  /** Replik çalarken ambiyans geri çekilir — konuşma her zaman önde. */
  setDucked(on: boolean): void {
    this.ducked = on
    if (!this.ctx || !this.n) return
    this.n.duck.gain.setTargetAtTime(on ? DUCK : 1, this.ctx.currentTime, on ? 0.25 : 0.7)
  }

  /** Sentiment'ten türeyen ruh hâli — yumuşak geçişle sürülür */
  setMood(m: AmbientMood): void {
    if (!this.ctx || !this.n) return
    const p = ambientParams(m)
    const t = this.ctx.currentTime
    this.n.filt.frequency.setTargetAtTime(p.filterHz, t, 1.4)
    this.n.filt.Q.setTargetAtTime(p.filterQ, t, 1.4)
    this.n.oscB.frequency.setTargetAtTime(p.detuneHz, t, 2)
    this.n.tensionOsc.frequency.setTargetAtTime(p.tensionNoteHz, t, 3)
    this.n.noiseFilt.frequency.setTargetAtTime(p.noiseHz, t, 1.6)
    this.n.noiseGain.gain.setTargetAtTime(p.noiseGain, t, 1.6)
    this.n.lfoGain.gain.setTargetAtTime(p.sweepDepth, t, 2)
    this.n.pulseLfo.frequency.setTargetAtTime(p.pulseHz, t, 2.2)
    this.n.pulseDepth.gain.setTargetAtTime(p.pulseDepth, t, 2.2)
    // Değişken yankı: gerilim yükseldikçe mekân genişler, kuru sinyal çekilir
    this.n.wet.gain.setTargetAtTime(p.wetRatio, t, 2.5)
    this.n.dry.gain.setTargetAtTime(1 - p.wetRatio * 0.6, t, 2.5)
    this.n.panLfo.frequency.setTargetAtTime(p.panRate, t, 3)
    this.shimmerWeight = p.shimmerChance
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

  /** Seyrek, kendiliğinden beliren tek ton — yankıya düşer ve söner. */
  private scheduleShimmer(): void {
    if (this.shimmerTimer) clearTimeout(this.shimmerTimer)
    const wait = 9000 + Math.random() * 17000
    this.shimmerTimer = setTimeout(() => {
      if (this.playing) { this.fireShimmer(); this.scheduleShimmer() }
    }, wait)
  }

  private fireShimmer(): void {
    if (!this.ctx || !this.n || Math.random() > this.shimmerWeight) return
    const ctx = this.ctx
    const t = ctx.currentTime
    // A minör alanının üst kısmı — akorda ait, o yüzden rahatsız etmez
    const notes = [440, 523.25, 659.25, 880]
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)]
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(0.05, t, 0.6)
    g.gain.setTargetAtTime(0, t + 1.6, 1.1)
    osc.connect(g)
    // Ağırlıklı olarak yankıya gider: mekânın içinden gelmiş gibi dursun
    g.connect(this.n.preFx)
    osc.start(t)
    osc.stop(t + 6)
    osc.onended = () => { try { osc.disconnect(); g.disconnect() } catch {} }
  }

  /** Üstel sönümlü gürültü = prosedürel oda. Dosya indirmeden yankı. */
  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
      }
    }
    return buf
  }

  private build(): Nodes {
    const ctx = this.ctx!

    // ── çıkış zinciri ────────────────────────────────────────────────────
    const duck = ctx.createGain(); duck.gain.value = this.ducked ? DUCK : 1
    duck.connect(ctx.destination)
    const level = ctx.createGain(); level.gain.value = 0; level.connect(duck)

    const preFx = ctx.createGain(); preFx.gain.value = 1
    const dry = ctx.createGain(); dry.gain.value = 1 - 0.10 * 0.6
    const wet = ctx.createGain(); wet.gain.value = 0.10
    const conv = ctx.createConvolver(); conv.buffer = this.makeImpulse(2.8, 2.4)
    preFx.connect(dry); dry.connect(level)
    preFx.connect(conv); conv.connect(wet); wet.connect(level)

    // ── drone ────────────────────────────────────────────────────────────
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'
    filt.frequency.value = 500; filt.Q.value = 1.1
    const g = ctx.createGain(); g.gain.value = 0.30

    // Stereo: iki katman zıt yönde gezer — mekân sabit durmaz
    const hasPanner = typeof ctx.createStereoPanner === 'function'
    const panA = hasPanner ? ctx.createStereoPanner() : null
    const panB = hasPanner ? ctx.createStereoPanner() : null
    const panLfo = ctx.createOscillator(); panLfo.type = 'sine'; panLfo.frequency.value = 0.04
    const panDepth = ctx.createGain(); panDepth.gain.value = 0.55
    const panInvert = ctx.createGain(); panInvert.gain.value = -1
    panLfo.connect(panDepth)
    if (panA) panDepth.connect(panA.pan)
    panDepth.connect(panInvert)
    if (panB) panInvert.connect(panB.pan)
    panLfo.start()

    const mk = (type: OscillatorType, f: number, dest: AudioNode) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f
      o.connect(dest); o.start(); return o
    }
    // A2 + detune (gövde) · A1 (kulaklık katmanı) · gerilim notası E3→F3
    const sideA: AudioNode = panA ?? filt
    const sideB: AudioNode = panB ?? filt
    if (panA) panA.connect(filt)
    if (panB) panB.connect(filt)
    mk('sawtooth', 110, sideA)
    const oscB = mk('sawtooth', 110.8, sideB)
    mk('sine', 55, filt)
    const tensionOsc = mk('triangle', 164.81, sideB)
    filt.connect(g); g.connect(preFx)

    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 140
    lfo.connect(lfoGain); lfoGain.connect(filt.frequency); lfo.start()

    // Nefes/puls: drone kazancına binen yavaş LFO — gerilimle hızlanır (kalp atışı hissi)
    const pulseLfo = ctx.createOscillator(); pulseLfo.type = 'sine'; pulseLfo.frequency.value = 0.15
    const pulseDepth = ctx.createGain(); pulseDepth.gain.value = 0.02
    pulseLfo.connect(pulseDepth); pulseDepth.connect(g.gain); pulseLfo.start()

    // ── hava ─────────────────────────────────────────────────────────────
    const len = ctx.sampleRate * 3
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const ch = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; ch[i] = last * 3 }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
    const noiseFilt = ctx.createBiquadFilter(); noiseFilt.type = 'bandpass'
    noiseFilt.frequency.value = 850; noiseFilt.Q.value = 0.6
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.08
    noise.connect(noiseFilt); noiseFilt.connect(noiseGain); noiseGain.connect(preFx)
    noise.start()

    return { level, duck, preFx, dry, wet, filt, oscB, tensionOsc, noiseFilt, noiseGain, lfoGain, pulseLfo, pulseDepth, panLfo }
  }
}
