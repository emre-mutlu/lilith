import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Tek bir render hatası sahneyi boş ekrana çevirmesin: hatayı göster, sesi sustur,
 *  yeniden yükleme sun. Ambiyans App'in unmount temizliğiyle zaten kapanır. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render hatası:', error, info.componentStack)
    try { window.speechSynthesis?.cancel() } catch {}
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14,
        alignItems: 'center', justifyContent: 'center', background: '#050505',
        fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.7)',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#D4AF37' }}>SAHNE ÇÖKTÜ</div>
        <div style={{ fontSize: 11, maxWidth: 520, opacity: 0.6 }}>{this.state.error.message}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'transparent', border: '1px solid rgba(212,175,55,0.45)', color: '#D4AF37',
            fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.15em',
            padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
          }}
        >YENİDEN YÜKLE</button>
      </div>
    )
  }
}
