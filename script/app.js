document.addEventListener("DOMContentLoaded", () => {

    const themeToggleBtn =
        document.getElementById("themeToggle");

    const themeIcon =
        document.getElementById("themeIcon");

    const themeLinks = {

        "normalize-theme": "normalize.css",
        "global-theme": "global.css",
        "hero-theme": "hero.css",
        "cards-theme": "cards.css",
        "dashboard-theme": "dashboard.css",
        "desktop-theme": "desktop.css",
        "mobile-theme": "mobile.css",
        "theme-style": "style.css"

    };

    function applyTheme(theme) {

        const isDark =
            theme === "dark";

        const cssFolder =
            isDark
                ? "/styles-dark"
                : "/styles-light";

        Object.entries(themeLinks)
            .forEach(([id, file]) => {

                const link =
                    document.getElementById(id);

                if (link) {

                    link.href =
                        `${cssFolder}/${file}`;

                }

            });

        document.documentElement
            .setAttribute(
                "data-theme",
                theme
            );

        if (themeIcon) {

            themeIcon.className =
                isDark
                    ? "fa-solid fa-sun"
                    : "fa-solid fa-moon";

        }

        localStorage.setItem(
            "theme",
            theme
        );

    }

    const savedTheme =
        localStorage.getItem("theme");

    const initialTheme =
        savedTheme || "dark";

    applyTheme(initialTheme);

    if (themeToggleBtn) {

        themeToggleBtn.addEventListener(
            "click",
            () => {

                const currentTheme =
                    localStorage.getItem("theme") || "dark";

                const nextTheme =
                    currentTheme === "dark"
                        ? "light"
                        : "dark";

                applyTheme(nextTheme);

            }
        );

    }

});
