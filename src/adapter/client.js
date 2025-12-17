// Dev mode live-reload client
// Uses Server-Sent Events to detect server restart

if (!window.__ssr_reload) {
  window.__ssr_reload = true;

  (function () {
    // ========================================
    // Settings (persisted in localStorage)
    // ========================================
    const STORAGE_KEY = "_ssr";
    const defaults = {
      autoReload: true,
      highlightIslands: false,
      highlightClients: false,
      position: "bl",
    };

    const loadSettings = () => {
      try {
        return {
          ...defaults,
          ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
        };
      } catch {
        return defaults;
      }
    };

    const saveSettings = (s) =>
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

    let settings = loadSettings();

    // ========================================
    // Component counts from DOM
    // ========================================
    const islandCount = document.querySelectorAll("solid-island").length;
    const clientCount = document.querySelectorAll("solid-client").length;

    // ========================================
    // Highlight styles
    // ========================================
    const style = document.head.appendChild(document.createElement("style"));

    const updateStyles = () => {
      style.textContent = `
        ${
          settings.highlightIslands
            ? `
          solid-island {
            outline: 1px solid #22c55e !important;
            position: relative;
          }
          solid-island::before {
            content: attr(data-file);
            position: absolute;
            top: -17px;
            left: -1px;
            font-size: 10px;
            font-family: monospace;
            color: black;
            background: #22c55e;
            padding: 1px 4px;
            white-space: nowrap;
          }
        `
            : ""
        }
        ${
          settings.highlightClients
            ? `
          solid-client {
            outline: 1px solid #3b82f6 !important;
            position: relative;
          }
          solid-client::before {
            content: attr(data-file);
            position: absolute;
            top: -17px;
            left: -1px;
            font-size: 10px;
            font-family: monospace;
            color: black;
            background: #3b82f6;
            padding: 1px 4px;
            white-space: nowrap;
          }
        `
            : ""
        }
      `;
    };
    updateStyles();

    // ========================================
    // Position logic
    // ========================================
    const positions = {
      tl: {
        badge: { top: "8px", left: "8px", bottom: "", right: "" },
        panel: { top: "32px", left: "8px", bottom: "", right: "" },
      },
      tr: {
        badge: { top: "8px", right: "8px", bottom: "", left: "" },
        panel: { top: "32px", right: "8px", bottom: "", left: "" },
      },
      bl: {
        badge: { bottom: "8px", left: "8px", top: "", right: "" },
        panel: { bottom: "32px", left: "8px", top: "", right: "" },
      },
      br: {
        badge: { bottom: "8px", right: "8px", top: "", left: "" },
        panel: { bottom: "32px", right: "8px", top: "", left: "" },
      },
    };

    const applyPosition = () => {
      const pos = positions[settings.position] || positions.bl;
      Object.assign(badge.style, pos.badge);
      Object.assign(panel.style, pos.panel);
    };

    // ========================================
    // UI Elements
    // ========================================
    const panel = document.body.appendChild(document.createElement("div"));
    panel.innerHTML = `
      <div style="margin-bottom:8px;font-weight:bold">SSR Dev Tools</div>
      <label style="display:block;margin:4px 0;cursor:pointer">
        <input type="checkbox" id="_ssr_reload" ${settings.autoReload ? "checked" : ""}>
        Auto reload
      </label>
      <label style="display:block;margin:4px 0;cursor:pointer">
        <input type="checkbox" id="_ssr_islands" ${settings.highlightIslands ? "checked" : ""}>
        Highlight islands (${islandCount})
      </label>
      <label style="display:block;margin:4px 0;cursor:pointer">
        <input type="checkbox" id="_ssr_clients" ${settings.highlightClients ? "checked" : ""}>
        Highlight clients (${clientCount})
      </label>
      <div style="margin-top:8px;border-top:1px solid #333;padding-top:8px">
        <label style="color:#888">Position:
          <select id="_ssr_position" style="background:#222;color:#ccc;border:1px solid #444;padding:2px;margin-left:4px">
            <option value="tl" ${settings.position === "tl" ? "selected" : ""}>↖ Top Left</option>
            <option value="tr" ${settings.position === "tr" ? "selected" : ""}>↗ Top Right</option>
            <option value="bl" ${settings.position === "bl" ? "selected" : ""}>↙ Bottom Left</option>
            <option value="br" ${settings.position === "br" ? "selected" : ""}>↘ Bottom Right</option>
          </select>
        </label>
      </div>
    `;
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

    // Badge
    const badge = document.body.appendChild(document.createElement("div"));
    badge.innerText = "[ssr]";
    badge.onclick = () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    };
    Object.assign(badge.style, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#555",
      position: "fixed",
      zIndex: "9999",
      cursor: "pointer",
    });

    applyPosition();

    // ========================================
    // Event handlers
    // ========================================
    panel.querySelector("#_ssr_reload").onchange = (e) => {
      settings.autoReload = e.target.checked;
      saveSettings(settings);
    };

    panel.querySelector("#_ssr_islands").onchange = (e) => {
      settings.highlightIslands = e.target.checked;
      saveSettings(settings);
      updateStyles();
    };

    panel.querySelector("#_ssr_clients").onchange = (e) => {
      settings.highlightClients = e.target.checked;
      saveSettings(settings);
      updateStyles();
    };

    panel.querySelector("#_ssr_position").onchange = (e) => {
      settings.position = e.target.value;
      saveSettings(settings);
      applyPosition();
    };

    // ========================================
    // Live reload via SSE
    // ========================================
    let es;
    try {
      es = new EventSource("/_ssr/_reload");
    } catch {
      return;
    }

    es.onerror = (e) => {
      e.preventDefault();
      es.close();
      window.__ssr_reload = false;
      badge.innerText = "[...]";

      if (!settings.autoReload) return;

      const check = setInterval(() => {
        fetch("/_ssr/_ping")
          .then(({ ok }) => {
            if (!ok) return;
            clearInterval(check);
            location.reload();
          })
          .catch(() => {});
      }, 300);
    };

    // Clean up on page unload (for bfcache)
    window.addEventListener("pagehide", () => {
      es.close();
      window.__ssr_reload = false;
    });
  })();
}
