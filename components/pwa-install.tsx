"use client";

import { useEffect, useMemo, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation remains optional; avoid interrupting the main product.
      });
    }

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setPromptEvent(null);
      return;
    }

    setShowHelp((current) => !current);
  }

  if (installed) {
    return <span className="status-pill installed">Installed</span>;
  }

  return (
    <div className="install-control">
      <button className="button install-button" type="button" onClick={install}>
        Install Ziepher
      </button>
      {showHelp ? (
        <div className="install-popover" role="status">
          {ios ? (
            <>
              Tap the browser Share button, then choose <strong>Add to Home Screen</strong>.
            </>
          ) : (
            <>
              Open the browser menu and choose <strong>Install Ziepher AI</strong> or
              <strong> Add to home screen</strong>. Desktop installers are also
              published from the release pipeline.
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
