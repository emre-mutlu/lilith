import { describe, expect, it, vi } from 'vitest'
import { retryKind, withRetry, withModelFallback, DEFAULT_RETRY } from './dialogue'

// @google/genai v2 ApiError biçimi: message = JSON gövde, status = HTTP kodu
const apiError = (status: number, body: string) => Object.assign(new Error(body), { status })
const E503 = () => apiError(503, '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}')
const E429 = () => apiError(429, '{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}')
const E400 = () => apiError(400, '{"error":{"code":400,"message":"Invalid argument","status":"INVALID_ARGUMENT"}}')

/** Sırayla hata/başarı döndüren sahte çağrı */
function scripted<T>(steps: Array<Error | T>) {
  let i = 0
  return vi.fn(async () => {
    const s = steps[Math.min(i++, steps.length - 1)]
    if (s instanceof Error) throw s
    return s
  })
}

describe('retryKind', () => {
  it('429 / RESOURCE_EXHAUSTED → rate', () => {
    expect(retryKind(E429())).toBe('rate')
    expect(retryKind(new Error('got 429 Too Many Requests'))).toBe('rate')
  })
  it('503 / UNAVAILABLE / high demand → overload', () => {
    expect(retryKind(E503())).toBe('overload')
    expect(retryKind(new Error('model overloaded, try later'))).toBe('overload')
  })
  it('HTTP kodu varsa tek ölçüt odur (gövdedeki kelimeye bakılmaz)', () => {
    expect(retryKind(apiError(400, '{"error":{"message":"model unavailable in region","status":"FAILED_PRECONDITION"}}'))).toBeNull()
  })
  it('diğer hatalar yeniden denenmez', () => {
    expect(retryKind(E400())).toBeNull()
    expect(retryKind(new Error('boş text'))).toBeNull()
    expect(retryKind('4290 token')).toBeNull()
  })
})

describe('withRetry', () => {
  it("503'te kısa geri çekilme (2s, 5s) ile tekrar dener", async () => {
    const wait = vi.fn(async (_ms: number) => {})
    const fn = scripted([E503(), E503(), 'ok'])
    expect(await withRetry(fn, DEFAULT_RETRY, wait)).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(wait.mock.calls.map(c => c[0])).toEqual([2_000, 5_000])
  })

  it('429 uzun bekler (35s) — politika aynen korunur', async () => {
    const wait = vi.fn(async (_ms: number) => {})
    const fn = scripted([E429(), 'ok'])
    expect(await withRetry(fn, DEFAULT_RETRY, wait)).toBe('ok')
    expect(wait.mock.calls.map(c => c[0])).toEqual([35_000])
  })

  it('denemeler tükenince son hatayı fırlatır (503: en fazla 3 çağrı)', async () => {
    const wait = vi.fn(async (_ms: number) => {})
    const fn = scripted([E503()])
    await expect(withRetry(fn, DEFAULT_RETRY, wait)).rejects.toThrow('high demand')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('yeniden denenmeyen hata anında fırlar, beklemez', async () => {
    const wait = vi.fn(async (_ms: number) => {})
    const fn = scripted([E400(), 'ok'])
    await expect(withRetry(fn, DEFAULT_RETRY, wait)).rejects.toThrow('Invalid argument')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })

  it('429 en kötü durumda tek katmanda 70s bekler (eski çift sarma ~280s idi)', async () => {
    const wait = vi.fn(async (_ms: number) => {})
    await expect(withRetry(scripted([E429()]), DEFAULT_RETRY, wait)).rejects.toThrow()
    expect(wait.mock.calls.reduce((a, c) => a + c[0], 0)).toBe(70_000)
  })
})

describe('withModelFallback', () => {
  const wait = async () => {}

  it('yedek zincir boşsa birincil modelin hatası aynen döner', async () => {
    const call = vi.fn(async (_m: string): Promise<string> => { throw E503() })
    await expect(withModelFallback(['pin'], call, DEFAULT_RETRY, wait)).rejects.toThrow('high demand')
    expect(call.mock.calls.every(c => c[0] === 'pin')).toBe(true)
  })

  it("birincil 503'te tükenirse yedek modele geçer ve hangi modelin ürettiğini bildirir", async () => {
    const call = vi.fn(async (m: string) => { if (m === 'pin') throw E503(); return `from:${m}` })
    expect(await withModelFallback(['pin', 'yedek'], call, DEFAULT_RETRY, wait))
      .toEqual({ result: 'from:yedek', model: 'yedek' })
    expect(call.mock.calls.filter(c => c[0] === 'pin')).toHaveLength(3)
  })

  it("429 yedeğe geçirmez (kota başka modele kaçarak çözülmez)", async () => {
    const call = vi.fn(async (m: string) => { if (m === 'pin') throw E429(); return 'x' })
    await expect(withModelFallback(['pin', 'yedek'], call, DEFAULT_RETRY, wait)).rejects.toThrow('Quota')
    expect(call.mock.calls.some(c => c[0] === 'yedek')).toBe(false)
  })

  it('tekrarlanan / boş model adları zincirden ayıklanır', async () => {
    const call = vi.fn(async (m: string) => m)
    expect(await withModelFallback(['pin', '', 'pin'], call, DEFAULT_RETRY, wait)).toEqual({ result: 'pin', model: 'pin' })
  })
})
