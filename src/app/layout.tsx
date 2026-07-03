import type { Metadata } from 'next';
import '@/styles/tec-design-tokens.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title:       'TEC Analytics',
  description: 'TEC Analytics — Economic Intelligence for the Pi Network ecosystem',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        {/* Global reset — full-bleed dark background (parity with Commerce/Assets).
            Without it the browser's default body margin shows a white frame
            around the dark app. */}
        <style>{`
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; width: 100%; background: #050816; }
          body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
        `}</style>
        <script
          src="https://sdk.minepi.com/pi-sdk.js"
          async
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var tries = 0;
              function setReady(){ window.__TEC_PI_READY = true; window.dispatchEvent(new Event('tec-pi-ready')); }
              function initPi(){
                if (tries++ > 40) { window.__TEC_PI_ERROR = true; window.dispatchEvent(new Event('tec-pi-error')); return; }
                // ADR-007/C-12 §3: Hub-entered = Hub owns this Pi Browser session.
                // Never Pi.init() here (it poisons the session and breaks the Hub
                // PaymentModal / Mode-2). The SSO landing persists the flag;
                // referrer covers direct hub->app hops.
                try {
                  if (sessionStorage.getItem('__tec_hub_entry') === '1' ||
                      document.referrer.toLowerCase().indexOf('hub.tecosystem.app') !== -1) {
                    window.__TEC_PI_FOREIGN_SESSION = true; setReady(); return;
                  }
                } catch(e) {}
                if (typeof window.Pi === 'undefined') { setTimeout(initPi, 150); return; }
                try {
                  // appId is redundant when the domain is Portal-registered, but
                  // the other apps pass it — kept for parity/robustness.
                  window.Pi.init({ version: '2.0', sandbox: ${process.env.NEXT_PUBLIC_PI_SANDBOX === 'true'}, appId: '${process.env.NEXT_PUBLIC_PI_APP_ID ?? ''}' });
                  setReady();
                } catch(e) {
                  var msg = String(e).toLowerCase();
                  // Pi already initialized by another app (e.g. the Hub) in this
                  // Pi Browser session → foreign session, force Mode 1.
                  if (msg.indexOf('already') !== -1 || msg.indexOf('initialized') !== -1) {
                    window.__TEC_PI_FOREIGN_SESSION = true; setReady();
                  } else { setTimeout(initPi, 150); }
                }
              }
              initPi();
            })();`,
          }}
        />
      </head>
      <body><ErrorBoundary>{children}</ErrorBoundary></body>
    </html>
  );
}
