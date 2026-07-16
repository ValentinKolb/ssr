// Dev mode live-reload client
if (!window.__ssr_reload) {
  window.__ssr_reload = true;

  (function () {
    const ssrPath = globalThis.__SSR_CONFIG?.ssrPath || "/_ssr";

    // Settings
    const STORAGE_KEY = `_ssr:${ssrPath}`;
    const defaults = {
      autoReload: true,
      highlightIslands: false,
      highlightClients: false,
      position: "bl",
    };

    const readStorage = (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };
    const writeStorage = (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Dev tools still work when storage is unavailable.
      }
    };
    const load = () => {
      try {
        return {
          ...defaults,
          ...JSON.parse(readStorage(STORAGE_KEY) || "{}"),
        };
      } catch {
        return { ...defaults };
      }
    };
    const save = (s) => writeStorage(STORAGE_KEY, JSON.stringify(s));
    let settings = load();

    // Highlight Styles
    const style = document.head.appendChild(document.createElement("style"));

    const highlightCSS = (tag, color) => `
      ${tag} {
        display: block !important;
        box-shadow: 0 0 0 1px ${color} !important;
        position: relative !important;
      }
      ${tag}::before {
        content: attr(data-file);
        position: absolute;
        top: -17px;
        left: -1px;
        font-size: 10px;
        font-family: monospace;
        color: black;
        background: ${color};
        padding: 1px 4px;
        white-space: nowrap;
      }
    `;

    const updateStyles = () => {
      style.textContent = [
        settings.highlightIslands && highlightCSS("solid-island", "#22c55e"),
        settings.highlightClients && highlightCSS("solid-client", "#3b82f6"),
      ]
        .filter(Boolean)
        .join("");
    };
    updateStyles();

    // Position
    const positions = {
      tl: { top: "8px", left: "8px" },
      tr: { top: "8px", right: "8px" },
      bl: { bottom: "8px", left: "8px" },
      br: { bottom: "8px", right: "8px" },
    };

    const applyPosition = () => {
      const reset = { top: "", bottom: "", left: "", right: "" };
      const pos = positions[settings.position] ?? positions.bl;
      Object.assign(badge.style, reset, pos);
      Object.assign(
        panel.style,
        reset,
        pos,
        pos.top ? { top: "32px" } : { bottom: "32px" },
      );
    };

    // UI
    const islandCount = document.querySelectorAll("solid-island").length;
    const clientCount = document.querySelectorAll("solid-client").length;

    const el = (tag, props = {}, parent = document.body) =>
      Object.assign(parent.appendChild(document.createElement(tag)), props);

    const checkbox = (id, label, checked) => `
      <label style="display:block;margin:4px 0;cursor:pointer">
        <input type="checkbox" id="${id}" ${checked ? "checked" : ""}> ${label}
      </label>
    `;

    const panel = el("div", {
      innerHTML: `
        <div style="margin-bottom:8px;font-weight:bold">SSR Dev Tools</div>
        ${checkbox("_ssr_reload", "Auto reload", settings.autoReload)}
        ${checkbox("_ssr_islands", `Highlight islands (${islandCount})`, settings.highlightIslands)}
        ${checkbox("_ssr_clients", `Highlight clients (${clientCount})`, settings.highlightClients)}
        <div style="margin-top:8px;border-top:1px solid #333;padding-top:8px">
          <label style="color:#888">Position:
            <select id="_ssr_pos" style="background:#222;color:#ccc;border:1px solid #444;padding:2px;margin-left:4px">
              ${Object.keys(positions)
                .map(
                  (p) =>
                    `<option value="${p}" ${settings.position === p ? "selected" : ""}>${p.toUpperCase()}</option>`,
                )
                .join("")}
            </select>
          </label>
        </div>
      `,
    });
    Object.assign(panel.style, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ccc",
      background: "#111",
      padding: "12px",
      border: "1px solid #333",
      borderRadius: "4px",
      position: "fixed",
      zIndex: "9999",
      display: "none",
    });

    const badge = el("div", {
      innerText: "[ssr]",
      onclick: () =>
        (panel.style.display =
          panel.style.display === "none" ? "block" : "none"),
    });
    Object.assign(badge.style, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#555",
      position: "fixed",
      zIndex: "9999",
      cursor: "pointer",
    });

    applyPosition();

    // Event Handlers
    const bind = (id, key, onChange) => {
      panel.querySelector(`#${id}`).onchange = (e) => {
        settings[key] =
          e.target.type === "checkbox" ? e.target.checked : e.target.value;
        save(settings);
        onChange?.();
      };
    };

    bind("_ssr_islands", "highlightIslands", updateStyles);
    bind("_ssr_clients", "highlightClients", updateStyles);
    bind("_ssr_pos", "position", applyPosition);

    // Live Reload (SSE)
    const reloadId = globalThis.__SSR_CONFIG?.reloadId;
    const reloadIdKey = `${STORAGE_KEY}:reload-id`;
    const reloadLockName = `${STORAGE_KEY}:reload-lock`;
    let es, retryTimer, retryController, animationInterval;
    let lockController, releaseLock;
    let retryAttempt = 0;
    let retryGeneration = 0;
    let ownsLock = false;
    let pageActive = true;
    let reloadRequested = false;
    const spinFrames = ["[ / ]", "[ – ]", "[ \\ ]", "[ | ]"];
    let spinIndex = 0;

    // A fresh document already represents this server generation. Publishing
    // it first wakes stale tabs without making the fresh document reload.
    if (reloadId) writeStorage(reloadIdKey, reloadId);

    const stopAnimation = () => {
      clearInterval(animationInterval);
      animationInterval = null;
    };

    const startAnimation = () => {
      if (animationInterval) return;
      spinIndex = 0;
      animationInterval = setInterval(() => {
        badge.innerText = spinFrames[spinIndex++ % spinFrames.length];
      }, 150);
    };

    const shouldParticipate = () =>
      pageActive &&
      !reloadRequested &&
      settings.autoReload &&
      document.visibilityState === "visible";
    const canConnect = () => shouldParticipate() && ownsLock;

    const closeSource = () => {
      const source = es;
      es = null;
      source?.close();
    };

    const cancelRetry = () => {
      retryGeneration += 1;
      clearTimeout(retryTimer);
      retryTimer = null;
      const controller = retryController;
      retryController = null;
      controller?.abort();
    };

    const stopConnection = () => {
      closeSource();
      cancelRetry();
      retryAttempt = 0;
      stopAnimation();
      badge.innerText = "[ssr]";
    };

    const releaseLeadership = () => {
      const pendingLock = lockController;
      lockController = null;
      pendingLock?.abort();

      const release = releaseLock;
      releaseLock = null;
      ownsLock = false;
      release?.();
      stopConnection();
    };

    const requestReload = () => {
      if (reloadRequested) return;
      reloadRequested = true;
      releaseLeadership();
      location.reload();
    };

    const acceptReloadId = (nextReloadId) => {
      if (!nextReloadId) return;
      writeStorage(reloadIdKey, nextReloadId);
      if (reloadId && nextReloadId !== reloadId) requestReload();
    };

    const retryDelay = () =>
      Math.min(2_000, 300 * 2 ** Math.min(retryAttempt, 3));

    const scheduleRetry = () => {
      if (!canConnect() || retryTimer || retryController) return;

      const generation = retryGeneration;
      retryTimer = setTimeout(async () => {
        retryTimer = null;
        if (generation !== retryGeneration || !canConnect()) return;

        const controller = new AbortController();
        retryController = controller;
        try {
          const response = await fetch(`${ssrPath}/_ping`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.ok && canConnect()) {
            acceptReloadId(response.headers.get("X-SSR-Reload-ID"));
            if (!reloadRequested) requestReload();
            return;
          }
        } catch {
          // A stopped or unavailable dev server is expected during reload.
        } finally {
          if (retryController === controller) retryController = null;
        }

        if (generation !== retryGeneration || !canConnect()) return;
        retryAttempt += 1;
        scheduleRetry();
      }, retryDelay());
    };

    const startRetry = () => {
      if (!canConnect()) return;
      startAnimation();
      scheduleRetry();
    };

    const start = () => {
      if (!canConnect() || es || retryTimer || retryController) return;

      let source;
      try {
        source = new EventSource(`${ssrPath}/_reload`);
        es = source;
        stopAnimation();
        badge.innerText = "[ssr]";
      } catch {
        startRetry();
        return;
      }

      source.onopen = () => {
        if (es !== source) return;
        retryAttempt = 0;
        stopAnimation();
        badge.innerText = "[ssr]";
      };

      source.onmessage = (event) => {
        if (es !== source) return;
        acceptReloadId(event.data);
      };

      source.onerror = (event) => {
        if (es !== source) return;
        event.preventDefault();
        closeSource();
        retryAttempt = 0;
        startRetry();
      };
    };

    const requestLeadership = () => {
      if (!shouldParticipate()) return;
      if (ownsLock) {
        start();
        return;
      }
      if (lockController) return;

      if (!navigator.locks?.request) {
        ownsLock = true;
        start();
        return;
      }

      const controller = new AbortController();
      lockController = controller;
      void navigator.locks
        .request(
          reloadLockName,
          { mode: "exclusive", signal: controller.signal },
          async () => {
            if (lockController === controller) lockController = null;
            if (controller.signal.aborted || !shouldParticipate()) return;

            ownsLock = true;
            start();
            await new Promise((resolve) => {
              releaseLock = resolve;
            });
            releaseLock = null;
            ownsLock = false;
            stopConnection();
          },
        )
        .catch((error) => {
          if (lockController === controller) lockController = null;
          if (error?.name === "AbortError" || !shouldParticipate()) return;

          // If Web Locks is unavailable at runtime, retain per-tab behavior.
          ownsLock = true;
          start();
        });
    };

    const syncConnection = () => {
      const knownReloadId = readStorage(reloadIdKey);
      if (
        shouldParticipate() &&
        reloadId &&
        knownReloadId &&
        knownReloadId !== reloadId
      ) {
        requestReload();
        return;
      }

      if (shouldParticipate()) requestLeadership();
      else releaseLeadership();
    };

    syncConnection();

    panel.querySelector("#_ssr_reload").onchange = (e) => {
      settings.autoReload = e.target.checked;
      save(settings);
      syncConnection();
    };

    document.addEventListener("visibilitychange", syncConnection);
    window.addEventListener("storage", (event) => {
      if (event.key !== reloadIdKey || !event.newValue) return;
      if (reloadId && event.newValue !== reloadId && shouldParticipate()) {
        requestReload();
      }
    });
    window.addEventListener("pagehide", () => {
      pageActive = false;
      releaseLeadership();
    });
    window.addEventListener("pageshow", () => {
      pageActive = true;
      reloadRequested = false;
      syncConnection();
    });
  })();
}
