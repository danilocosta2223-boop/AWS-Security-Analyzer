/* =====================================================
   CYBER SHIELD BRASIL
   AUDIT.JS
===================================================== */

console.log("audit.js carregado");

const API_URL = "http://127.0.0.1:5000";

console.log("API:", API_URL);

/* =====================================================
   ELEMENTOS
===================================================== */

const urlInput = document.getElementById("urlInput");
const runAuditBtn = document.getElementById("runAuditBtn");
const dashboard = document.getElementById("dashboard");
const apiStatus = document.getElementById("api-status");

/* =====================================================
   VALIDAÇÃO
===================================================== */

if (!urlInput) console.error("urlInput não encontrado");
if (!runAuditBtn) console.error("runAuditBtn não encontrado");
if (!dashboard) console.error("dashboard não encontrado");

/* =====================================================
   STATUS API
===================================================== */

async function checkApi() {

    if (!apiStatus) return;

    try {

        const response = await fetch(
            `${API_URL}/api`
        );

        if (response.ok) {
            apiStatus.innerHTML = "🟢 API Online";
        } else {
            apiStatus.innerHTML = "🔴 API Offline";
        }

    } catch (error) {

        console.error(error);

        apiStatus.innerHTML = "🔴 API Offline";
    }
}

/* =====================================================
   LOADING
===================================================== */

function showLoading() {

    dashboard.innerHTML = `
        <div class="loading-card">
            <h3>Executando auditoria...</h3>
            <p>Aguarde enquanto analisamos o domínio.</p>
        </div>
    `;
}

/* =====================================================
   ERROR
===================================================== */

function showError(message) {

    dashboard.innerHTML = `
        <div class="error-card">
            <h3>Erro</h3>
            <p>${message}</p>
        </div>
    `;
}

/* =====================================================
   SCORE
===================================================== */

function getGrade(score) {

    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";

    return "F";
}

function getRisk(score) {

    if (score >= 90) return "LOW";
    if (score >= 75) return "MEDIUM";
    if (score >= 50) return "HIGH";

    return "CRITICAL";
}

/* =====================================================
   FINDINGS
===================================================== */

function buildFindings(data) {

    const findings = [];

    if ((data.headers?.score || 0) < 50) {
        findings.push("Missing Security Headers");
    }

    if ((data.ssl?.score || 0) < 70) {
        findings.push("SSL Weak Configuration");
    }

    if ((data.whois?.score || 0) < 70) {
        findings.push("WHOIS Information Incomplete");
    }

    if (data.owasp?.clickjacking) {
        findings.push("Clickjacking Risk");
    }

    return findings.length
        ? findings
        : ["Nenhum problema crítico identificado"];
}

/* =====================================================
   RECOMMENDATIONS
===================================================== */

function buildRecommendations(data) {

    const recommendations = [];

    if ((data.headers?.score || 0) < 50) {

        recommendations.push(
            "Adicionar Referrer-Policy"
        );

        recommendations.push(
            "Adicionar Permissions-Policy"
        );

        recommendations.push(
            "Adicionar Strict-Transport-Security"
        );
    }

    if ((data.ssl?.score || 0) < 70) {

        recommendations.push(
            "Atualizar SSL/TLS"
        );
    }

    if (data.owasp?.clickjacking) {

        recommendations.push(
            "Configurar X-Frame-Options"
        );
    }

    if ((data.whois?.score || 0) < 70) {

        recommendations.push(
            "Atualizar informações WHOIS"
        );
    }

    return recommendations.length
        ? recommendations
        : ["Manter monitoramento contínuo"];
}

/* =====================================================
   AUDIT INFO
===================================================== */

function updateAuditInfo(url, startTime) {

    const now = new Date();

    const date =
        now.toLocaleDateString("pt-BR");

    const time =
        now.toLocaleTimeString("pt-BR");

    const duration =
        (
            (Date.now() - startTime) / 1000
        ).toFixed(2);

    const urlEl =
        document.getElementById("audit-url");

    const dateEl =
        document.getElementById("audit-date");

    const timeEl =
        document.getElementById("audit-time");

    const durationEl =
        document.getElementById("audit-duration");

    if (urlEl) urlEl.textContent = url;
    if (dateEl) dateEl.textContent = date;
    if (timeEl) timeEl.textContent = time;

    if (durationEl) {
        durationEl.textContent =
            `${duration} segundos`;
    }
}

/* =====================================================
   BREAKDOWN
===================================================== */

function renderBreakdown(data) {

    const breakdown =
        document.getElementById(
            "security-breakdown"
        );

    if (!breakdown) return;

    breakdown.innerHTML = `

        <div class="module-card">
            <h4>SSL</h4>
            <span>${data.ssl?.score ?? 0}</span>
        </div>

        <div class="module-card">
            <h4>Headers</h4>
            <span>${data.headers?.score ?? 0}</span>
        </div>

        <div class="module-card">
            <h4>DNS</h4>
            <span>${data.dns?.score ?? 0}</span>
        </div>

        <div class="module-card">
            <h4>WHOIS</h4>
            <span>${data.whois?.score ?? 0}</span>
        </div>

        <div class="module-card">
            <h4>OWASP</h4>
            <span>${data.owasp?.score ?? 0}</span>
        </div>

        <div class="module-card">
            <h4>Recon</h4>
            <span>${data.recon?.score ?? 0}</span>
        </div>

    `;
}

/* =====================================================
   TECHNOLOGIES
===================================================== */

function renderTech(data) {

    const tech =
        document.getElementById(
            "technology-section"
        );

    if (!tech) return;

    const list =
        data.technologies || [];

    if (!list.length) {

        tech.innerHTML =
            "<p>Nenhuma tecnologia detectada.</p>";

        return;
    }

    tech.innerHTML =
        list.map(item => `
            <div class="module-card">
                ${item}
            </div>
        `).join("");
}

/* =====================================================
   DASHBOARD
===================================================== */

function renderDashboard(data) {

    const score =
        Number(data.score || 0);

    const grade =
        getGrade(score);

    const risk =
        getRisk(score);

    const findings =
        buildFindings(data);

    const recommendations =
        buildRecommendations(data);

    dashboard.innerHTML = `

    <div class="result-card">

        <div class="result-header">

            <div class="score-circle">
                ${score}
            </div>

            <div class="score-details">

                <h2>
                    Grade ${grade}
                </h2>

                <span class="risk-badge">
                    ${risk}
                </span>

            </div>

        </div>

        <div class="audit-section">

            <h3>Executive Summary</h3>

            <p>
                Score ${score},
                classificação ${grade}
                e risco ${risk}.
            </p>

        </div>

        <div class="audit-section">

            <h3>Findings</h3>

            <ul>
                ${findings.map(item =>
        `<li>${item}</li>`
    ).join("")}
            </ul>

        </div>

        <div class="audit-section">

            <h3>Recommendations</h3>

            <ul>
                ${recommendations.map(item =>
        `<li>${item}</li>`
    ).join("")}
            </ul>

        </div>

    </div>

    `;
}

/* =====================================================
   RUN AUDIT
===================================================== */

async function runAudit() {

    const startTime = Date.now();

    try {

        const url =
            urlInput.value.trim();

        if (!url) {

            showError(
                "Informe uma URL válida."
            );

            return;
        }

        console.log(
            "Executando auditoria:"
        );

        console.log(url);

        showLoading();

        const response = await fetch(
            `${API_URL}/api/audit/full`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    url
                })
            }
        );

        console.log(
            "Status:",
            response.status
        );

        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(data);

        updateAuditInfo(
            url,
            startTime
        );

        renderDashboard(data);

        renderBreakdown(data);

        renderTech(data);

    } catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Erro ao executar auditoria."
        );
    }
}

/* =====================================================
   EVENTOS
===================================================== */

if (runAuditBtn) {

    runAuditBtn.addEventListener(
        "click",
        runAudit
    );
}

/* =====================================================
   START
===================================================== */

checkApi();

/* =====================================================
   GLOBAL
===================================================== */

window.runAudit = runAudit;