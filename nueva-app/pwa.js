/* =========================================================
   RoXThal Art Design
   NUEVA APP — pwa.js
   Gestión de PWA y Service Worker
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const CONFIG = {
    serviceWorker: "sw.js",
    updateCheckInterval: 60 * 60 * 1000
  };

  /* =======================================================
     SOPORTE PWA
     ======================================================= */

  function isSupported() {
    return (
      "serviceWorker" in navigator
    );
  }

  /* =======================================================
     REGISTRAR SERVICE WORKER
     ======================================================= */

  async function registerServiceWorker() {
    if (!isSupported()) {
      console.info(
        "Service Worker no disponible en este navegador."
      );

      return null;
    }

    try {
      const registration =
        await navigator.serviceWorker.register(
          CONFIG.serviceWorker,
          {
            scope: "./"
          }
        );

      console.info(
        "RoXThal PWA: Service Worker registrado.",
        registration.scope
      );

      return registration;

    } catch (error) {
      console.error(
        "RoXThal PWA: error registrando Service Worker:",
        error
      );

      return null;
    }
  }

  /* =======================================================
     COMPROBAR ACTUALIZACIONES
     ======================================================= */

  async function checkForUpdates() {
    if (!isSupported()) {
      return;
    }

    try {
      const registration =
        await navigator.serviceWorker.getRegistration(
          "./"
        );

      if (registration) {
        await registration.update();
      }

    } catch (error) {
      console.warn(
        "No se pudo comprobar actualización de PWA:",
        error
      );
    }
  }

  /* =======================================================
     ESCUCHAR NUEVO SERVICE WORKER
     ======================================================= */

  function watchForUpdates(registration) {
    if (!registration) {
      return;
    }

    registration.addEventListener(
      "updatefound",
      () => {
        const newWorker =
          registration.installing;

        if (!newWorker) {
          return;
        }

        newWorker.addEventListener(
          "statechange",
          () => {
            if (
              newWorker.state ===
              "installed"
            ) {
              if (
                navigator.serviceWorker.controller
              ) {
                console.info(
                  "RoXThal PWA: nueva versión disponible."
                );

                showUpdateNotice();
              }
            }
          }
        );
      }
    );
  }

  /* =======================================================
     AVISO DE ACTUALIZACIÓN
     ======================================================= */

  function showUpdateNotice() {
    if (
      document.getElementById(
        "roxthalUpdateNotice"
      )
    ) {
      return;
    }

    const notice =
      document.createElement("div");

    notice.id =
      "roxthalUpdateNotice";

    notice.innerHTML = `
      <div
        style="
          position:fixed;
          right:15px;
          bottom:15px;
          left:15px;
          z-index:9999;
          max-width:520px;
          margin:auto;
          padding:18px 20px;
          border:1px solid rgba(228,180,0,.45);
          border-radius:14px;
          background:#161616;
          color:#fff;
          box-shadow:0 18px 50px rgba(0,0,0,.45);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:15px;
        "
      >

        <div>
          <strong>
            Nueva versión disponible
          </strong>

          <div
            style="
              margin-top:4px;
              color:#a7a7a7;
              font-size:13px;
            "
          >
            Actualizá RoXThal Art Design.
          </div>
        </div>

        <button
          id="roxthalUpdateButton"
          type="button"
          style="
            flex-shrink:0;
            padding:10px 14px;
            border:0;
            border-radius:10px;
            background:#e4b400;
            color:#000;
            font-weight:800;
            cursor:pointer;
          "
        >
          Actualizar
        </button>

      </div>
    `;

    document.body.appendChild(notice);

    const button =
      document.getElementById(
        "roxthalUpdateButton"
      );

    if (button) {
      button.addEventListener(
        "click",
        async () => {
          button.disabled = true;
          button.textContent =
            "Actualizando...";

          try {
            const registration =
              await navigator.serviceWorker
                .getRegistration("./");

            if (
              registration &&
              registration.waiting
            ) {
              registration.waiting.postMessage({
                type: "SKIP_WAITING"
              });
            }

            setTimeout(() => {
              window.location.reload();
            }, 500);

          } catch {
            window.location.reload();
          }
        }
      );
    }
  }

  /* =======================================================
     INSTALACIÓN PWA
     ======================================================= */

  let deferredInstallPrompt = null;

  function captureInstallPrompt() {
    window.addEventListener(
      "beforeinstallprompt",
      (event) => {
        event.preventDefault();

        deferredInstallPrompt = event;

        window.RoXThalPWA.installAvailable =
          true;

        document.dispatchEvent(
          new CustomEvent(
            "roxthal:pwa-install-available"
          )
        );
      }
    );
  }

  async function install() {
    if (!deferredInstallPrompt) {
      return false;
    }

    try {
      deferredInstallPrompt.prompt();

      const result =
        await deferredInstallPrompt.userChoice;

      deferredInstallPrompt = null;

      window.RoXThalPWA.installAvailable =
        false;

      return (
        result?.outcome === "accepted"
      );

    } catch (error) {
      console.warn(
        "Error durante instalación PWA:",
        error
      );

      return false;
    }
  }

  /* =======================================================
     DETECTAR INSTALACIÓN
     ======================================================= */

  function watchInstallation() {
    window.addEventListener(
      "appinstalled",
      () => {
        deferredInstallPrompt = null;

        window.RoXThalPWA.installAvailable =
          false;

        document.dispatchEvent(
          new CustomEvent(
            "roxthal:pwa-installed"
          )
        );

        console.info(
          "RoXThal PWA instalada."
        );
      }
    );
  }

  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.RoXThalPWA = {
    installAvailable: false,
    install,
    registerServiceWorker,
    checkForUpdates
  };

  /* =======================================================
     INICIO
     ======================================================= */

  async function init() {
    captureInstallPrompt();
    watchInstallation();

    const registration =
      await registerServiceWorker();

    watchForUpdates(registration);

    setInterval(
      checkForUpdates,
      CONFIG.updateCheckInterval
    );
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
