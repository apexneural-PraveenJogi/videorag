import { Component } from 'react'

// Catches render-time crashes anywhere below it so a single bad component
// can't blank the whole app (the failure class we hit with an unstable store
// selector). Shows a recoverable fallback instead of a white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface the stack in the console for debugging.
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-ink-900 px-6 text-center">
          <div className="text-[0.75rem] font-medium uppercase tracking-eyebrow text-amber-500">
            Something broke
          </div>
          <h1 className="text-2xl font-bold text-mist-100">
            The page hit an unexpected error
          </h1>
          <p className="max-w-md text-sm text-mist-300">
            It’s been logged to the console. Reloading usually clears it.
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-pill bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Reload
            </button>
            <a
              href="/"
              className="rounded-pill border-[1.5px] border-mist-100 px-5 py-2.5 text-sm font-medium text-mist-100 transition-colors hover:bg-mist-100 hover:text-white"
            >
              Back home
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
