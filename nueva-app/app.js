/* =========================================================
   RoXThal Art Design
   NUEVA APP — app.js
   Núcleo de aplicación + Supabase
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIGURACIÓN SUPABASE
     ======================================================= */

  const SUPABASE_URL =
    "https://lvvhpuedktdmfehvhcwk.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_KE2IFCCi17b-Cpf2X-vsyw__4NrShZp";

  let supabaseClient = null;

  /* =======================================================
     ESTADO
     ======================================================= */

  const state = {
    initialized: false,
    assets: [],
    gallery: [],
    reviews: [],
    courses: [],
    services: [],
    visits: null
  };

  /* =======================================================
     UTILIDADES
     ======================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function log(...args) {
    console.log("[RoXThal]", ...args);
  }

  function warn(...args) {
    console.warn("[RoXThal]", ...args);
  }

  function error(...args) {
    console.error("[RoXThal]", ...args);
  }

  function escapeHTML(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cacheBust(url, version) {
    if (!url) return "";

    const separator =
      url.includes("?") ? "&" : "?";

    return `${url}${separator}roxthal_v=${encodeURIComponent(
      version || Date.now()
    )}`;
  }

  /* =======================================================
     SUPABASE
     ======================================================= */

  function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve(window.supabase);
        return;
      }

      const existing =
        document.querySelector(
          'script[data-roxthal-supabase]'
        );

      if (existing) {
        existing.addEventListener(
          "load",
          () => {
            if (window.supabase) {
              resolve(window.supabase);
            } else {
              reject(
                new Error(
                  "Supabase no pudo inicializarse."
                )
              );
            }
          },
          { once: true }
        );

        existing.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "No se pudo cargar la librería de Supabase."
              )
            );
          },
          { once: true }
        );

        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

      script.async = true;
      script.dataset.roxthalSupabase = "true";

      script.onload = () => {
        if (window.supabase) {
          resolve(window.supabase);
        } else {
          reject(
            new Error(
              "La librería Supabase se cargó pero no está disponible."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "No se pudo cargar Supabase desde CDN."
          )
        );
      };

      document.head.appendChild(script);
    });
  }

  async function initSupabase() {
    try {
      const library =
        await loadSupabaseLibrary();

      if (
        !library ||
        typeof library.createClient !==
          "function"
      ) {
        throw new Error(
          "createClient de Supabase no está disponible."
        );
      }

      supabaseClient =
        library.createClient(
          SUPABASE_URL,
          SUPABASE_KEY,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            },
            global: {
              headers: {
                "x-client-info":
                  "roxthal-art-design-new-app"
              }
            }
          }
        );

      state.initialized = true;

      window.roxthalSupabase =
        supabaseClient;

      log("Supabase conectado correctamente.");

      return supabaseClient;
    } catch (err) {
      state.initialized = false;

      error(
        "Error inicializando Supabase:",
        err
      );

      return null;
    }
  }

  /* =======================================================
     CONSULTAS SEGURAS
     ======================================================= */

  async function queryTable(
    table,
    options = {}
  ) {
    if (!supabaseClient) {
      return {
        data: null,
        error: new Error(
          "Supabase no está inicializado."
        )
      };
    }

    let query =
      supabaseClient
        .from(table)
        .select(
          options.select || "*"
        );

    if (options.order) {
      query = query.order(
        options.order.column,
        {
          ascending:
            options.order.ascending !== false
        }
      );
    }

    if (
      Number.isInteger(options.limit)
    ) {
      query = query.limit(
        options.limit
      );
    }

    if (
      options.eq &&
      typeof options.eq === "object"
    ) {
      Object.entries(
        options.eq
      ).forEach(([column, value]) => {
        query = query.eq(
          column,
          value
        );
      });
    }

    return query;
  }

  /* =======================================================
     SITE ASSETS
     ======================================================= */

  async function loadSiteAssets() {
    try {
      const {
        data,
        error: queryError
      } = await queryTable(
        "site_assets",
        {
          order: {
            column: "slot",
            ascending: true
          }
        }
      );

      if (queryError) {
        throw queryError;
      }

      state.assets =
        Array.isArray(data)
          ? data
          : [];

      applySiteAssets(
        state.assets
      );

      log(
        "Site assets cargados:",
        state.assets.length
      );

      return state.assets;
    } catch (err) {
      warn(
        "No se pudieron cargar site_assets:",
        err
      );

      return [];
    }
  }

  function applySiteAssets(
    assets
  ) {
    assets.forEach((asset) => {
      if (!asset) return;

      const slot =
        asset.slot ||
        asset.name;

      const url =
        asset.url ||
        asset.image_url;

      if (!slot || !url) {
        return;
      }

      const selectors = [
        `[data-asset="${CSS.escape(slot)}"]`,
        `[data-image-slot="${CSS.escape(slot)}"]`,
        `[data-site-asset="${CSS.escape(slot)}"]`
      ];

      const elements =
        selectors.flatMap(
          (selector) => {
            try {
              return $$(selector);
            } catch {
              return [];
            }
          }
        );

      elements.forEach((element) => {
        if (
          element.tagName === "IMG"
        ) {
          element.src =
            cacheBust(
              url,
              asset.updated_at
            );

          if (
            asset.name &&
            !element.alt
          ) {
            element.alt =
              asset.name;
          }
        } else {
          element.style.backgroundImage =
            `url("${cacheBust(
              url,
              asset.updated_at
            )}")`;
        }
      });
    });
  }

  /* =======================================================
     GALERÍA
     ======================================================= */

  async function loadGallery() {
    try {
      const {
        data,
        error: queryError
      } = await queryTable(
        "galeria",
        {
          order: {
            column: "created_at",
            ascending: false
          }
        }
      );

      if (queryError) {
        throw queryError;
      }

      state.gallery =
        Array.isArray(data)
          ? data
          : [];

      renderGallery(
        state.gallery
      );

      return state.gallery;
    } catch (err) {
      warn(
        "No se pudo cargar la galería:",
        err
      );

      return [];
    }
  }

  function renderGallery(
    items
  ) {
    const containers =
      $$("[data-gallery]");

    if (!containers.length) {
      return;
    }

    containers.forEach(
      (container) => {
        container.innerHTML = "";

        items.forEach(
          (item) => {
            if (!item?.image_url) {
              return;
            }

            const article =
              document.createElement(
                "article"
              );

            article.className =
              "roxthal-gallery-item";

            article.innerHTML = `
              <img
                src="${escapeHTML(
                  cacheBust(
                    item.image_url,
                    item.created_at
                  )
                )}"
                alt="${escapeHTML(
                  item.title || "Obra de RoXThal Art Design"
                )}"
                loading="lazy"
              >
              ${
                item.title
                  ? `<h3>${escapeHTML(
                      item.title
                    )}</h3>`
                  : ""
              }
              ${
                item.category
                  ? `<span>${escapeHTML(
                      item.category
                    )}</span>`
                  : ""
              }
            `;

            container.appendChild(
              article
            );
          }
        );
      }
    );
  }

  /* =======================================================
     RESEÑAS
     ======================================================= */

  async function loadReviews() {
    try {
      const {
        data,
        error: queryError
      } = await queryTable(
        "resenas",
        {
          eq: {
            aprobada: true
          },
          order: {
            column: "fecha",
            ascending: false
          },
          limit: 50
        }
      );

      if (queryError) {
        throw queryError;
      }

      state.reviews =
        Array.isArray(data)
          ? data
          : [];

      renderReviews(
        state.reviews
      );

      return state.reviews;
    } catch (err) {
      warn(
        "No se pudieron cargar las reseñas:",
        err
      );

      return [];
    }
  }

  function renderReviews(
    reviews
  ) {
    const containers =
      $$("[data-reviews]");

    if (!containers.length) {
      return;
    }

    containers.forEach(
      (container) => {
        container.innerHTML = "";

        if (!reviews.length) {
          container.innerHTML =
            "<p>Aún no hay reseñas publicadas.</p>";

          return;
        }

        reviews.forEach(
          (review) => {
            const article =
              document.createElement(
                "article"
              );

            article.className =
              "roxthal-review";

            article.innerHTML = `
              <div class="roxthal-review-name">
                ${escapeHTML(
                  review.nombre
                )}
              </div>

              <div class="roxthal-review-text">
                ${escapeHTML(
                  review.comentario
                )}
              </div>

              ${
                review.fecha
                  ? `<time datetime="${escapeHTML(
                      review.fecha
                    )}">
                      ${escapeHTML(
                        new Date(
                          review.fecha
                        ).toLocaleDateString(
                          "es-AR"
                        )
                      )}
                    </time>`
                  : ""
              }
            `;

            container.appendChild(
              article
            );
          }
        );
      }
    );
  }

  /* =======================================================
     CURSOS
     ======================================================= */

  async function loadCourses() {
    try {
      const {
        data,
        error: queryError
      } = await queryTable(
        "courses",
        {
          eq: {
            active: true
          }
        }
      );

      if (queryError) {
        throw queryError;
      }

      state.courses =
        Array.isArray(data)
          ? data
          : [];

      renderCourses(
        state.courses
      );

      return state.courses;
    } catch (err) {
      warn(
        "No se pudieron cargar courses:",
        err
      );

      return [];
    }
  }

  function renderCourses(
    courses
  ) {
    const containers =
      $$("[data-courses]");

    if (!containers.length) {
      return;
    }

    containers.forEach(
      (container) => {
        container.innerHTML = "";

        courses.forEach(
          (course) => {
            const article =
              document.createElement(
                "article"
              );

            article.className =
              "roxthal-course";

            article.innerHTML = `
              <h3>
                ${escapeHTML(
                  course.name
                )}
              </h3>

              ${
                course.description
                  ? `<p>${escapeHTML(
                      course.description
                    )}</p>`
                  : ""
              }

              ${
                course.price !== null &&
                course.price !== undefined
                  ? `<strong>
                      $${Number(
                        course.price
                      ).toLocaleString(
                        "es-AR"
                      )}
                    </strong>`
                  : ""
              }
            `;

            container.appendChild(
              article
            );
          }
        );
      }
    );
  }

  /* =======================================================
     SERVICIOS
     ======================================================= */

  async function loadServices() {
    try {
      const {
        data,
        error: queryError
      } = await queryTable(
        "services",
        {
          eq: {
            active: true
          }
        }
      );

      if (queryError) {
        throw queryError;
      }

      state.services =
        Array.isArray(data)
          ? data
          : [];

      renderServices(
        state.services
      );

      return state.services;
    } catch (err) {
      warn(
        "No se pudieron cargar services:",
        err
      );

      return [];
    }
  }

  function renderServices(
    services
  ) {
    const containers =
      $$("[data-services]");

    if (!containers.length) {
      return;
    }

    containers.forEach(
      (container) => {
        container.innerHTML = "";

        services.forEach(
          (service) => {
            const article =
              document.createElement(
                "article"
              );

            article.className =
              "roxthal-service";

            article.innerHTML = `
              <h3>
                ${escapeHTML(
                  service.name
                )}
              </h3>

              ${
                service.description
                  ? `<p>${escapeHTML(
                      service.description
                    )}</p>`
                  : ""
              }
            `;

            container.appendChild(
              article
            );
          }
        );
      }
    );
  }

  /* =======================================================
     CONTADOR DE VISITAS
     ======================================================= */

  async function incrementVisits() {
    try {
      if (!supabaseClient) {
        return null;
      }

      const {
        data,
        error: rpcError
      } =
        await supabaseClient.rpc(
          "incrementar_visita"
        );

      if (rpcError) {
        throw rpcError;
      }

      state.visits = data;

      renderVisits(data);

      return data;
    } catch (err) {
      warn(
        "No se pudo incrementar el contador de visitas:",
        err
      );

      return null;
    }
  }

  function renderVisits(
    total
  ) {
    $$("[data-visits]").forEach(
      (element) => {
        element.textContent =
          Number(total || 0).toLocaleString(
            "es-AR"
          );
      }
    );
  }

  /* =======================================================
     ACTUALIZACIÓN DE DATOS
     ======================================================= */

  async function refreshAppData() {
    if (!supabaseClient) {
      return;
    }

    await Promise.allSettled([
      loadSiteAssets(),
      loadGallery(),
      loadReviews(),
      loadCourses(),
      loadServices()
    ]);
  }

  /* =======================================================
     EXPONER API
     ======================================================= */

  window.RoXThalApp = {
    get supabase() {
      return supabaseClient;
    },

    state,

    loadSiteAssets,
    loadGallery,
    loadReviews,
    loadCourses,
    loadServices,
    incrementVisits,
    refreshAppData
  };

  /* =======================================================
     INICIO
     ======================================================= */

  async function boot() {
    log("Iniciando nueva aplicación...");

    const client =
      await initSupabase();

    if (!client) {
      warn(
        "La aplicación continuará sin datos remotos."
      );

      return;
    }

    await refreshAppData();

    /*
     * Incrementamos la visita después
     * de establecer la conexión.
     */

    await incrementVisits();

    log(
      "RoXThal Art Design inicializada correctamente."
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }

})();
