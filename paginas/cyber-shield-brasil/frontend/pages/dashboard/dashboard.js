document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

    }
);

async function loadDashboard() {

    const dashboard =
        document.getElementById(
            "dashboard-container"
        );

    try {

        const data = {

            averageScore: 91,

            totalAudits: 85,

            totalHosts: 40,

            criticalRisks: 2,

            highRisks: 7,

            mediumRisks: 11,

            lowRisks: 26,

            lastAudit:
                "teams.cloud.microsoft",

            environment:
                "HEALTHY"

        };

        dashboard.innerHTML = `

        <div class="stats-grid">

            ${createStatCard(
                "🛡 Score Médio",
                data.averageScore
            )}

            ${createStatCard(
                "📊 Auditorias",
                data.totalAudits
            )}

            ${createStatCard(
                "🌐 Hosts",
                data.totalHosts
            )}

            ${createStatCard(
                "🔴 Críticos",
                data.criticalRisks
            )}

            ${createStatCard(
                "🟠 Altos",
                data.highRisks
            )}

            ${createStatCard(
                "🟡 Médios",
                data.mediumRisks
            )}

            ${createStatCard(
                "🟢 Baixos",
                data.lowRisks
            )}

            ${createStatCard(
                "🔍 Última Auditoria",
                data.lastAudit
            )}

        </div>

        <div class="status-card">

            <h2>

                Ambiente

            </h2>

            <div class="healthy">

                ✅ ${data.environment}

            </div>

        </div>

        `;

    }

    catch(error){

        console.error(error);

        dashboard.innerHTML = `

            <h2>

                Erro ao carregar Dashboard

            </h2>

        `;
    }

}



function createStatCard(
    title,
    value
){

    return `

        <div class="card">

            <h3>

                ${title}

            </h3>

            <div class="value">

                ${value}

            </div>

        </div>

    `;
}