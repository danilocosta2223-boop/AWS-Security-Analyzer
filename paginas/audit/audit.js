// ==========================================
// BLOCO 01: Configuracao da API e Seletores
// ==========================================
const API_BASE_URL = "https://aws-security-analyzer.onrender.com";
const STORAGE_KEY = "cybershield_audit_history_v1";

const elements = {
  targetInput: document.getElementById("targetInput"),
  scanTypeSelect: document.getElementById("scanTypeSelect"),
  runAuditBtn: document.getElementById("runAuditBtn"),
  healthStatus: document.getElementById("healthStatus"),
  scoreValue: document.getElementById("scoreValue"),
  resultContainer: document.getElementById("resultContainer"),
  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn")
};

// ==========================================
// BLOCO 02: Verificacao de Saude (Health Check)
// ==========================================
async function checkApiHealth() {
  if (!elements.healthStatus) return;

  elements.healthStatus.textContent = "Verificando API...";
  elements.healthStatus.dataset.status = "checking";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });

    if (response.ok) {
      elements.healthStatus.textContent = "API Online";
      elements.healthStatus.dataset.status = "online";
      return true;
    }
  } catch (_) {
    // Em plano gratuito no Render, a instancia pode estar iniciando
  } finally {
    clearTimeout(timeoutId);
  }

  elements.healthStatus.textContent = "API Offline ou iniciando";
  elements.healthStatus.dataset.status = "offline";
  return false;
}

// ==========================================
// BLOCO 03: Calculo de Score e Normalizacao
// ==========================================
function extractScoreFromResponse(data) {
  const candidates = [
    data?.score,
    data?.Score,
    data?.securityScore,
    data?.SecurityScore,
    data?.riskScore,
    data?.RiskScore,
    data?.data?.score,
    data?.data?.Score,
    data?.data?.securityScore,
    data?.data?.SecurityScore
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.max(0, Math.min(100, Math.round(candidate)));
    }
  }

  let score = 100;
  const stats = data?.stats || data?.Stats || data?.analysis?.stats || {};
  const malicious = Number(stats.malicious ?? stats.Malicious ?? 0);
  const suspicious = Number(stats.suspicious ?? stats.Suspicious ?? 0);

  score -= malicious * 35;
  score -= suspicious * 15;

  const findings = data?.findings || data?.Findings || data?.issues || data?.Issues;
  if (Array.isArray(findings)) {
    score -= findings.length * 10;
  }

  const vulnerabilities = data?.vulnerabilities || data?.Vulnerabilities;
  if (Array.isArray(vulnerabilities)) {
    score -= vulnerabilities.length * 10;
  }

  return Math.max(0, Math.min(100, score));
}

function extractStatusFromResponse(data, score) {
  const rawStatus =
    data?.status ??
    data?.Status ??
    data?.classification ??
    data?.Classification ??
    data?.level ??
    data?.Level;

  if (typeof rawStatus === "string" && rawStatus.trim()) {
    return rawStatus.trim();
  }

  if (score >= 80) return "Seguro";
  if (score >= 50) return "Atencao";
  return "Critico";
}

function normalizeAuditResult(target, scanType, rawData) {
  const score = extractScoreFromResponse(rawData);
  const status = extractStatusFromResponse(rawData, score);
  const resolvedTarget =
    rawData?.url ||
    rawData?.Url ||
    rawData?.target ||
    rawData?.Target ||
    target;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    target: resolvedTarget,
    scanType,
    score,
    status,
    timestamp: new Date().toISOString(),
    details: rawData
  };
}

// ==========================================
// BLOCO 04: Requisicao de Auditoria ao Backend
// ==========================================
async function executeAuditoria(target) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auditoria`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        url: target
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha na API (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Tempo limite excedido ao aguardar resposta da API no Render.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==========================================
// BLOCO 05: Historico em localStorage
// ==========================================
function getAuditHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveAuditToHistory(entry) {
  const current = getAuditHistory();
  const updated = [entry, ...current].slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

function clearAuditHistory() {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory([]);
}

// ==========================================
// BLOCO 06: Renderizacao na Interface
// ==========================================
function renderAuditResult(entry) {
  if (elements.scoreValue) {
    elements.scoreValue.textContent = `${entry.score}/100 - ${entry.status}`;
    elements.scoreValue.dataset.status = entry.status.toLowerCase();
  }

  if (!elements.resultContainer) return;

  const formattedJson = JSON.stringify(entry.details, null, 2);
  elements.resultContainer.innerHTML = `
    <div class="audit-summary">
      <p><strong>Alvo:</strong> ${escapeHtml(entry.target)}</p>
      <p><strong>Tipo:</strong> ${escapeHtml(entry.scanType)}</p>
      <p><strong>Score:</strong> ${entry.score}/100 (${escapeHtml(entry.status)})</p>
      <p><strong>Data:</strong> ${new Date(entry.timestamp).toLocaleString("pt-BR")}</p>
    </div>
    <pre class="audit-raw"><code>${escapeHtml(formattedJson)}</code></pre>
  `;
}

function renderHistory(historyItems) {
  if (!elements.historyList) return;

  if (!historyItems.length) {
    elements.historyList.innerHTML = `<li class="history-empty">Nenhuma auditoria registrada.</li>`;
    return;
  }

  elements.historyList.innerHTML = historyItems
    .map((item) => `
      <li class="history-item" data-id="${escapeHtml(item.id)}">
        <span class="history-target">${escapeHtml(item.target)}</span>
        <span class="history-score">${item.score}/100 (${escapeHtml(item.status)})</span>
        <span class="history-date">${new Date(item.timestamp).toLocaleString("pt-BR")}</span>
      </li>
    `)
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ==========================================
// BLOCO 07: Eventos e Inicializacao
// ==========================================
async function handleRunAudit(event) {
  if (event) event.preventDefault();

  const target = elements.targetInput?.value.trim() || "";
  const scanType = elements.scanTypeSelect?.value || "url";

  if (!target) {
    if (elements.resultContainer) {
      elements.resultContainer.innerHTML = `<p class="audit-error">Informe uma URL ou dominio para auditar.</p>`;
    }
    return;
  }

  if (elements.runAuditBtn) {
    elements.runAuditBtn.disabled = true;
    elements.runAuditBtn.textContent = "Auditando...";
  }

  if (elements.resultContainer) {
    elements.resultContainer.innerHTML = `<p class="audit-loading">Consultando a API e servicos externos...</p>`;
  }

  try {
    const rawData = await executeAuditoria(target);
    const normalized = normalizeAuditResult(target, scanType, rawData);
    const updatedHistory = saveAuditToHistory(normalized);

    renderAuditResult(normalized);
    renderHistory(updatedHistory);
  } catch (error) {
    if (elements.resultContainer) {
      elements.resultContainer.innerHTML = `<p class="audit-error">${escapeHtml(error.message)}</p>`;
    }
  } finally {
    if (elements.runAuditBtn) {
      elements.runAuditBtn.disabled = false;
      elements.runAuditBtn.textContent = "Iniciar Auditoria";
    }
  }
}

function initAuditModule() {
  const initialHistory = getAuditHistory();
  renderHistory(initialHistory);

  if (initialHistory.length > 0) {
    renderAuditResult(initialHistory[0]);
  }

  checkApiHealth();

  elements.runAuditBtn?.addEventListener("click", handleRunAudit);
  elements.clearHistoryBtn?.addEventListener("click", clearAuditHistory);
}

document.addEventListener("DOMContentLoaded", initAuditModule);