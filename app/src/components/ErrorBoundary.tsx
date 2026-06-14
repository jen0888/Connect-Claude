import { Component, type ErrorInfo, type ReactNode } from 'react'

/** App-wide error boundary — turns a render crash into a visible message instead
 *  of a silent blank screen (React unmounts the whole tree on an uncaught throw).
 *  Shows the error + stack so failures are diagnosable in the running app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] render crash', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{ minHeight: '100dvh', padding: 24, background: '#F4F0E8', color: '#1a1a1a', fontFamily: 'system-ui, sans-serif', overflow: 'auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Something broke on this screen</h1>
        <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 16px' }}>The error below is what crashed the page — share it to get it fixed.</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, background: '#fff', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 12, padding: 14, margin: '0 0 16px' }}>
          {error.name}: {error.message}
          {error.stack ? '\n\n' + error.stack : ''}
        </pre>
        <button
          type="button"
          onClick={() => { this.setState({ error: null }); location.href = '/home' }}
          style={{ borderRadius: 999, border: 'none', background: '#C76A48', color: '#F4F0E8', padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Reload home
        </button>
      </div>
    )
  }
}
