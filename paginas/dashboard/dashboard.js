// Configuração da API apontando para o Render
const API_BASE_URL =
    "https://aws-security-analyzer-6ayz.onrender.com";

document.addEventListener(
    "DOMContentLoaded",
    () => {
        checkHealth();
        loadDashboardData();
        loadReports();
        setInterval(
            loadReports,
            10000
        );
    }
);

// 0. Verificação de saúde do backend (acorda o Render se estiver em sleep)
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log("Status de saúde do backend:", data);
    } catch (error) {
        console.error("Backend indisponível ou hibernando:", error);
    }
}

// 1. Função para buscar e exibir os dados principais do Dashboard (/api/dashboard/)
async function loadDashboardData() {
    const systemStatusEl = document.getElementById("systemStatus");
    const totalScansEl = document.getElementById("totalScans");
    const totalReportsEl = document.getElementById("totalReports");
    const latestScanEl = document.getElementById("latestScan");

    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/`);
        if (response.ok) {
            const data = await response.json();
            
            systemStatusEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Sistema: ${data.status || "Online"}`;
            totalScansEl.textContent = data.total_scans !== undefined ? data.total_scans : "0";
            totalReportsEl.textContent = data.total_reports !== undefined ? data.total_reports : "0";
            latestScanEl.textContent = data.latest_scan || "Nenhuma análise recente";
        } else {
            throw new Error("Erro ao carregar dados do dashboard");
        }
    } catch (error) {
        systemStatusEl.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Sistema: Offline / Erro de Conexão';
        totalScansEl.textContent = "--";
        totalReportsEl.textContent = "--";
        latestScanEl.textContent = "Indisponível";
        console.error("Erro no Dashboard:", error);
    }
}

// 2. Função para buscar e exibir os Relatórios em Tempo Real (/api/reports/)
async function loadReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/`);
        const data = await response.json();
        
        const container = document.getElementById("reportsContainer");
        if (!container) return;

        container.innerHTML = "";

        const reportsList = data.reports || (Array.isArray(data) ? data : []);

        if (!reportsList.length) {
            container.innerHTML = "<p>Nenhum relatório encontrado.</p>";
            return;
        }

        reportsList.forEach(report => {
            const title = report[1] || report.target || report.url || "Alvo Desconhecido";
            const type = report[2] || report.type || "Geral";
            const date = report[4] || report.date || report.created_at || "Data não informada";

            container.innerHTML += `
                <div class="report-card" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h4 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 4px;">
                            <i class="fa-solid fa-file-shield" style="color: #06b6d4;"></i> ${title}
                        </h4>
                        <p style="color: #94a3b8; font-size: 0.85rem; margin: 2px 0;">
                            Tipo: ${type} | Data: ${date}
                        </p>
                    </div>
                    <div>
                        <a href="#" onclick="alert('Funcionalidade de download direto em breve.'); return false;" style="background-color: #06b6d4; color: #0f172a; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Relatório
                        </a>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
        const container = document.getElementById("reportsContainer");
        if (container) {
            container.innerHTML = "<p style='color: #ef4444;'>Erro ao carregar relatórios em tempo real.</p>";
        }
    }
}