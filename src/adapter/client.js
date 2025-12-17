// Dev mode live-reload client
// Uses Server-Sent Events to detect server restart

if (!window.__ssr_reload) {
  window.__ssr_reload = true;

  // Tooltip
  const tooltip = document.body.appendChild(
    Object.assign(document.createElement("div"), {
      innerHTML: `
        auto refresh enabled
        <br/><br/>
        to disable, add to config
        <br/>
        { autoRefresh: false }
      `,
    }),
  );
  Object.assign(tooltip.style, {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#888",
    background: "#000",
    padding: "8px",
    border: "1px solid #333",
    position: "fixed",
    bottom: "28px",
    left: "8px",
    zIndex: "9999",
    display: "none",
  });

  // Badge
  const badge = document.body.appendChild(
    Object.assign(document.createElement("div"), {
      innerText: "[ssr]",
      onmouseenter: () => (tooltip.style.display = "block"),
      onmouseleave: () => (tooltip.style.display = "none"),
    }),
  );
  Object.assign(badge.style, {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#555",
    position: "fixed",
    bottom: "8px",
    left: "8px",
    zIndex: "9999",
    cursor: "default",
  });

  const es = new EventSource("/_ssr/_reload");

  es.onerror = () => {
    es.close();
    window.__ssr_reload = false;
    badge.innerText = "[...]";

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
}
