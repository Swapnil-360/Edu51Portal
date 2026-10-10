import { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error('[RootErrorBoundary]', e, info); }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ maxWidth:'560px', width:'100%', background:'#1e293b', borderRadius:'16px', padding:'24px', border:'1px solid #334155', color:'#f1f5f9', fontFamily:'sans-serif' }}>
            <h2 style={{ color:'#f87171', marginBottom:'8px', fontSize:'16px' }}>Something crashed</h2>
            <p style={{ color:'#94a3b8', fontSize:'13px', marginBottom:'12px' }}>{e.message}</p>
            <pre style={{ background:'#0f172a', borderRadius:'8px', padding:'12px', fontSize:'11px', color:'#7dd3fc', overflow:'auto', maxHeight:'200px' }}>{e.stack}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop:'16px', padding:'8px 20px', background:'#3b82f6', border:'none', borderRadius:'8px', color:'white', cursor:'pointer', fontSize:'13px' }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

// Suppress browser extension errors (e.g. Floto widget, translation tools, ad blockers)
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  const file = event.filename || '';
  if (
    msg.includes('Could not establish connection') || 
    msg.includes('Receiving end does not exist') ||
    msg.includes('Extension context invalidated') ||
    msg.includes('unload is not allowed') ||
    file.includes('chrome-extension') ||
    file.includes('moz-extension') ||
    file.includes('content-all.js') ||
    file.includes('content-DS2BZpGT.js') ||
    file.includes('jquery.js')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reasonMsg = event.reason?.message || (typeof event.reason === 'string' ? event.reason : '');
  if (
    reasonMsg.includes('Could not establish connection') || 
    reasonMsg.includes('Receiving end does not exist') ||
    reasonMsg.includes('Extension context invalidated') ||
    reasonMsg.includes('unload is not allowed')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
});

// ── Google OAuth popup handler ────────────────────────────────────────
// Only intercept when we are EXACTLY on the oauth2callback path with a token.
// This prevents the condition from firing on any other route (e.g. /admin).
const _isOAuthPopup = (
  window.location.pathname === '/oauth2callback' &&
  window.location.hash.includes('access_token=') &&
  !!window.opener
);

if (_isOAuthPopup) {
  const _p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  try {
    window.opener.postMessage(
      { type: 'GDRIVE_OAUTH_SUCCESS', token: _p.get('access_token'), expiresIn: _p.get('expires_in') },
      window.location.origin,
    );
  } catch { /* ignore cross-origin errors */ }
  window.close();
} else {
  // Normal app render
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
        {import.meta.env.PROD ? <SpeedInsights /> : null}
        {import.meta.env.PROD ? <Analytics /> : null}
      </RootErrorBoundary>
    </StrictMode>
  );
}

