import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-red-400">error</span>
          <h1 className="text-lg font-bold text-text">Algo salió mal</h1>
          <p className="text-sm text-text-secondary">Recargá la página para continuar.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
