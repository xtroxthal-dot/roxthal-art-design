/* =========================================================
   RoXThal Art Design
   media.js
   Fotos y videos de alumnos y talleres
   ========================================================= */

(function () {
  "use strict";

  const TABLE = "roxthal_talleres_media";

  const state = {
    items: []
  };

  function getSupabase() {
    return window.sb || null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function loadMedia() {
    const sb = getSupabase();

    if (!sb) {
      console.warn("[RoXThal Media] Supabase todavía no está disponible.");
      return [];
    }

    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[RoXThal Media]", error);
      return [];
    }

    state.items = data || [];
    renderMedia();
    return state.items;
  }

  function renderMedia(containerId = "roxthalMediaGallery") {
    const container = document.getElementById(containerId);

    if (!container) return;

    if (!state.items.length) {
      container.innerHTML =
        '<div class="empty-state">Todavía no hay fotos o videos publicados.</div>';
      return;
    }

    container.innerHTML = state.items.map(item => {
      const title = escapeHtml(item.titulo);
      const description = escapeHtml(item.descripcion);
      const category = escapeHtml(item.categoria);
      const url = escapeHtml(item.url);

      const media =
        item.tipo === "video"
          ? `<video src="${url}" controls preload="metadata"></video>`
          : `<img src="${url}" alt="${title}" loading="lazy">`;

      return `
        <article class="roxthal-media-item">
          <div class="roxthal-media-preview">
            ${media}
          </div>

          <div class="roxthal-media-info">
            <h3>${title}</h3>
            <p>${description}</p>
            <span>${category}</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function init() {
    loadMedia();
  }

  window.RoXThalMedia = {
    load: loadMedia,
    render: renderMedia
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
