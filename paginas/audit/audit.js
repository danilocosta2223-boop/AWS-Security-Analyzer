// BLOCO 01: Configuracao da API e seletores do DOM
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

// BLOCO 02: Verificacao de saude da API (Health Check)
async function checkApiHealth() {
  if (!elements.healthStatus) return;

  elements.healthStatus.textContent = "Verificando API...";
  elements.healthStatus.dataset.status = "checking";

  const candidateEndpoints = ["/api/health", "/health"];

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        elements.healthStatus.textContent = "API Online";
        elements.healthStatus.dataset.status = "online";
        return true;
      }
    } catch (_) {
      // Tenta o proximo endpoint candidato
    }
  }

  elements.healthStatus.textContent = "API Offline ou iniciando";
  elements.healthStatus.dataset.status = "offline";
  return false;
}

// BLOCO 03: Calculo de score de seguranca e normalizacao do resultado
function calculateSecurityScore(data) {
  if (typeof data?.securityScore === "number") {
    return Math.max(0, Math.min(100, Math.round(data.securityScore)));
  }

  let score = 100;
  const stats = data?.stats || data?.analysis?.stats || {};
  const malicious = Number(stats.malicious || 0);
  const suspicious = Number(stats.suspicious || 0);

  score -= malicious * 35;
  score -= suspicious * 15;

  if (Array.isArray(data?.findings)) {
    score -= data.findings.length * 10;
  }

  return Math.max(0, Math.min(100, score));
}

function normalizeAuditResult(target, scanType, rawData) {
  const score = calculateSecurityScore(rawData);
  const status =
    score >= 80 ? "Seguro" :
    score >= 50 ? "Atencao" :
    "Critico";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    target,
    scanType,
    score,
    status,
    timestamp: new Date().toISOString(),
    details: rawData
  };
}

// BLOCO 04: Requisicao de auditoria para o backend .NET no Render
async function executeVirusTotalAudit(target, scanType) {
  const response = await fetch(`${API_BASE_URL}/api/virustotal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      target,
      resource: target,
      type: scanType
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na API (${response.status}): ${errorText || response.statusText}`);
  }

  return response.json();
}

// BLOCO 05: Persistencia em localStorage e gerenciamento do historico
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

// BLOCO 06: Renderizacao da interface (Score, Detalhes e Historico)
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

// BLOCO 07: Eventos e inicializacao
async function handleRunAudit(event) {
  if (event) event.preventDefault();

  const target = elements.targetInput?.value.trim() || "";
  const scanType = elements.scanTypeSelect?.value || "url";

  if (!target) {
    if (elements.resultContainer) {
      elements.resultContainer.innerHTML = `<p class="audit-error">Informe um dominio, URL, IP ou hash para auditar.</p>`;
    }
    return;
  }

  if (elements.runAuditBtn) {
    elements.runAuditBtn.disabled = true;
    elements.runAuditBtn.textContent = "Auditando...";
  }

  try {
    const rawData = await executeVirusTotalAudit(target, scanType);
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
