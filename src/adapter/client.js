// Dev mode live-reload client
if (!window.__ssr_reload) {
  window.__ssr_reload = true;

  (function () {
    // ========================================
    // Settings
    // ========================================
    const STORAGE_KEY = "_ssr";
    const defaults = {
      autoReload: true,
      highlightIslands: false,
      highlightClients: false,
      position: "bl",
    };

    const load = () => ({
      ...defaults,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
    });
    const save = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    let settings = load();

    // ========================================
    // Highlight Styles
    // ========================================
    const style = document.head.appendChild(document.createElement("style"));

    const highlightCSS = (tag, color) => `
      ${tag} {
        display: block;
        box-shadow: 0 0 0 1px ${color} !important;
        position: relative;
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

    // ========================================
    // Position
    // ========================================
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

    // ========================================
    // UI
    // ========================================
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

    // ========================================
    // Event Handlers
    // ========================================
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

    // ========================================
    // Live Reload (SSE)
    // ========================================
    let es, interval;

    const stop = () => {
      es?.close();
      es = null;
      clearInterval(interval);
      interval = null;
    };

    const start = () => {
      if (es) return;
      try {
        es = new EventSource("/_ssr/_reload");
        badge.innerText = "[ssr]";
      } catch {
        return;
      }

      es.onerror = (e) => {
        e.preventDefault();
        stop();
        badge.innerText = "[...]";
        if (!settings.autoReload) return;
        interval = setInterval(() => {
          fetch("/_ssr/_ping")
            .then((r) => r.ok && location.reload())
            .catch(() => {});
        }, 300);
      };
    };

    if (settings.autoReload) start();

    panel.querySelector("#_ssr_reload").onchange = (e) => {
      settings.autoReload = e.target.checked;
      save(settings);
      settings.autoReload ? start() : stop();
    };

    window.addEventListener("pagehide", stop);
  })();
}
