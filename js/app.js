/* =========================================================
   ROXTHAL ART DESIGN
   APP.JS — PUBLIC V1
   ========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://hxtzlrsmjwrpqgjgbzyl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cv6J952zB8hmDtXSHMbtCQ_xGJZHN1J";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   DOM
   ========================================================= */

const menuToggle =
  document.getElementById("menuToggle");

const mainNav =
  document.getElementById("mainNav");

const currentYear =
  document.getElementById("currentYear");

const galleryGrid =
  document.getElementById("galleryGrid");

const galleryStatus =
  document.getElementById("galleryStatus");

const galleryFilters =
  document.querySelectorAll(".gallery-filter");

const coursesGrid =
  document.getElementById("coursesGrid");

const coursesStatus =
  document.getElementById("coursesStatus");

const imageViewer =
  document.getElementById("imageViewer");

const viewerImage =
  document.getElementById("viewerImage");

const viewerCaption =
  document.getElementById("viewerCaption");

const viewerClose =
  document.getElementById("viewerClose");


/* =========================================================
   STATE
   ========================================================= */

let galleryItems = [];

let currentGalleryFilter = "all";


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);


async function init() {

  setCurrentYear();

  setupMobileMenu();

  setupNavigation();

  setupGalleryFilters();

  setupViewer();

  await Promise.all([
    loadGallery(),
    loadCourses()
  ]);

}


/* =========================================================
   YEAR
   ========================================================= */

function setCurrentYear() {

  if (!currentYear) {
    return;
  }

  currentYear.textContent =
    new Date().getFullYear();

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

  if (!menuToggle || !mainNav) {
    return;
  }

  menuToggle.addEventListener(
    "click",
    () => {

      const isOpen =
        mainNav.classList.toggle("is-open");

      menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

    }
  );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

  if (!mainNav) {
    return;
  }

  const links =
    mainNav.querySelectorAll("a");

  links.forEach((link) => {

    link.addEventListener(
      "click",
      () => {

        if (
          window.innerWidth < 700
        ) {

          mainNav.classList.remove(
            "is-open"
          );

          if (menuToggle) {

            menuToggle.setAttribute(
              "aria-expanded",
              "false"
            );

          }

        }

      }
    );

  });

}


/* =========================================================
   GALLERY FILTERS
   ========================================================= */

function setupGalleryFilters() {

  galleryFilters.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const filter =
            button.dataset.filter || "all";

          currentGalleryFilter =
            filter;

          galleryFilters.forEach(
            (item) => {

              item.classList.toggle(
                "active",
                item === button
              );

            }
          );

          renderGallery();

        }
      );

    }
  );

}


/* =========================================================
   LOAD GALLERY
   ========================================================= */

async function loadGallery() {

  if (!galleryGrid) {
    return;
  }

  setStatus(
    galleryStatus,
    "Cargando galería..."
  );

  try {

    const {
      data,
      error
    } = await supabase
      .from("images")
      .select(`
        id,
        title,
        category,
        description,
        url,
        visible,
        type,
        created_at
      `)
      .eq("visible", true)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    galleryItems =
      Array.isArray(data)
        ? data
        : [];

    renderGallery();

  } catch (error) {

    console.error(
      "Error cargando galería:",
      error
    );

    galleryItems = [];

    if (galleryGrid) {
      galleryGrid.innerHTML = "";
    }

    setStatus(
      galleryStatus,
      "No se pudo cargar la galería."
    );

  }

}


/* =========================================================
   RENDER GALLERY
   ========================================================= */

function renderGallery() {

  if (!galleryGrid) {
    return;
  }

  const filtered =
    galleryItems.filter(
      (item) => {

        if (
          currentGalleryFilter === "all"
        ) {
          return true;
        }

        return (
          normalizeType(item.type) ===
          currentGalleryFilter
        );

      }
    );


  if (!filtered.length) {

    galleryGrid.innerHTML = "";

    setStatus(
      galleryStatus,
      "No hay trabajos disponibles en esta categoría."
    );

    return;

  }


  galleryGrid.innerHTML =
    filtered
      .map(createGalleryItem)
      .join("");


  setStatus(
    galleryStatus,
    ""
  );


  galleryGrid
    .querySelectorAll(".gallery-item")
    .forEach(
      (item) => {

        item.addEventListener(
          "click",
          () => {

            const id =
              item.dataset.id;

            const galleryItem =
              galleryItems.find(
                (entry) =>
                  String(entry.id) ===
                  String(id)
              );

            if (galleryItem) {
              openViewer(
                galleryItem
              );
            }

          }
        );

      }
    );

}


/* =========================================================
   CREATE GALLERY ITEM
   ========================================================= */

function createGalleryItem(item) {

  const title =
    item.title ||
    "Obra RoXThal";

  const description =
    item.description ||
    "";

  const imageUrl =
    item.url ||
    "";

  const safeTitle =
    escapeHtml(title);

  const safeDescription =
    escapeHtml(description);

  const caption =
    safeDescription
      ? `${safeTitle} — ${safeDescription}`
      : safeTitle;


  if (!imageUrl) {

    return `
      <article
        class="gallery-item"
        data-id="${escapeHtml(String(item.id))}"
      >
        <div class="gallery-item-caption">
          ${safeTitle}
        </div>
      </article>
    `;

  }


  return `
    <article
      class="gallery-item"
      data-id="${escapeHtml(String(item.id))}"
      tabindex="0"
      role="button"
      aria-label="Ver ${safeTitle}"
    >

      <img
        src="${escapeAttribute(imageUrl)}"
        alt="${safeTitle}"
        loading="lazy"
        decoding="async"
      >

      <div class="gallery-item-caption">
        ${caption}
      </div>

    </article>
  `;

}


/* =========================================================
   NORMALIZE IMAGE TYPE
   ========================================================= */

function normalizeType(type) {

  const value =
    String(type || "")
      .trim()
      .toLowerCase();

  if (
    value === "tattoo" ||
    value === "tatuaje"
  ) {
    return "tattoo";
  }

  if (
    value === "art" ||
    value === "arte"
  ) {
    return "art";
  }

  return "other";

}


/* =========================================================
   LOAD COURSES
   ========================================================= */

async function loadCourses() {

  if (!coursesGrid) {
    return;
  }

  setStatus(
    coursesStatus,
    "Cargando cursos..."
  );

  try {

    const {
      data,
      error
    } = await supabase
      .from("courses")
      .select(`
        id,
        name,
        description,
        price,
        duration,
        schedule,
        modality,
        materials_included,
        active,
        created_at
      `)
      .eq("active", true)
      .order(
        "created_at",
        {
          ascending: true
        }
      );

    if (error) {
      throw error;
    }

    const courses =
      Array.isArray(data)
        ? data
        : [];

    renderCourses(
      courses
    );

  } catch (error) {

    console.error(
      "Error cargando cursos:",
      error
    );

    coursesGrid.innerHTML = "";

    setStatus(
      coursesStatus,
      "No se pudieron cargar los cursos."
    );

  }

}


/* =========================================================
   RENDER COURSES
   ========================================================= */

function renderCourses(courses) {

  if (!coursesGrid) {
    return;
  }

  if (!courses.length) {

    coursesGrid.innerHTML = "";

    setStatus(
      coursesStatus,
      "Actualmente no hay cursos publicados."
    );

    return;

  }


  coursesGrid.innerHTML =
    courses
      .map(createCourseCard)
      .join("");


  setStatus(
    coursesStatus,
    ""
  );

}


/* =========================================================
   CREATE COURSE CARD
   ========================================================= */

function createCourseCard(course) {

  const name =
    course.name ||
    "Curso RoXThal";

  const description =
    course.description ||
    "";

  const price =
    formatPrice(course.price);

  const duration =
    course.duration ||
    "";

  const schedule =
    course.schedule ||
    "";

  const modality =
    course.modality ||
    "";

  const materialsIncluded =
    Boolean(
      course.materials_included
    );


  return `
    <article class="course-card">

      <h3>
        ${escapeHtml(name)}
      </h3>

      ${
        description
          ? `
            <p class="course-description">
              ${escapeHtml(description)}
            </p>
          `
          : ""
      }

      ${
        price
          ? `
            <div class="course-price">
              ${escapeHtml(price)}
            </div>
          `
          : ""
      }

      <div class="course-details">

        ${
          duration
            ? `
              <div class="course-detail">
                <strong>Duración:</strong>
                ${escapeHtml(String(duration))}
              </div>
            `
            : ""
        }

        ${
          schedule
            ? `
              <div class="course-detail">
                <strong>Horarios:</strong>
                ${escapeHtml(String(schedule))}
              </div>
            `
            : ""
        }

        ${
          modality
            ? `
              <div class="course-detail">
                <strong>Modalidad:</strong>
                ${escapeHtml(String(modality))}
              </div>
            `
            : ""
        }

      </div>

      ${
        materialsIncluded
          ? `
            <span class="course-materials">
              Materiales incluidos
            </span>
          `
          : ""
      }

    </article>
  `;

}


/* =========================================================
   PRICE FORMAT
   ========================================================= */

function formatPrice(price) {

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {
    return "";
  }

  const numericPrice =
    Number(price);

  if (
    !Number.isFinite(
      numericPrice
    )
  ) {
    return String(price);
  }

  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  ).format(numericPrice);

}


/* =========================================================
   IMAGE VIEWER
   ========================================================= */

function setupViewer() {

  if (
    !imageViewer ||
    !viewerImage
  ) {
    return;
  }


  if (viewerClose) {

    viewerClose.addEventListener(
      "click",
      closeViewer
    );

  }


  imageViewer.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        imageViewer
      ) {
        closeViewer();
      }

    }
  );


  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape"
      ) {
        closeViewer();
      }

    }
  );

}


function openViewer(item) {

  if (
    !imageViewer ||
    !viewerImage
  ) {
    return;
  }

  if (!item.url) {
    return;
  }


  viewerImage.src =
    item.url;

  viewerImage.alt =
    item.title ||
    "Obra RoXThal";


  if (viewerCaption) {

    const title =
      item.title ||
      "Obra RoXThal";

    const description =
      item.description ||
      "";

    viewerCaption.textContent =
      description
        ? `${title} — ${description}`
        : title;

  }


  imageViewer.classList.add(
    "is-open"
  );

  imageViewer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

}


function closeViewer() {

  if (!imageViewer) {
    return;
  }

  imageViewer.classList.remove(
    "is-open"
  );

  imageViewer.setAttribute(
    "aria-hidden",
    "true"
  );

  if (viewerImage) {

    viewerImage.src = "";

    viewerImage.alt = "";

  }

  if (viewerCaption) {
    viewerCaption.textContent = "";
  }

  document.body.style.overflow =
    "";

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
  element,
  message
) {

  if (!element) {
    return;
  }

  element.textContent =
    message || "";

}


/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return escapeHtml(value);

}
