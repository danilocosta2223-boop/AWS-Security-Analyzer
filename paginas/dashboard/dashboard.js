// dashboard.js - Cyber Shield Brasil

// URL base pura, sem tags HTML
const API_BASE_URL = window.location.origin.includes("127.0.0.1") || window.location.origin.includes("localhost")
    ? "http://127.0.0.1:5000"
    : "https://aws-security-analyzer-6ayz.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardStats();
    loadRealTimeReports();
});

// Função para buscar as estatísticas gerais do Dashboard
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById("total-scans").textContent = data.total_scans || 0;
            document.getElementById("total-reports").textContent = data.total_reports || 0;
            document.getElementById("latest-scan").textContent = data.latest_scan || "Nenhum";
        }
    } catch (error) {
        console.error("Erro ao carregar estatísticas do dashboard:", error);
    }
}

// Função para carregar os relatórios em tempo real e montar os botões de abertura
async function loadRealTimeReports() {
    const container = document.getElementById("realtime-reports-container");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/reports`);
        const data = await response.json();

        if (response.ok && data.reports && data.reports.length > 0) {
            container.innerHTML = ""; // Limpa o container

            data.reports.forEach(report => {
                // Extrai apenas o nome do arquivo do caminho (ex: report_20261114_101043.pdf)
                const reportFile = report.path.split(/[\\/]/).pop();
                const reportUrl = `${API_BASE_URL}/api/reports/download/${reportFile}`;

                const reportCard = document.createElement("div");
                reportCard.className = "report-card";
                reportCard.innerHTML = `
                    <div class="report-info">
                        <strong><i class="fa-solid fa-file-pdf"></i> ${reportFile}</strong>
                        <span>Tipo: ${report.type.toUpperCase()} | Data: ${report.date}</span>
                    </div>
                    <a href="${reportUrl}" target="_blank" class="btn-open-report" style="background-color:#06b6d4; color:#0f172a; padding:6px 12px; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:600;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Relatório
                    </a>
                `;
                container.appendChild(reportCard);
            });
        } else {
            container.innerHTML = "<p>Nenhum relatório recente encontrado.</p>";
        }
    } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
        container.innerHTML = "<p>Erro ao carregar relatórios do servidor.</p>";
    }
}