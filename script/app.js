/**
 * Alterna a aba ativa da aplicação concatenando o prefixo "tab-"
 * @param {string} tabId - O ID da aba sem o prefixo (ex: "home", "url-analyzer", "pass-checker")
 */
function switchTab(tabId) {
    console.log("Mudando para:", tabId);
    
    // Oculta todas as abas com a classe .tab-content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Procura o elemento pelo ID correto (ex: "tab-home")
    const targetTab = document.getElementById("tab-" + tabId);
    
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    
    // Rola suavemente até o topo da página ao mudar de aba
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/**
 * Alterna a visibilidade do menu mobile
 */
function toggleMobileMenu() {
    const menu = document.getElementById("mobile-menu");
    
    if (menu) {
        menu.classList.toggle("hidden");
    }
}

/**
 * Analisa a segurança de uma URL informada
 */
function analyzeURL() {
    const urlInput = document.getElementById("url-input");
    if (!urlInput) return;
    
    console.log("Analisando URL:", urlInput.value);
    // Lógica de análise de URL
}

/**
 * Avalia a força e segurança de uma senha
 */
function evaluatePassword() {
    const passInput = document.getElementById("password-input");
    if (!passInput) return;
    
    console.log("Avaliando senha...");
    // Lógica de avaliação de senha
}

/**
 * Detecta padrões de phishing em links ou emails
 */
function detectPhishing() {
    console.log("Executando detecção de Phishing...");
    // Lógica de detecção de phishing
}

/**
 * Verifica se um email/usuário consta em vazamentos de dados
 */
function checkBreach() {
    const emailInput = document.getElementById("email-input");
    if (!emailInput) return;
    
    console.log("Verificando vazamento para:", emailInput.value);
    // Lógica de verificação de vazamento
}

// Inicialização automática ao carregar o DOM
document.addEventListener("DOMContentLoaded", () => {
    console.log("CyberCheck carregado com sucesso");
    
    // Exibe a aba inicial (Home) por padrão
    switchTab("home");
});

// Controle do Menu Mobile e Abas
function switchTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(el => el.classList.add('hidden'));
    
    const target = document.getElementById(`tab-${tabId}`);
    if (target) {
        target.classList.remove('hidden');
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Botão de Alternância de Modo Escuro / Tema
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.documentElement.classList.toggle('dark');
        
        if (document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark')) {
            themeToggleBtn.innerHTML = '☀️ Modo Claro';
        } else {
            themeToggleBtn.innerHTML = '🌙 Modo Escuro';
        }
    });
}