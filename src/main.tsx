import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Configure status bar BEFORE app renders
async function configureStatusBar() {
  try {
    const isNative = typeof (window as any).Capacitor !== 'undefined' &&
      (window as any).Capacitor.isNativePlatform?.() === true;
    if (!isNative) return;

    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: '#161b22' });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.show();
    console.log('[Main] StatusBar configured');
  } catch (err) {
    console.warn('[Main] StatusBar config failed:', err);
  }
}

configureStatusBar();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
