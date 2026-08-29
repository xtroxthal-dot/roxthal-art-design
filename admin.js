/* =========================================================
   RoXThal Art Design
   admin.js
   Módulo administrativo
   ========================================================= */

(function () {
  "use strict";

  window.RoXThalAdmin = window.RoXThalAdmin || {};

  window.RoXThalAdmin.initialized = false;

  function initAdminModule() {
    if (window.RoXThalAdmin.initialized) return;

    window.RoXThalAdmin.initialized = true;

    console.info("[RoXThal] Módulo administrativo preparado.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminModule);
  } else {
    initAdminModule();
  }

})();
