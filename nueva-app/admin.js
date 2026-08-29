/* =========================================================
   RoXThal Art Design
   NUEVA APP — admin.js
   Administrador base
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const ADMIN_CONFIG = {
    storageKey: "roxthal_admin_session",
    panelHash: "#admin"
  };

  /* =======================================================
     UTILIDADES
     ======================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const escapeHTML = (value) => {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  };

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
        "Error inicializando Supabase:",
        error
      );

      return null;
    }
  }

  /* =======================================================
     SESIÓN
     ======================================================= */

  function saveSession(user) {
    if (!user) return;

    localStorage.setItem(
      ADMIN_CONFIG.storageKey,
      JSON.stringify({
        id: user.id,
        email: user.email
      })
    );
  }

  function clearSession() {
    localStorage.removeItem(
      ADMIN_CONFIG.storageKey
    );
  }

  function getSavedSession() {
    try {
      return JSON.parse(
        localStorage.getItem(
          ADMIN_CONFIG.storageKey
        )
      );
    } catch {
      return null;
    }
  }

  /* =======================================================
     ADMIN LOGIN
     ======================================================= */

  async function login(email, password) {
    const client =
      getSupabaseClient();

    if (!client) {
      throw new Error(
        "Supabase no está configurado."
      );
    }

    const { data, error } =
      await client.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (data?.user) {
      saveSession(data.user);
    }

    return data;
  }

  /* =======================================================
     LOGOUT
     ======================================================= */

  async function logout() {
    const client =
      getSupabaseClient();

    if (client) {
      try {
        await client.auth.signOut();
      } catch (error) {
        console.warn(
          "Error cerrando sesión:",
          error
        );
      }
    }

    clearSession();
  }

  /* =======================================================
     USUARIO ACTUAL
     ======================================================= */

  async function getCurrentUser() {
    const client =
      getSupabaseClient();

    if (!client) {
      return null;
    }

    try {
      const { data } =
        await client.auth.getUser();

      return data?.user || null;
    } catch {
      return null;
    }
  }

  /* =======================================================
     PROTECCIÓN ADMINISTRATIVA
     ======================================================= */

  async function isAuthenticated() {
    const user =
      await getCurrentUser();

    return Boolean(user);
  }

  /* =======================================================
     DATOS DEL ADMINISTRADOR
     ======================================================= */

  async function getAdminStats() {
    const client =
      getSupabaseClient();

    if (!client) {
      return null;
    }

    const tables = {
      alumnos: "alumnos",
      bookings: "bookings",
      cursos: "courses",
      pagos: "pagos"
    };

    const stats = {};

    for (const [name, table] of Object.entries(
      tables
    )) {
      try {
        const { count, error } =
          await client
            .from(table)
            .select("*", {
              count: "exact",
              head: true
            });

        stats[name] =
          error ? 0 : Number(count || 0);

      } catch {
        stats[name] = 0;
      }
    }

    return stats;
  }

  /* =======================================================
     CREAR PANEL ADMIN
     ======================================================= */

  function createAdminPanel() {
    if ($("#roxthalAdminPanel")) {
      return;
    }

    const panel =
      document.createElement("section");

    panel.id =
      "roxthalAdminPanel";

    panel.hidden = true;

    panel.innerHTML = `
      <div
        style="
          width:min(1100px,calc(100% - 30px));
          margin:40px auto;
          padding:30px;
          border:1px solid rgba(255,255,255,.1);
          border-radius:18px;
          background:#161616;
          color:#f5f5f5;
        "
      >

        <div
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:20px;
            flex-wrap:wrap;
          "
        >

          <div>
            <span
              style="
                color:#e4b400;
                font-size:12px;
                font-weight:800;
                letter-spacing:2px;
              "
            >
              ADMINISTRACIÓN
            </span>

            <h2>
              RoXThal Art Design
            </h2>

            <p
              id="adminUser"
              style="color:#a7a7a7;"
            >
              —
            </p>
          </div>

          <button
            id="adminLogout"
            type="button"
            style="
              padding:10px 16px;
              border:1px solid rgba(255,255,255,.1);
              border-radius:10px;
              background:#242424;
              color:#fff;
              cursor:pointer;
            "
          >
            Cerrar sesión
          </button>

        </div>

        <div
          id="adminStats"
          style="
            display:grid;
            grid-template-columns:
              repeat(auto-fit,minmax(180px,1fr));
            gap:15px;
            margin-top:30px;
          "
        >
          <div>Cargando estadísticas...</div>
        </div>

      </div>
    `;

    document.body.appendChild(panel);

    const logoutButton =
      $("#adminLogout");

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        async () => {
          await logout();

          panel.hidden = true;

          window.location.hash = "";
        }
      );
    }
  }

  /* =======================================================
     CARGAR PANEL
     ======================================================= */

  async function loadAdminPanel() {
    createAdminPanel();

    const panel =
      $("#roxthalAdminPanel");

    if (!panel) return;

    const authenticated =
      await isAuthenticated();

    if (!authenticated) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;

    const user =
      await getCurrentUser();

    const userElement =
      $("#adminUser");

    if (userElement) {
      userElement.textContent =
        user?.email || "Administrador";
    }

    const stats =
      await getAdminStats();

    const statsContainer =
      $("#adminStats");

    if (!statsContainer) return;

    if (!stats) {
      statsContainer.innerHTML = `
        <div>
          Supabase no está configurado.
        </div>
      `;

      return;
    }

    const labels = {
      alumnos: "Alumnos",
      bookings: "Reservas",
      cursos: "Cursos",
      pagos: "Pagos"
    };

    statsContainer.innerHTML =
      Object.entries(stats)
        .map(([key, value]) => `
          <div
            style="
              padding:22px;
              border:1px solid rgba(255,255,255,.1);
              border-radius:14px;
              background:#1c1c1c;
            "
          >
            <div
              style="
                color:#a7a7a7;
                font-size:13px;
              "
            >
              ${escapeHTML(labels[key] || key)}
            </div>

            <strong
              style="
                display:block;
                margin-top:5px;
                color:#e4b400;
                font-size:30px;
              "
            >
              ${Number(value).toLocaleString("es-AR")}
            </strong>
          </div>
        `)
        .join("");
  }

  /* =======================================================
     HASH ADMIN
     ======================================================= */

  async function handleHash() {
    if (
      window.location.hash ===
      ADMIN_CONFIG.panelHash
    ) {
      await loadAdminPanel();
    } else {
      const panel =
        $("#roxthalAdminPanel");

      if (panel) {
        panel.hidden = true;
      }
    }
  }

  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.RoXThalAdmin = {
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    getAdminStats,
    loadAdminPanel
  };

  /* =======================================================
     INICIO
     ======================================================= */

  async function init() {
    createAdminPanel();

    window.addEventListener(
      "hashchange",
      handleHash
    );

    await handleHash();
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
