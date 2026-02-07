import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="bg-slate-800 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
            <h2 className="text-xl font-bold text-red-400 mb-4">
              應用程式發生錯誤
            </h2>
            <p className="text-slate-300 mb-6">
              請重新整理頁面。如果問題持續發生，請聯繫管理員。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
            >
              重新整理
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
