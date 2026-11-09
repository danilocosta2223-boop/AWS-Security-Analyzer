document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const htmlElement = document.documentElement;

    // Mapeamento dos links de tema CSS
    const themeLinks = {
        normalize: document.getElementById("normalize-theme"),
        global: document.getElementById("global-theme"),
        hero: document.getElementById("hero-theme"),
        cards: document.getElementById("cards-theme"),
        dashboard: document.getElementById("dashboard-theme"),
        desktop: document.getElementById("desktop-theme"),
        mobile: document.getElementById("mobile-theme"),
        style: document.getElementById("theme-style")
    };

    // Função para atualizar os caminhos de arquivos/imagens dependentes do tema
    function updateThemeAssets(isDark) {
        // Exemplo de atualização de elementos de imagem baseados no tema, caso possuam atributos específicos
        const thematicImages = document.querySelectorAll("[data-theme-image]");
        thematicImages.forEach(img => {
            const currentSrc = img.getAttribute("src");
            if (isDark) {
                img.src = currentSrc.replace("light-theme", "dark-theme");
            } else {
                img.src = currentSrc.replace("dark-theme", "light-theme");
            }
        });
    }

    // Evento de clique no botão de alternância
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = htmlElement.getAttribute("data-theme");
            const isDark = currentTheme === "dark";

            // Se atualmente está dark, muda para light; caso contrário, vai para dark
            const newTheme = isDark ? "light" : "dark";
            const targetFolder = newTheme === "dark" ? "styles-dark" : "styles-light";

            // Atualiza o atributo data-theme no HTML
            htmlElement.setAttribute("data-theme", newTheme);

            // Atualiza os caminhos dos arquivos CSS dinamicamente
            Object.keys(themeLinks).forEach(key => {
                if (themeLinks[key]) {
                    const currentHref = themeLinks[key].getAttribute("href");
                    // Substitui a pasta de estilos mantendo o nome do arquivo
                    const filename = currentHref.split("/").pop();
                    themeLinks[key].setAttribute("href", `/${targetFolder}/${filename}`);
                }
            });

            // Atualiza o ícone do botão (Lua para escuro, Sol para claro)
            if (themeIcon) {
                themeIcon.className = newTheme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
            }

            // Atualiza os caminhos das imagens (images/dark-theme <-> images/light-theme)
            updateThemeAssets(newTheme === "dark");

            // Opcional: Salvar preferência no localStorage
            localStorage.setItem("cybercheck_theme", newTheme);
        });
    }

    // Opcional: Carregar preferência salva anteriormente ao iniciar
    const savedTheme = localStorage.getItem("cybercheck_theme");
    if (savedTheme && savedTheme !== htmlElement.getAttribute("data-theme")) {
        // Dispara o clique ou aplica o estado salvo se necessário
        // themeToggle.click();
    }
});