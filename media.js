(function () {
  "use strict";

  const TABLE = "roxthal_talleres_media";
  const BUCKET = "images";

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

  function normalizeType(value) {
    const type = String(value || "").toLowerCase().trim();

    if (
      type === "video" ||
      type === "videos" ||
      type.startsWith("video/")
    ) {
      return "video";
    }

    return "foto";
  }

  function getFileType(file) {
    if (!file || !file.type) return null;

    if (file.type.startsWith("video/")) {
      return "video";
    }

    if (file.type.startsWith("image/")) {
      return "foto";
    }

    return null;
  }

  async function loadMedia() {
    const sb = getSupabase();

    if (!sb) {
      console.warn("[RoXThal Media] Supabase no está disponible.");
      return [];
    }

    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[RoXThal Media] Error cargando:", error);
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
      container.innerHTML = `
        <div class="empty-state">
          Todavía no hay fotos o videos publicados.
        </div>
      `;
      return;
    }

    container.innerHTML = state.items.map(item => {
      const title = escapeHtml(item.titulo);
      const description = escapeHtml(item.descripcion);
      const category = escapeHtml(item.categoria);
      const url = escapeHtml(item.url);

      const tipo = normalizeType(item.tipo);

      const media = tipo === "video"
        ? `
          <video
            src="${url}"
            controls
            preload="metadata"
            playsinline>
          </video>
        `
        : `
          <img
            src="${url}"
            alt="${title}"
            loading="lazy">
        `;

      return `
        <article class="roxthal-media-item">
          <div class="roxthal-media-preview">
            ${media}
          </div>

          <div class="roxthal-media-info">
            <h3>${title}</h3>

            ${
              description
                ? `<p>${description}</p>`
                : ""
            }

            ${
              category
                ? `<span class="roxthal-media-category">${category}</span>`
                : ""
            }
          </div>
        </article>
      `;
    }).join("");
  }

  async function uploadMedia(file, options = {}) {
    const sb = getSupabase();

    if (!sb) {
      throw new Error("Supabase no está disponible.");
    }

    if (!file) {
      throw new Error("No se seleccionó ningún archivo.");
    }

    const tipo = getFileType(file);

    if (!tipo) {
      throw new Error("El archivo debe ser una imagen o un video.");
    }

    const timestamp = Date.now();

    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-");

    const path = `talleres/${timestamp}-${safeName}`;

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error(
        "[RoXThal Media] Error subiendo:",
        uploadError
      );

      throw uploadError;
    }

    const { data: publicData } = sb.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl || "";

    const { data, error } = await sb
      .from(TABLE)
      .insert({
        titulo: options.titulo || file.name,
        descripcion: options.descripcion || "",
        categoria: options.categoria || "talleres",
        tipo: tipo,
        storage_path: path,
        url: publicUrl
      })
      .select()
      .single();

    if (error) {
      console.error(
        "[RoXThal Media] Error registrando:",
        error
      );

      await sb.storage
        .from(BUCKET)
        .remove([path]);

      throw error;
    }

    await loadMedia();

    return data;
  }

  async function deleteMedia(id) {
    const sb = getSupabase();

    if (!sb) {
      throw new Error("Supabase no está disponible.");
    }

    const item = state.items.find(
      entry => String(entry.id) === String(id)
    );

    if (!item) {
      throw new Error("Contenido no encontrado.");
    }

    if (item.storage_path) {
      await sb.storage
        .from(BUCKET)
        .remove([item.storage_path]);
    }

    const { error } = await sb
      .from(TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    await loadMedia();

    return true;
  }

  window.RoXThalMedia = {
    load: loadMedia,
    render: renderMedia,
    upload: uploadMedia,
    remove: deleteMedia
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      loadMedia
    );
  } else {
    loadMedia();
  }

})();
