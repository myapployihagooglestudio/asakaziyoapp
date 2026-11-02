import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ASAKA ZIYO — Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('asaka_ziyo_prayer_schedule');
      localStorage.removeItem('asaka_ziyo_favorites');
      localStorage.removeItem('asaka_ziyo_settings');
    } catch (e) {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#071614] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl border border-[#c5a869]/30 bg-[#0d211e] text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#c5a869] mx-auto flex items-center justify-center text-xl font-bold">
              !
            </div>
            <h2 className="text-xl font-display font-bold text-white">
              Tizimni yuklashda xatolik yuz berdi
            </h2>
            <p className="text-xs text-stone-300 leading-relaxed">
              Ilova holatini qayta tiklash uchun quyidagi tugmani bosing. Shaxsiy sozlamalar xavfsiz holda qayta yuklanadi.
            </p>
            {this.state.error && (
              <pre className="p-3 rounded-lg bg-black/40 text-[11px] font-mono text-amber-200 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#c5a869] to-[#b38f46] text-[#071614] font-semibold text-xs transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            >
              Ilovani qayta ishga tushirish
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
