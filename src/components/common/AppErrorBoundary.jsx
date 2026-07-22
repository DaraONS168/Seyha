import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Application error', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return <div className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-xl"><h1 className="text-xl font-bold text-red-700">ទំព័រមានបញ្ហា</h1><p className="mt-2 text-sm text-slate-600">សូមផ្ញើសារខាងក្រោមទៅអ្នកអភិវឌ្ឍន៍៖</p><pre className="mt-4 overflow-auto rounded-xl bg-red-50 p-4 text-xs text-red-800">{this.state.error.message}</pre><button className="btn-primary mt-4" onClick={() => window.location.reload()}>ផ្ទុកទំព័រឡើងវិញ</button></div></div>
  }
}
