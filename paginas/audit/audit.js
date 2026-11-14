// Configuração da API para o Flask local (127.0.0.1)
const API_BASE_URL = "http://127.0.0.1:5000";

// Executa ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    checkApiStatus();
    loadHistoryPreview();
});

// 1. Função para verificar o status da API Flask
async function checkApiStatus() {
    const apiStatusEl = document.getElementById("apiStatus");
    const apiVersionEl = document.getElementById("apiVersion");
    const backendTypeEl = document.getElementById("backendType");

    try {
        const response = await fetch(`${API_BASE_URL}/api`);
        if (response.ok) {
            const data = await response.json();
            apiStatusEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> API: Online';
            apiVersionEl.textContent = `Versão: ${data.version || "1.0.0"}`;
            backendTypeEl.textContent = `Backend: ${data.backend || "Flask"}`;
        } else {
            throw new Error("API Offline");
        }
    } catch (error) {
        apiStatusEl.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> API: Offline';
        apiVersionEl.textContent = "Versão: --";
        backendTypeEl.textContent = "Backend: Indisponível";
        console.error("Erro ao conectar com a API:", error);
    }
}

// 2. Função principal para Executar a Auditoria (/api/audit/full)
async function runAudit() {
    const urlInput = document.getElementById("urlInput");
    const target = urlInput.value.trim();
    const loadingEl = document.getElementById("loading");
    const jsonResultEl = document.getElementById("jsonResult");

    if (!target) {
        alert("Por favor, insira uma URL ou domínio válido.");
        urlInput.focus();
        return;
    }

    // Exibir loading e resetar interface
    loadingEl.style.display = "block";
    jsonResultEl.textContent = "Analisando alvo...";

    try {
        const response = await fetch(`${API_BASE_URL}/api/audit/full`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: target })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Erro ao realizar a auditoria.");
        }

        // Preencher o JSON de debug
        jsonResultEl.textContent = JSON.stringify(data, null, 2);

        // Atualizar Indicadores Rápidos (Score, Grade, Risco)
        updateSummary(data);

        // Atualizar Módulos Específicos
        updateModules(data);

        // Atualizar Histórico após nova auditoria
        loadHistoryPreview();

    } catch (error) {
        jsonResultEl.textContent = `Erro na execução: ${error.message}`;
        alert(`Erro: ${error.message}`);
    } finally {
        loadingEl.style.display = "none";
    }
}

// 3. Atualizar o bloco de Resumo / Score (Com suporte a PT/EN no Risco)
function updateSummary(data) {
    const scoreValueEl = document.getElementById("scoreValue");
    const gradeValueEl = document.getElementById("gradeValue");
    const riskValueEl = document.getElementById("riskValue");

    const score = data.score || 0;
    scoreValueEl.textContent = score;
    gradeValueEl.textContent = data.grade || "N/A";
    
    const risk = (data.risk || "DESCONHECIDO").toUpperCase();
    riskValueEl.textContent = risk;
    
    // Estilização dinâmica baseada no risco
    riskValueEl.className = "risk-badge";
    if (risk === "LOW" || risk === "BAIXO") {
        riskValueEl.style.backgroundColor = "#10b981";
    } else if (risk === "MEDIUM" || risk === "MÉDIO") {
        riskValueEl.style.backgroundColor = "#f59e0b";
    } else {
        riskValueEl.style.backgroundColor = "#ef4444";
    }
}

// 4. Preencher os Módulos de Resultado com tratamento seguro e compatível com o backend
function updateModules(data) {
    // SSL
    const sslStatusEl = document.getElementById("sslStatus");
    if (data.ssl) {
        sslStatusEl.innerHTML = `<strong>SSL/TLS:</strong> ${JSON.stringify(data.ssl)}`;
    } else {
        sslStatusEl.innerHTML = `<strong>SSL/TLS:</strong> Sem dados`;
    }

    // WHOIS
    const whoisStatusEl = document.getElementById("whoisStatus");
    if (data.whois) {
        whoisStatusEl.innerHTML = `<strong>WHOIS:</strong> ${JSON.stringify(data.whois)}`;
    } else {
        whoisStatusEl.innerHTML = `<strong>WHOIS:</strong> Sem dados`;
    }

    // Technology (Tratando o array interno data.technology.technologies)
    const technologyListEl = document.getElementById("technologyList");
    if (data.technology && data.technology.technologies && Array.isArray(data.technology.technologies)) {
        technologyListEl.innerHTML = `<strong>Tecnologias:</strong> ${data.technology.technologies.join(", ") || "Nenhuma detectada"}`;
    } else if (data.technology && Array.isArray(data.technology)) {
        technologyListEl.innerHTML = `<strong>Tecnologias:</strong> ${data.technology.join(", ")}`;
    } else {
        technologyListEl.innerHTML = `<strong>Tecnologias:</strong> Nenhuma detectada`;
    }

    // DNS
    const dnsStatusEl = document.getElementById("dnsStatus");
    if (data.dns) {
        dnsStatusEl.innerHTML = `<strong>DNS:</strong> ${JSON.stringify(data.dns)}`;
    } else {
        dnsStatusEl.innerHTML = `<strong>DNS:</strong> Sem dados`;
    }

    // Headers
    const headersStatusEl = document.getElementById("headersStatus");
    if (data.headers) {
        headersStatusEl.innerHTML = `<strong>Security Headers:</strong> ${JSON.stringify(data.headers)}`;
    } else {
        headersStatusEl.innerHTML = `<strong>Security Headers:</strong> Sem dados`;
    }
}

// 5. Carregar Histórico Rápido (Tratando result.history)
async function loadHistoryPreview() {
    const historyListEl = document.getElementById("historyList");
    historyListEl.innerHTML = "<li>Carregando histórico...</li>";

    try {
        const response = await fetch(`${API_BASE_URL}/api/history/`);
        if (response.ok) {
            const result = await response.json();
            const history = result.history || result.scans || [];
            
            historyListEl.innerHTML = "";

            if (history.length === 0) {
                historyListEl.innerHTML = "<li>Nenhuma auditoria recente.</li>";
                return;
            }

            history.slice(0, 5).forEach(item => {
                const li = document.createElement("li");
                li.textContent = `${item.target || item.url} - Score: ${item.score || "--"} (${item.date || ""})`;
                historyListEl.appendChild(li);
            });
        } else {
            historyListEl.innerHTML = "<li>Erro ao carregar histórico.</li>";
        }
    } catch (error) {
        historyListEl.innerHTML = "<li>Histórico indisponível.</li>";
    }
}