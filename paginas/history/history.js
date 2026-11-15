// Configuração da API apontando para o Render
const API_BASE_URL = "https://aws-security-analyzer-6ayz.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    loadHistoryData();
});

// Função para buscar e exibir o histórico completo (/api/reports/ ou endpoint de histórico equivalente)
async function loadHistoryData() {
    const container = document.getElementById("historyContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/`);
        const data = await response.json();
        
        container.innerHTML = "";

        const historyList = data.reports || (Array.isArray(data) ? data : []);

        if (!historyList.length) {
            container.innerHTML = "<p>Nenhum registro de auditoria encontrado no histórico.</p>";
            return;
        }

        historyList.forEach(item => {
            const title = item[1] || item.target || item.url || "Alvo Desconhecido";
            const type = item[2] || item.type || "Geral";
            const date = item[4] || item.date || item.created_at || "Data não informada";
            
            // Extrai o nome limpo do arquivo para o link de download/visualização
            const rawPath = item[3] || item.path || item.report_path || "";
            const fileName = rawPath.replace("storage\\reports\\", "").replace("storage/reports/", "").split(/[\\/]/).pop();
            const reportUrl = fileName ? `${API_BASE_URL}/api/reports/download/${fileName}` : "#";

            container.innerHTML += `
                <div class="report-card" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h4 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 4px;">
                            <i class="fa-solid fa-shield-halved" style="color: #06b6d4;"></i> ${title}
                        </h4>
                        <p style="color: #94a3b8; font-size: 0.85rem; margin: 2px 0;">
                            Tipo de Análise: ${type} | Realizada em: ${date}
                        </p>
                    </div>
                    <div>
                        <a href="${reportUrl}" target="_blank" style="background-color: #06b6d4; color: #0f172a; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Relatório
                        </a>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        container.innerHTML = "<p style='color: #ef4444;'>Erro ao conectar com o servidor para carregar o histórico.</p>";
    }
}