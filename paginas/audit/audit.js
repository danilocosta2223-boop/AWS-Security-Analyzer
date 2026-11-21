// ==========================================
// BLOCO 01: Configuracoes, Endpoints e Seletores
// ==========================================
const LOCAL_DEV_ORIGIN = "http://localhost:5287";
const PROD_API_ORIGIN = "https://aws-security-analyzer-6ayz.onrender.com";

const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? LOCAL_DEV_ORIGIN
    : PROD_API_ORIGIN;

const ENDPOINTS = {
  HEALTH: "/api/health",
  VIRUSTOTAL: "/api/virustotal",
  AUDIT: "/api/audit"
};

const ACTIVE_AUDIT_ENDPOINT = ENDPOINTS.AUDIT;
const FALLBACK_AUDIT_ENDPOINT = ENDPOINTS.VIRUSTOTAL;
const HISTORY_STORAGE_KEY = "cybercheck_audit_history_v1";
const MAX_HISTORY_ITEMS = 10;
const HEALTH_INTERVAL_MS = 30000;

const auditForm = document.getElementById("auditForm") || document.querySelector("form");
const runAuditBtn = document.getElementById("runAuditBtn");
const urlInput = document.getElementById("urlInput");
const loadingEl = document.getElementById("loading");
const auditProgressBar = document.getElementById("auditProgressBar");
const analysisTimeEl = document.getElementById("analysisTime");
const jsonResult = document.getElementById("jsonResult");
const historyList = document.getElementById("historyList");
const virusTotalStatus = document.getElementById("virusTotalStatus");

const apiStatusEl = document.getElementById("apiStatus");
const apiVersionEl = document.getElementById("apiVersion");
const backendTypeEl = document.getElementById("backendType");

const scoreEl = document.getElementById("scoreValue");
const gradeEl = document.getElementById("gradeValue");
const riskEl = document.getElementById("riskValue");

const sslStatusEl = document.getElementById("sslStatus");
const whoisStatusEl = document.getElementById("whoisStatus");
const technologyListEl = document.getElementById("technologyList");
const reconResultEl = document.getElementById("recon-result");
const dnsStatusEl = document.getElementById("dnsStatus");
const headersStatusEl = document.getElementById("headersStatus");

const exportPdfBtn = document.getElementById("exportPdf");
const exportHtmlBtn = document.getElementById("exportHtml");
const exportCsvBtn = document.getElementById("exportCsv");

let lastAuditPayload = null;
let scoreAnimationTimer = null;
let activeAuditController = null;

// ==========================================
// BLOCO 02: Funcoes Utilitarias, Progresso e Validacao
// ==========================================
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidHttpUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function extractVirusTotalCounts(data) {
  const vt = data?.virustotal ?? data ?? {};
  const stats = vt?.stats || vt?.data?.attributes?.stats || null;
  const harmless = Math.max(0, Number(stats?.harmless ?? vt?.harmless ?? 0));
  const suspicious = Math.max(0, Number(stats?.suspicious ?? vt?.suspicious ?? 0));
  const malicious = Math.max(0, Number(stats?.malicious ?? vt?.malicious ?? 0));
  const status = String(vt?.status ?? data?.status ?? "clean");

  return { harmless, suspicious, malicious, status };
}

function setLoadingState(isLoading) {
  if (loadingEl) {
    loadingEl.style.display = isLoading ? "block" : "none";
  }
  if (runAuditBtn) {
    runAuditBtn.disabled = isLoading;
  }
}

function setStatusBadge(text, state = "idle") {
  if (!virusTotalStatus) return;
  virusTotalStatus.dataset.state = state;

  let badgeLine = document.getElementById("auditStepBadge");
  if (!badgeLine) {
    badgeLine = document.createElement("div");
    badgeLine.id = "auditStepBadge";
    badgeLine.className = "audit-step-badge";
    badgeLine.style.marginTop = "6px";
    badgeLine.style.fontWeight = "600";
    virusTotalStatus.appendChild(badgeLine);
  }
  badgeLine.textContent = text;
}

function updateAuditStep(message) {
  setStatusBadge(message, "loading");
}

function updateProgress(percent) {
  const bar = auditProgressBar || document.getElementById("auditProgressBar");
  if (!bar) return;
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  bar.style.width = `${clamped}%`;
}

function renderAnalysisTime(startedAt) {
  const targetTimeEl = analysisTimeEl || document.getElementById("analysisTime");
  if (!targetTimeEl || typeof startedAt !== "number") return;
  const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);
  targetTimeEl.textContent = `${elapsedSeconds}s`;
}

function calculateSecurityScore(inputOrMalicious, suspiciousArg = 0) {
  let malicious = 0;
  let suspicious = 0;

  if (typeof inputOrMalicious === "object" && inputOrMalicious !== null) {
    if (typeof inputOrMalicious?.score === "number") {
      return Math.max(0, Math.min(100, inputOrMalicious.score));
    }
    const counts = extractVirusTotalCounts(inputOrMalicious);
    malicious = counts.malicious;
    suspicious = counts.suspicious;
  } else {
    malicious = Math.max(0, Number(inputOrMalicious ?? 0));
    suspicious = Math.max(0, Number(suspiciousArg ?? 0));
  }

  return Math.max(0, Math.min(100, 100 - malicious * 25 - suspicious * 10));
}

function computeSecuritySummary(data) {
  const { harmless, suspicious, malicious, status } = extractVirusTotalCounts(data);

  const score = typeof data?.score === "number"
    ? Math.max(0, Math.min(100, data.score))
    : calculateSecurityScore(malicious, suspicious);

  const detections = malicious + suspicious;
  const risk = ["LOW", "MEDIUM", "HIGH"].includes(String(data?.risk ?? "").toUpperCase())
    ? String(data.risk).toUpperCase()
    : malicious > 0 ? "HIGH" : suspicious > 0 ? "MEDIUM" : "LOW";

  const grade = detections === 0 ? "Sem deteccoes" : `${detections} deteccao(oes)`;

  return { malicious, suspicious, harmless, status, score, risk, grade };
}

// ==========================================
// BLOCO 03: Score Animado, Risco e Graficos
// ==========================================
function animateScore(target) {
  const el = scoreEl || document.getElementById("scoreValue");
  if (!el) return;

  if (scoreAnimationTimer) {
    clearInterval(scoreAnimationTimer);
    scoreAnimationTimer = null;
  }

  const finalTarget = Math.max(0, Math.min(100, Math.round(Number(target) || 0)));
  let current = 0;
  el.textContent = "0";

  if (finalTarget === 0) {
    return;
  }

  const step = Math.max(1, Math.ceil(finalTarget / 25));

  scoreAnimationTimer = setInterval(() => {
    current = Math.min(finalTarget, current + step);
    el.textContent = String(current);

    if (current >= finalTarget) {
      clearInterval(scoreAnimationTimer);
      scoreAnimationTimer = null;
    }
  }, 15);
}

function applyScoreAndRisk(scoreNumber, riskLevel) {
  const scoreTargetEl = scoreEl || document.getElementById("scoreValue");
  const riskTargetEl = riskEl || document.getElementById("riskValue");
  const gradeTargetEl = gradeEl || document.getElementById("gradeValue");

  const clampedScore = Math.max(0, Math.min(100, Number(scoreNumber) || 0));
  const normalizedRisk = ["LOW", "MEDIUM", "HIGH"].includes(String(riskLevel).toUpperCase())
    ? String(riskLevel).toUpperCase()
    : clampedScore >= 90 ? "LOW" : clampedScore >= 60 ? "MEDIUM" : "HIGH";

  const band = clampedScore >= 90 ? "high" : clampedScore >= 60 ? "medium" : "low";
  const letterGrade = clampedScore >= 90 ? "A" : clampedScore >= 80 ? "B" : clampedScore >= 60 ? "C" : "D";

  if (scoreTargetEl) {
    scoreTargetEl.dataset.scoreBand = band;
    scoreTargetEl.classList.remove("score-high", "score-medium", "score-low");
    scoreTargetEl.classList.add(`score-${band}`);
    animateScore(clampedScore);
  }

  if (riskTargetEl) {
    riskTargetEl.textContent = normalizedRisk;
    riskTargetEl.dataset.risk = normalizedRisk;
    riskTargetEl.classList.remove("risk-low", "risk-medium", "risk-high");
    riskTargetEl.classList.add(`risk-${normalizedRisk.toLowerCase()}`);
  }

  if (gradeTargetEl) {
    gradeTargetEl.textContent = `Nota ${letterGrade} — ${normalizedRisk}`;
  }
}

function renderAuditCharts(data) {
  const resultsContainer = document.getElementById("audit-results");
  if (!resultsContainer) return;

  const { harmless, suspicious, malicious } = extractVirusTotalCounts(data);
  const totalEngines = Math.max(1, harmless + suspicious + malicious);

  const score = calculateSecurityScore(data);
  const strokeColor =
    score >= 90 ? "#16a34a" : score >= 60 ? "#eab308" : "#dc2626";

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  const harmlessPct = Math.round((harmless / totalEngines) * 100);
  const suspiciousPct = Math.round((suspicious / totalEngines) * 100);
  const maliciousPct = Math.round((malicious / totalEngines) * 100);

  let chartBox = document.getElementById("auditChartHighlight");
  if (!chartBox) {
    chartBox = document.createElement("div");
    chartBox.id = "auditChartHighlight";
    chartBox.className = "audit-chart-card";
    resultsContainer.prepend(chartBox);
  }

  chartBox.innerHTML = `
    <h3><i class="fa-solid fa-chart-column"></i> Painel Visual de Deteccoes e Score</h3>
    <div class="audit-chart-grid">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-label="Grafico circular de pontuacao">
        <circle
          cx="70"
          cy="70"
          r="${radius}"
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          stroke-width="12"
        />
        <circle
          cx="70"
          cy="70"
          r="${radius}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="12"
          stroke-linecap="round"
          stroke-dasharray="${circumference.toFixed(2)}"
          stroke-dashoffset="${dashOffset.toFixed(2)}"
          transform="rotate(-90 70 70)"
        />
        <text
          x="70"
          y="66"
          text-anchor="middle"
          fill="#f8fafc"
          font-size="24"
          font-weight="700"
        >${score}</text>
        <text
          x="70"
          y="86"
          text-anchor="middle"
          fill="#94a3b8"
          font-size="11"
          font-weight="600"
        >SCORE / 100</text>
      </svg>

      <div class="metric-bars">
        <div class="metric-row">
          <div class="metric-label-row">
            <span>Harmless (Limpos)</span>
            <span>${harmless} (${harmlessPct}%)</span>
          </div>
          <div class="metric-track">
            <div class="metric-fill harmless" style="width: ${harmlessPct}%;"></div>
          </div>
        </div>

        <div class="metric-row">
          <div class="metric-label-row">
            <span>Suspicious (Suspeitos)</span>
            <span>${suspicious} (${suspiciousPct}%)</span>
          </div>
          <div class="metric-track">
            <div class="metric-fill suspicious" style="width: ${suspiciousPct}%;"></div>
          </div>
        </div>

        <div class="metric-row">
          <div class="metric-label-row">
            <span>Malicious (Maliciosos)</span>
            <span>${malicious} (${maliciousPct}%)</span>
          </div>
          <div class="metric-track">
            <div class="metric-fill malicious" style="width: ${maliciousPct}%;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// BLOCO 04: Mapeamento dos Modulos, JSON e Historico
// ==========================================
function formatFriendlyLabel(key) {
  const labels = {
    enabled: "HTTPS Ativo",
    scheme: "Protocolo",
    statusCode: "Status HTTP",
    detail: "Detalhe",
    domain: "Domínio",
    tld: "TLD",
    source: "Fonte",
    robotsReachable: "robots.txt Acessível",
    sitemapReachable: "sitemap.xml Acessível",
    checkedPaths: "Caminhos Verificados",
    host: "Host",
    addresses: "Endereços IP",
    hostName: "Hostname",
    server: "Servidor",
    poweredBy: "X-Powered-By",
    hasStrictTransportSecurity: "HSTS",
    hasContentSecurityPolicy: "CSP",
    hasXFrameOptions: "X-Frame-Options"
  };

  if (labels[key]) return labels[key];

  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function formatFriendlyValue(value) {
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Nenhum";
  }
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${formatFriendlyLabel(k)}: ${formatFriendlyValue(v)}`)
      .join(" | ");
  }
  return String(value);
}

function renderModuleCardContent(value, emptyLabel) {
  if (value === null || value === undefined || value === "") {
    return `<div class="module-empty">Aguardando dados do backend (${escapeHtml(emptyLabel)}).</div>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<div class="module-empty">Nenhuma informação encontrada.</div>`;
    }
    return `
      <ul class="module-list">
        ${value.map((item) => `<li>${escapeHtml(formatFriendlyValue(item))}</li>`).join("")}
      </ul>
    `;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return `<div class="module-empty">Sem detalhes adicionais.</div>`;
    }
    return `
      <div class="module-rows">
        ${entries
          .map(
            ([k, v]) => `
              <div class="module-row">
                <span class="module-key">${escapeHtml(formatFriendlyLabel(k))}:</span>
                <span class="module-val">${escapeHtml(formatFriendlyValue(v))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  return `<div class="module-row"><span class="module-val">${escapeHtml(formatFriendlyValue(value))}</span></div>`;
}

function renderModuleResults(payload) {
  const { harmless, suspicious, malicious, status } = extractVirusTotalCounts(payload);
  const safeStatus = escapeHtml(status);
  const currentStepText = document.getElementById("auditStepBadge")?.textContent ?? "";

  if (virusTotalStatus) {
    virusTotalStatus.innerHTML = `
      <div><strong>Status:</strong> ${safeStatus}</div>
      <div><strong>Harmless:</strong> ${harmless} | <strong>Suspicious:</strong> ${suspicious} | <strong>Malicious:</strong> ${malicious}</div>
    `;
    if (currentStepText) {
      setStatusBadge(currentStepText, virusTotalStatus.dataset.state || "success");
    }
  }

  if (sslStatusEl) {
    sslStatusEl.innerHTML = renderModuleCardContent(payload?.ssl, "SSL/TLS");
  }

  if (whoisStatusEl) {
    whoisStatusEl.innerHTML = renderModuleCardContent(payload?.whois, "WHOIS");
  }

  if (technologyListEl) {
    technologyListEl.innerHTML = renderModuleCardContent(payload?.technologies, "Tecnologias");
  }

  const reconTarget = document.getElementById("reconStatus") || reconResultEl;
  if (reconTarget) {
    const reconMarkup = renderModuleCardContent(payload?.recon, "Recon");
    if (reconTarget.id === "recon-result") {
      reconTarget.innerHTML = `<h3><i class="fa-solid fa-radar"></i> Recon (Robots / Sitemap / Exposure)</h3>${reconMarkup}`;
    } else {
      reconTarget.innerHTML = reconMarkup;
    }
  }

  if (dnsStatusEl) {
    dnsStatusEl.innerHTML = renderModuleCardContent(payload?.dns, "DNS");
  }

  if (headersStatusEl) {
    headersStatusEl.innerHTML = renderModuleCardContent(payload?.headers, "Headers HTTP");
  }
}

function renderJsonOutput(payload) {
  if (!jsonResult) return;
  jsonResult.textContent =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

function renderSecuritySummary(summary) {
  applyScoreAndRisk(summary.score, summary.risk);
}

function renderHistoryItemMarkup(entry) {
  return `
    <span class="history-time">${escapeHtml(entry.time)}</span>
    <span class="history-url">${escapeHtml(entry.url)}</span>
    <span class="history-status">Score: ${escapeHtml(entry.score)} (${escapeHtml(entry.risk)}) | Status: ${escapeHtml(entry.status)} | Malicious: ${escapeHtml(entry.malicious)}</span>
  `;
}

function createHistoryListElement(entry) {
  const li = document.createElement("li");
  li.className = "history-item";
  li.innerHTML = renderHistoryItemMarkup(entry);
  li.addEventListener("click", () => {
    if (urlInput && entry?.url) {
      urlInput.value = entry.url;
      urlInput.focus();
    }
  });
  return li;
}

function saveHistoryEntry(entry) {
  try {
    const current = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    const next = [entry, ...current].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("Nao foi possivel salvar historico no localStorage:", err);
  }
}

function loadHistoryFromStorage() {
  if (!historyList) return;
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    historyList.innerHTML = "";
    saved.slice(0, MAX_HISTORY_ITEMS).forEach((entry) => {
      historyList.appendChild(createHistoryListElement(entry));
    });
  } catch (err) {
    console.warn("Nao foi possivel carregar historico do localStorage:", err);
  }
}

function appendHistoryItem(urlValue, statusText, maliciousCount, scoreValue, riskValue) {
  if (!historyList) return;

  const entry = {
    time: new Date().toLocaleTimeString("pt-BR"),
    url: urlValue,
    status: statusText,
    malicious: maliciousCount,
    score: scoreValue,
    risk: riskValue
  };

  historyList.prepend(createHistoryListElement(entry));
  while (historyList.children.length > MAX_HISTORY_ITEMS) {
    historyList.removeChild(historyList.lastElementChild);
  }

  saveHistoryEntry(entry);
}

// ==========================================
// BLOCO 05: Exportacao de Relatorios (CSV, HTML, PDF)
// ==========================================
function triggerFileDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportAuditCsv() {
  if (!lastAuditPayload) {
    renderJsonOutput({ aviso: "Execute uma auditoria antes de exportar CSV." });
    return;
  }

  const { harmless, suspicious, malicious, status } = extractVirusTotalCounts(lastAuditPayload);
  const headers = ["target", "score", "risk", "status", "harmless", "suspicious", "malicious", "checkedAt"];
  const row = [
    lastAuditPayload.target,
    lastAuditPayload.score,
    lastAuditPayload.risk,
    status,
    harmless,
    suspicious,
    malicious,
    lastAuditPayload.checkedAt
  ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`);

  triggerFileDownload(
    "cybercheck-audit.csv",
    `${headers.join(",")}\n${row.join(",")}`,
    "text/csv;charset=utf-8;"
  );
}

function exportAuditHtml() {
  if (!lastAuditPayload) {
    renderJsonOutput({ aviso: "Execute uma auditoria antes de exportar HTML." });
    return;
  }

  const htmlReport = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatorio CyberCheck PRO</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>CyberCheck PRO — Relatorio de Auditoria</h1>
  <p><strong>Alvo:</strong> ${escapeHtml(lastAuditPayload.target)}</p>
  <p><strong>Score:</strong> ${escapeHtml(lastAuditPayload.score)} / 100 | <strong>Risco:</strong> ${escapeHtml(lastAuditPayload.risk)}</p>
  <p><strong>Data/Hora:</strong> ${escapeHtml(lastAuditPayload.checkedAt)}</p>
  <pre>${escapeHtml(JSON.stringify(lastAuditPayload, null, 2))}</pre>
</body>
</html>`;

  triggerFileDownload("cybercheck-audit.html", htmlReport, "text/html;charset=utf-8;");
}

// ==========================================
// BLOCO 06: Comunicacao com a API (Health & Audit)
// ==========================================
async function checkApiHealth() {
  if (!apiStatusEl) return;

  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.HEALTH}`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    apiStatusEl.textContent = `API Online (${data?.status ?? "healthy"})`;
    if (apiVersionEl) {
      apiVersionEl.textContent = `Aplicacao: ${data?.application ?? "Cyber Shield API"}`;
    }
    if (backendTypeEl) {
      backendTypeEl.textContent = data?.timestamp
        ? `Timestamp: ${data.timestamp}`
        : "Backend: ASP.NET Core";
    }
  } catch (error) {
    apiStatusEl.textContent = `API Offline (${error?.message || "erro"})`;
    if (apiVersionEl) {
      apiVersionEl.textContent = "Aplicacao: --";
    }
    if (backendTypeEl) {
      backendTypeEl.textContent = `Verifique ${API_BASE_URL} e CORS`;
    }
  }
}

async function requestAuditPayload(targetUrl, signal) {
  const payloadBody = JSON.stringify({ url: targetUrl });
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  let response = await fetch(`${API_BASE_URL}${ACTIVE_AUDIT_ENDPOINT}`, {
    method: "POST",
    headers,
    body: payloadBody,
    signal
  });

  if (response.status === 404 && ACTIVE_AUDIT_ENDPOINT !== FALLBACK_AUDIT_ENDPOINT) {
    response = await fetch(`${API_BASE_URL}${FALLBACK_AUDIT_ENDPOINT}`, {
      method: "POST",
      headers,
      body: payloadBody,
      signal
    });
  }

  const rawBody = await response.text();
  let parsedData;

  try {
    parsedData = JSON.parse(rawBody);
  } catch {
    parsedData = { raw: rawBody };
  }

  return { response, parsedData };
}

async function runUrlAudit(targetUrl) {
  if (activeAuditController) {
    activeAuditController.abort();
  }
  const controller = new AbortController();
  activeAuditController = controller;

  const startedAt = performance.now();
  setLoadingState(true);
  updateProgress(10);
  updateAuditStep("Conectando ao backend...");
  renderJsonOutput(`Enviando requisicao POST para ${API_BASE_URL}${ACTIVE_AUDIT_ENDPOINT} ...`);

  try {
    updateProgress(30);
    updateAuditStep("Consultando auditoria de seguranca...");

    const { response, parsedData } = await requestAuditPayload(targetUrl, controller.signal);

    if (controller.signal.aborted) return;

    if (!response.ok) {
      updateProgress(0);
      setStatusBadge(`Erro HTTP ${response.status}`, "error");
      renderAnalysisTime(startedAt);
      renderJsonOutput({
        error: `Falha na requisicao (HTTP ${response.status})`,
        details: parsedData
      });
      return;
    }

    updateProgress(60);
    updateAuditStep("Calculando Score...");
    const summary = computeSecuritySummary(parsedData);

    const consolidatedPayload = {
      target: targetUrl,
      checkedAt: new Date().toISOString(),
      score: summary.score,
      risk: summary.risk,
      virustotal: parsedData?.virustotal ?? parsedData,
      ssl: parsedData?.ssl ?? null,
      whois: parsedData?.whois ?? null,
      technologies: parsedData?.technologies ?? null,
      recon: parsedData?.recon ?? null,
      dns: parsedData?.dns ?? null,
      headers: parsedData?.headers ?? null
    };

    lastAuditPayload = consolidatedPayload;

    updateProgress(90);
    updateAuditStep("Atualizando Dashboard...");
    renderSecuritySummary(summary);
    renderAuditCharts(consolidatedPayload);
    renderJsonOutput(consolidatedPayload);
    appendHistoryItem(
      targetUrl,
      summary.status,
      summary.malicious,
      summary.score,
      summary.risk
    );

    renderAnalysisTime(startedAt);
    updateProgress(100);
    setStatusBadge("Auditoria concluida", "success");
    renderModuleResults(consolidatedPayload);
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    const message = error?.message || "Failed to fetch";
    updateProgress(0);
    renderAnalysisTime(startedAt);
    setStatusBadge("Erro de conexao", "error");
    renderJsonOutput({
      error: message,
      hint: `Verifique se a API esta acessivel em ${API_BASE_URL} e se o CORS esta habilitado no Program.cs.`
    });
    console.error("Erro ao executar auditoria:", error);
  } finally {
    if (activeAuditController === controller) {
      activeAuditController = null;
      setLoadingState(false);
    }
  }
}

// ==========================================
// BLOCO 07: Inicializacao de Eventos
// ==========================================
function handleAuditSubmit(event) {
  if (event) event.preventDefault();

  const targetUrl = urlInput ? urlInput.value.trim() : "";

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    renderJsonOutput({
      erro: "URL inválida",
      detalhe: "Digite uma URL válida começando com https:// ou http://"
    });
    if (urlInput) urlInput.focus();
    return;
  }

  runUrlAudit(targetUrl);
}

if (auditForm) {
  auditForm.addEventListener("submit", handleAuditSubmit);
} else if (urlInput) {
  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAuditSubmit(event);
    }
  });
}

document.querySelectorAll(".quick-url-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const quickUrl = btn.dataset.url;
    if (!quickUrl || !urlInput) return;
    urlInput.value = quickUrl;
    runUrlAudit(quickUrl);
  });
});

if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", exportAuditCsv);
}

if (exportHtmlBtn) {
  exportHtmlBtn.addEventListener("click", exportAuditHtml);
}

if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", () => {
    window.print();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadHistoryFromStorage();
  checkApiHealth();
  setInterval(checkApiHealth, HEALTH_INTERVAL_MS);
});

window.runUrlAudit = runUrlAudit;
window.applyScoreAndRisk = applyScoreAndRisk;
window.renderAuditCharts = renderAuditCharts;
window.animateScore = animateScore;
window.updateProgress = updateProgress;
window.lastAuditPayload = () => lastAuditPayload;