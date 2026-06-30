import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/lib/i18n'; // must import before rendering — registers i18next + auto-detects language
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import { AppProvider } from '@/store/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/components/theme-provider';
import { PlayerProvider } from '@/components/GlobalPlayer';
import { PlaylistProvider } from '@/contexts/PlaylistContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

// ── Global Error Boundary ────────────────────────────────────────────────────
interface EBState { error: Error | null }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[WANKONG] Render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0B0814',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ color: '#00D9FF', fontSize: 48 }}>⚠</div>
          <h1 style={{ color: '#ffffff', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', maxWidth: 420, margin: 0 }}>
            {error.message || 'An unexpected error occurred. Please reload the page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: '10px 28px',
              background: '#9D4EDD',
              color: '#ffffff',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── PWA Service Worker ───────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* SW unavailable in dev */ });
  });
}

// ── Mount ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="dark" storageKey="wankong-theme">
            <AuthProvider>
              <SubscriptionProvider>
                <AppProvider>
                  <CartProvider>
                    <PlayerProvider>
                      <PlaylistProvider>
                        <App />
                        <Toaster position="top-right" richColors closeButton />
                      </PlaylistProvider>
                    </PlayerProvider>
                  </CartProvider>
                </AppProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
