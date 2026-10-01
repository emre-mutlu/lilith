import { describe, it, expect, vi } from 'vitest'
import { runTtsLadder, type TtsLayers, type TtsAudio } from './ttsLadder'

const AUDIO: TtsAudio = { audio: 'AAAA', mimeType: 'audio/wav' }

/** Sahte katmanlar: hangisi ses verir, hangisi düşer; çağrılar kaydedilir. */
function layers(ok: Partial<Record<'fish' | 'gemini' | 'local', boolean>>) {
  const l = {
    fish: vi.fn(async () => (ok.fish ? AUDIO : null)),
    gemini: vi.fn(async () => (ok.gemini ? AUDIO : null)),
    local: vi.fn(async (_: { spawn: boolean }) => (ok.local ? AUDIO : null)),
  }
  return l satisfies TtsLayers
}

describe('runTtsLadder', () => {
  it('fish başarılıysa local hiç denenmez', async () => {
    const l = layers({ fish: true, local: true })
    expect(await runTtsLadder('fish', l)).toEqual({ result: AUDIO, servedBy: 'fish' })
    expect(l.local).not.toHaveBeenCalled()
  })

  it('fish düşerse local denenir — ama servis BAŞLATILMAZ (spawn:false)', async () => {
    const l = layers({ fish: false, local: true })
    expect(await runTtsLadder('fish', l)).toEqual({ result: AUDIO, servedBy: 'local' })
    expect(l.local).toHaveBeenCalledWith({ spawn: false })
  })

  it('fish düşer + Chatterbox kapalı → none (istemci tarayıcı TTS)', async () => {
    const l = layers({ fish: false, local: false })
    expect(await runTtsLadder('fish', l)).toEqual({ result: null, servedBy: 'none' })
  })

  it('gemini düşerse de local yalnız ayaktaysa kullanılır', async () => {
    const l = layers({ gemini: false, local: true })
    expect(await runTtsLadder('gemini', l)).toEqual({ result: AUDIO, servedBy: 'local' })
    expect(l.local).toHaveBeenCalledWith({ spawn: false })
  })

  it('kullanıcı local seçtiyse servis gerekirse başlatılır (spawn:true)', async () => {
    const l = layers({ local: true })
    expect(await runTtsLadder('local', l)).toEqual({ result: AUDIO, servedBy: 'local' })
    expect(l.local).toHaveBeenCalledWith({ spawn: true })
    expect(l.fish).not.toHaveBeenCalled()
  })

  it("kaldırılan azure motoru (eski istemci) hiçbir katmanı çağırmaz", async () => {
    const l = layers({ fish: true, local: true })
    expect(await runTtsLadder('azure' as never, l)).toEqual({ result: null, servedBy: 'none' })
    expect(l.local).not.toHaveBeenCalled()
  })

  it('bilinmeyen motor hiçbir katmanı çağırmaz', async () => {
    const l = layers({ fish: true, local: true })
    expect(await runTtsLadder('edge' as never, l)).toEqual({ result: null, servedBy: 'none' })
    expect(l.local).not.toHaveBeenCalled()
    expect(l.fish).not.toHaveBeenCalled()
  })
})
