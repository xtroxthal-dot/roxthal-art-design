/* =========================================================
   RoXThal Art Design
   NUEVA APP — app.js
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const CONFIG = {
    search: {
      tattoos:
        "https://www.google.com/search?tbm=isch&q=",
      artists:
        "https://www.google.com/search?tbm=isch&q="
    },

    courses: {
      dibujo: {
        title: "Dibujo y pintura",
        description:
          "Formación artística orientada al desarrollo del dibujo, pintura, composición y expresión personal."
      },

      infantil: {
        title: "Curso infantil",
        description:
          "Actividades de dibujo y pintura adaptadas para estimular la creatividad y el desarrollo artístico."
      },

      tatuaje: {
        title: "Iniciación al tatuaje",
        description:
          "Introducción progresiva al mundo del tatuaje, diseño, herramientas, higiene y fundamentos técnicos."
      }
    }
  };

  /* =======================================================
     UTILIDADES
     ======================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const escapeHTML = (value) => {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  };

  const safeJSON = (value, fallback = null) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  /* =======================================================
     AÑO
     ======================================================= */

  function initYear() {
    const year = $("#currentYear");

    if (year) {
      year.textContent = new Date().getFullYear();
    }
  }

  /* =======================================================
     MENÚ MÓVIL
     ======================================================= */

  function initMenu() {
    const toggle = $("#menuToggle");
    const nav = $("#mainNav");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");

      toggle.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    });

    $$("#mainNav a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");

        toggle.setAttribute(
          "aria-expanded",
          "false"
        );
      });
    });

    document.addEventListener("click", (event) => {
      if (
        nav.classList.contains("open") &&
        !nav.contains(event.target) &&
        !toggle.contains(event.target)
      ) {
        nav.classList.remove("open");

        toggle.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    });
  }

  /* =======================================================
     MODAL
     ======================================================= */

  function initModal() {
    const modal = $("#appModal");
    const body = $("#modalBody");
    const close = $("#modalClose");
    const overlay = $(".modal-overlay");

    if (!modal || !body || !close) return;

    const openModal = (html) => {
      body.innerHTML = html;

      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");

      document.body.classList.add("modal-open");

      close.focus();
    };

    const closeModal = () => {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");

      document.body.classList.remove("modal-open");

      body.innerHTML = "";
    };

    close.addEventListener("click", closeModal);

    if (overlay) {
      overlay.addEventListener("click", closeModal);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    $$("[data-course]").forEach((button) => {
      button.addEventListener("click", () => {
        const courseId =
          button.dataset.course;

        const course =
          CONFIG.courses[courseId];

        if (!course) return;

        openModal(`
          <span class="eyebrow">CURSO</span>
          <h2>${escapeHTML(course.title)}</h2>
          <p>${escapeHTML(course.description)}</p>

          <div style="margin-top:24px;">
            <a
              href="#contacto"
              class="btn btn-primary"
              id="modalContactButton"
            >
              Consultar
            </a>
          </div>
        `);

        const contactButton =
          $("#modalContactButton");

        if (contactButton) {
          contactButton.addEventListener(
            "click",
            closeModal
          );
        }
      });
    });
  }

  /* =======================================================
     BUSCADOR DE TATUAJES
     ======================================================= */

  function initTattooSearch() {
    const form = $("#tattooSearchForm");
    const input = $("#tattooSearch");

    if (!form || !input) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const query = input.value.trim();

      if (!query) {
        input.focus();
        return;
      }

      const url =
        CONFIG.search.tattoos +
        encodeURIComponent(
          `${query} tattoo`
        );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    });
  }

  /* =======================================================
     BUSCADOR DE ARTISTAS
     ======================================================= */

  function initArtistSearch() {
    const form = $("#artistSearchForm");
    const input = $("#artistSearch");

    if (!form || !input) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const query = input.value.trim();

      if (!query) {
        input.focus();
        return;
      }

      const url =
        CONFIG.search.artists +
        encodeURIComponent(
          `${query} art painting artist`
        );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    });
  }

  /* =======================================================
     SUPABASE
     ======================================================= */

  function getSupabaseClient() {
    if (
      typeof window.supabase === "undefined"
    ) {
      return null;
    }

    const url =
      window.ROXTHAL_SUPABASE_URL ||
      localStorage.getItem(
        "ROXTHAL_SUPABASE_URL"
      );

    const key =
      window.ROXTHAL_SUPABASE_ANON_KEY ||
      localStorage.getItem(
        "ROXTHAL_SUPABASE_ANON_KEY"
      );

    if (!url || !key) {
      return null;
    }

    try {
      return window.supabase.createClient(
        url,
        key
      );
    } catch (error) {
      console.error(
        "No se pudo inicializar Supabase:",
        error
      );

      return null;
    }
  }

  /* =======================================================
     GALERÍA
     ======================================================= */

  async function loadGallery() {
    const container =
      $("#galleryGrid");

    if (!container) return;

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    try {
      const { data, error } =
        await client
          .from("galeria")
          .select("*")
          .order("created_at", {
            ascending: false
          });

      if (error) {
        throw error;
      }

      if (!Array.isArray(data) || !data.length) {
        container.innerHTML = `
          <div class="gallery-empty">
            <span>🎨</span>
            <p>
              Todavía no hay obras publicadas.
            </p>
          </div>
        `;

        return;
      }

      const items = data
        .map((item) => {
          const image =
            item.url ||
            item.image_url ||
            item.imagen ||
            item.image;

          const title =
            item.titulo ||
            item.title ||
            "RoXThal Art Design";

          if (!image) return "";

          return `
            <article class="gallery-item">
              <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(title)}"
                loading="lazy"
              >

              <div class="gallery-caption">
                <strong>
                  ${escapeHTML(title)}
                </strong>
              </div>
            </article>
          `;
        })
        .filter(Boolean)
        .join("");

      if (!items) {
        container.innerHTML = `
          <div class="gallery-empty">
            <span>🎨</span>
            <p>
              No se encontraron imágenes válidas.
            </p>
          </div>
        `;

        return;
      }

      container.innerHTML = items;

    } catch (error) {
      console.error(
        "Error cargando galería:",
        error
      );

      container.innerHTML = `
        <div class="gallery-empty">
          <span>🎨</span>
          <p>
            La galería estará disponible próximamente.
          </p>
        </div>
      `;
    }
  }

  /* =======================================================
     RESEÑAS
     ======================================================= */

  async function loadReviews() {
    const container =
      $("#reviewsContainer");

    if (!container) return;

    const client =
      getSupabaseClient();

    if (!client) {
      container.innerHTML = `
        <div class="empty-state">
          Las reseñas estarán disponibles próximamente.
        </div>
      `;

      return;
    }

    try {
      const { data, error } =
        await client
          .from("resenas")
          .select("*")
          .order("created_at", {
            ascending: false
          });

      if (error) {
        throw error;
      }

      if (!Array.isArray(data) || !data.length) {
        container.innerHTML = `
          <div class="empty-state">
            Todavía no hay reseñas publicadas.
          </div>
        `;

        return;
      }

      container.innerHTML = data
        .map((review) => {
          const name =
            review.nombre ||
            review.name ||
            "Cliente";

          const text =
            review.comentario ||
            review.comment ||
            review.texto ||
            "";

          const rating =
            Number(
              review.calificacion ||
              review.rating ||
              5
            );

          const stars =
            "★".repeat(
              Math.max(
                1,
                Math.min(5, rating)
              )
            );

          return `
            <article class="review-card">

              <div class="review-stars">
                ${stars}
              </div>

              <h3>
                ${escapeHTML(name)}
              </h3>

              <p>
                ${escapeHTML(text)}
              </p>

            </article>
          `;
        })
        .join("");

    } catch (error) {
      console.error(
        "Error cargando reseñas:",
        error
      );

      container.innerHTML = `
        <div class="empty-state">
          No fue posible cargar las reseñas.
        </div>
      `;
    }
  }

  /* =======================================================
     VISITAS
     ======================================================= */

  async function registerVisit() {
    const counter =
      $("#visitCounter");

    if (!counter) return;

    const client =
      getSupabaseClient();

    if (!client) {
      counter.textContent = "—";
      return;
    }

    try {
      const { data, error } =
        await client.rpc(
          "registrar_visita"
        );

      if (error) {
        throw error;
      }

      if (
        typeof data === "number"
      ) {
        counter.textContent =
          data.toLocaleString("es-AR");

        return;
      }

      if (
        data &&
        typeof data.count === "number"
      ) {
        counter.textContent =
          data.count.toLocaleString("es-AR");

        return;
      }

      counter.textContent = "—";

    } catch (error) {
      console.warn(
        "Contador de visitas no disponible:",
        error
      );

      counter.textContent = "—";
    }
  }

  /* =======================================================
     CONFIGURACIÓN PÚBLICA
     ======================================================= */

  function exposeConfig() {
    window.RoXThalApp = {
      reload: async () => {
        await Promise.all([
          loadGallery(),
          loadReviews(),
          registerVisit()
        ]);
      }
    };
  }

  /* =======================================================
     INICIALIZACIÓN
     ======================================================= */

  async function init() {
    initYear();
    initMenu();
    initModal();
    initTattooSearch();
    initArtistSearch();
    exposeConfig();

    await Promise.all([
      loadGallery(),
      loadReviews(),
      registerVisit()
    ]);
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
