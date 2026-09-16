import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"
          style={{ background: '#FBF7EE', fontFamily: "'Tajawal', sans-serif" }}>
          <div className="p-8 max-w-md w-full text-center"
            style={{ background: '#FFFFFF', border: '1px solid #E8E2D4', borderRadius: 18 }}>
            <span aria-hidden style={{
              width: 64, height: 64, borderRadius: 18, background: '#FBF7EE', color: '#C2410C',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <AlertCircle size={30} />
            </span>
            <h1 className="font-extrabold mb-2" style={{ fontSize: '1.5rem', color: '#2A2438', marginTop: 0 }}>حدث خطأ غير متوقع</h1>
            <p className="text-sm mb-6" style={{ color: '#756E85' }}>
              نعتذر عن هذا الخطأ. يرجى إعادة تحميل الصفحة أو العودة للرئيسية.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 text-sm inline-flex items-center gap-2"
                style={{
                  minHeight: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: '#177B58', color: '#fff', fontWeight: 800,
                }}
              >
                <RefreshCw size={15} aria-hidden />
                إعادة التحميل
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-5 text-sm"
                style={{
                  minHeight: 48, borderRadius: 12, cursor: 'pointer',
                  border: '1px solid #E8E2D4', background: '#FFFFFF', color: '#2A2438', fontWeight: 800,
                }}
              >
                الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
