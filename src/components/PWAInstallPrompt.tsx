import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWAInstallPrompt — shows an install banner when the browser
 * fires the beforeinstallprompt event (Chrome/Edge on desktop & mobile).
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
      <Download size={18} className="text-primary-2" />
      <span className="text-xs font-medium">安装应用以获得更好体验</span>
      <button
        onClick={handleInstall}
        className="rounded-lg bg-primary px-3 py-1 text-[11px] font-bold text-white hover:bg-primary/90"
      >安装</button>
      <button onClick={() => setDismissed(true)} aria-label="关闭" className="text-text-3 hover:text-text">
        <X size={14} />
      </button>
    </div>
  );
}
