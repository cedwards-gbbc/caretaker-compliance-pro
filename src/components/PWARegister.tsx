"use client";

import { useEffect, useState } from "react";

export default function PWARegister() {
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Fail silently. App still works without offline cache.
      });
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && !isStandalone) {
      const dismissed = localStorage.getItem("pwa-install-help-dismissed");
      if (!dismissed) setShowInstallHelp(true);
    }
  }, []);

  if (!showInstallHelp) return null;

  return (
    <div className="install-help">
      <div>
        <strong>Install this app on your phone</strong>
        <p>
          iPhone: tap Share → Add to Home Screen. Android: tap menu → Install app.
        </p>
      </div>
      <button
        className="secondary"
        onClick={() => {
          localStorage.setItem("pwa-install-help-dismissed", "1");
          setShowInstallHelp(false);
        }}
      >
        Hide
      </button>
    </div>
  );
}
