document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const htmlElement = document.documentElement;

    const themeLinks = {
        normalize: document.getElementById("normalize-theme"),
        hero: document.getElementById("hero-theme"),
        cards: document.getElementById("cards-theme"),
        desktop: document.getElementById("desktop-theme"),
        mobile: document.getElementById("mobile-theme"),
        style: document.getElementById("theme-style")
    };

    function updateThemeAssets(isDark) {
        const thematicImages = document.querySelectorAll("[data-theme-image]");
        thematicImages.forEach(img => {
            const currentSrc = img.getAttribute("src");
            if (!currentSrc) return;
            img.src = isDark
                ? currentSrc.replace("light-theme", "dark-theme").replace("logo-light", "logo-dark")
                : currentSrc.replace("dark-theme", "light-theme").replace("logo-dark", "logo-light");
        });
    }

    function triggerSmoothTransition() {
        htmlElement.classList.add("theme-transition");
        window.clearTimeout(window.__cybercheckThemeTransitionTimer);
        window.__cybercheckThemeTransitionTimer = window.setTimeout(() => {
            htmlElement.classList.remove("theme-transition");
        }, 350);
    }

    function applyTheme(theme, { logChange = false } = {}) {
        const normalizedTheme = theme === "light" ? "light" : "dark";
        const isDark = normalizedTheme === "dark";
        const targetFolder = isDark ? "styles-dark" : "styles-light";

        triggerSmoothTransition();
        htmlElement.setAttribute("data-theme", normalizedTheme);

        Object.values(themeLinks).forEach(link => {
            if (!link) return;
            const currentHref = link.getAttribute("href") || "";
            const filename = currentHref.split("/").pop();
            if (filename) {
                link.setAttribute("href", `${targetFolder}/${filename}`);
            }
        });

        if (themeIcon) {
            themeIcon.className = isDark ? "fa-solid fa-moon" : "fa-solid fa-sun";
        }

        updateThemeAssets(isDark);

        try {
            localStorage.setItem("cybercheck_theme", normalizedTheme);
        } catch (err) {
            console.warn("[CyberCheck] Nao foi possivel salvar o tema:", err?.message || err);
        }

        if (logChange) {
            console.log(`Tema alterado para ${normalizedTheme}`);
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = htmlElement.getAttribute("data-theme") || "dark";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            applyTheme(nextTheme, { logChange: true });
        });
    }

    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedTheme = localStorage.getItem("cybercheck_theme");
    const defaultTheme = savedTheme || (prefersDark ? "dark" : "light") || "dark";

    applyTheme(defaultTheme, { logChange: false });
});