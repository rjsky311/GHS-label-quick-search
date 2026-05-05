import React from 'react';
import { withTranslation } from 'react-i18next';

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
    const {
      t,
      onReload = () => window.location.reload(),
    } = this.props;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-red-700">
              {t("error.title")}
            </h2>
            <p className="mb-6 text-slate-600">
              {t("error.message")}
            </p>
            <button
              onClick={onReload}
              className="rounded-md bg-blue-700 px-6 py-2 text-white transition-colors hover:bg-blue-800"
            >
              {t("error.reload")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
