/* =====================================================
   CYBERCHECK PRO
   THEME ENGINE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeTheme();

    }
);

/* =====================================================
   INITIALIZE
===================================================== */

function initializeTheme() {

    const savedTheme =
    localStorage.getItem(
        "theme"
    ) || "light";

    applyTheme(
        savedTheme
    );

    const themeButton =
    document.getElementById(
        "themeToggle"
    );

    if (themeButton) {

        themeButton.addEventListener(
            "click",
            toggleTheme
        );

    }

}

/* =====================================================
   TOGGLE
===================================================== */

function toggleTheme() {

    const currentTheme =
    localStorage.getItem(
        "theme"
    ) || "light";

    const nextTheme =
    currentTheme === "light"
        ? "dark"
        : "light";

    applyTheme(
        nextTheme
    );

}

/* =====================================================
   APPLY THEME
===================================================== */

function applyTheme(theme) {

    const folder =
    theme === "dark"
        ? "styles"
        : "styles-light";

    setThemeFile(
        "global-theme",
        `${folder}/global.css`
    );

    setThemeFile(
        "hero-theme",
        `${folder}/hero.css`
    );

    setThemeFile(
        "cards-theme",
        `${folder}/cards.css`
    );

    setThemeFile(
        "dashboard-theme",
        `${folder}/dashboard.css`
    );

    setThemeFile(
        "responsive-theme",
        `${folder}/responsive.css`
    );

    setThemeFile(
        "theme-style",
        `${folder}/style.css`
    );

    const themeIcon =
    document.getElementById(
        "themeIcon"
    );

    if (themeIcon) {

        themeIcon.className =
        theme === "dark"
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";

    }

    localStorage.setItem(
        "theme",
        theme
    );

    console.log(
        `Tema aplicado: ${theme}`
    );

}

/* =====================================================
   UPDATE LINK
===================================================== */

function setThemeFile(
    id,
    href
) {

    const element =
    document.getElementById(
        id
    );

    if (!element) return;

    element.setAttribute(
        "href",
        href
    );

}