/* =========================================================
   RoXThal Art Design
   app.js
   JavaScript modular seguro
   ========================================================= */

(function () {
  "use strict";

  /* =======================================================
     BUSCADOR DE TATUAJES
     ======================================================= */

  window.buscarTatuajes = function () {
    const campo = document.getElementById("tattooSearch");

    if (!campo) return;

    const texto = campo.value.trim();

    if (!texto) {
      campo.focus();
      return;
    }

    const busqueda = "tatuajes " + texto;

    window.location.href =
      "https://www.google.com/search?tbm=isch&q=" +
      encodeURIComponent(busqueda);
  };


  window.buscarCategoria = function (categoria) {
    const campo = document.getElementById("tattooSearch");

    if (campo) {
      campo.value = categoria;
    }

    const busqueda = "tatuajes " + categoria;

    window.location.href =
      "https://www.google.com/search?tbm=isch&q=" +
      encodeURIComponent(busqueda);
  };


  /* =======================================================
     BUSCADOR DE CUADROS Y ARTISTAS
     ======================================================= */

  window.buscarArte = function () {
    const campo = document.getElementById("artSearch");

    if (!campo) return;

    const texto = campo.value.trim();

    if (!texto) {
      campo.focus();
      return;
    }

    const busqueda = "arte " + texto;

    window.location.href =
      "https://www.google.com/search?tbm=isch&q=" +
      encodeURIComponent(busqueda);
  };


  window.buscarArteCategoria = function (categoria) {
    const campo = document.getElementById("artSearch");

    if (campo) {
      campo.value = categoria;
    }

    window.location.href =
      "https://www.google.com/search?tbm=isch&q=" +
      encodeURIComponent(categoria);
  };


  window.buscarArtista = function (artista) {
    const campo = document.getElementById("artSearch");

    if (campo) {
      campo.value = artista;
    }

    const busqueda = "obras de arte " + artista;

    window.location.href =
      "https://www.google.com/search?tbm=isch&q=" +
      encodeURIComponent(busqueda);
  };


  /* =======================================================
     ATAJOS DE TECLADO
     ======================================================= */

  document.addEventListener("DOMContentLoaded", function () {

    const tattooSearch =
      document.getElementById("tattooSearch");

    if (tattooSearch) {
      tattooSearch.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          window.buscarTatuajes();
        }
      });
    }


    const artSearch =
      document.getElementById("artSearch");

    if (artSearch) {
      artSearch.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          window.buscarArte();
        }
      });
    }

  });

})();
