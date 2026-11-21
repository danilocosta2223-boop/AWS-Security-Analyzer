// ==========================================
// BLOCO 01: Configuracao da API e Seletores
// ==========================================
const API_BASE_URL = "https://aws-security-analyzer.onrender.com";
const STORAGE_KEY = "cybershield_audit_history_v1";

const elements = {
  auditForm: document.getElementById("auditForm"),
  targetInput: document.getElementById("urlInput"),
  runAuditBtn: document.getElementById("runAuditBtn"),
  quickUrlButtons: document.querySelectorAll(".quick-url-btn"),
  healthStatus: document.getElementById("apiStatus"),
  apiVersion: document.getElementById("apiVersion"),
  backendType: document.getElementById("backendType"),
  scoreValue: document.getElementById("scoreValue"),
  gradeValue: document.getElementById("gradeValue"),
  riskValue: document.getElementById("riskValue"),
  analysisTime: document.getElementById("analysisTime"),
  loadingBox: document.getElementById("loading"),
  virusTotalStatus: document.getElementById("virusTotalStatus"),
  sslStatus: document.getElementById("sslStatus"),
  whoisStatus: document.getElementById("whoisStatus"),
  technologyList: document.getElementById("technologyList"),
  reconStatus: document.getElementById("reconStatus"),
  dnsStatus: document.getElementById("dnsStatus"),
  headersStatus: document.getElementById("headersStatus"),
  jsonResult: document.getElementById("jsonResult"),
  historyList: document.getElementById("historyList")
};

// ==========================================
// BLOCO 02: Verificacao de Saude (Health Check)
// ==========================================
async function checkApiHealth() {
  if (!elements.healthStatus) return false;

  elements.healthStatus.textContent = "Verificando API...";
  console.log("[CyberCheck] Consultando health check em:", `${API_BASE_URL}/api/health`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });

    if (response.ok) {
      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }

      console.log("[CyberCheck] Health check OK:", data);
      elements.healthStatus.textContent = "API Online";

      if (elements.apiVersion) {
        elements.apiVersion.textContent = `Aplicacao: ${data?.application || data?.Application || "Cyber Shield API"}`;
      }
      if (elements.backendType) {
        elements.backendType.textContent = `Timestamp: ${data?.timestamp || data?.Timestamp || new Date().toISOString()}`;
      }
      return true;
    }

    console.warn("[CyberCheck] Health check retornou status:", response.status);
  } catch (error) {
    console.warn("[CyberCheck] Falha no health check:", error?.message || error);
  } finally {
    clearTimeout(timeoutId);
  }

  elements.healthStatus.textContent = "API Offline ou iniciando";
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

  return 0;
}

function extractGradeFromResponse(data, score) {
  const rawGrade = data?.grade ?? data?.Grade ?? data?.status ?? data?.Status;
  if (typeof rawGrade === "string" && rawGrade.trim()) {
    return rawGrade.trim();
  }

  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

function extractRiskFromResponse(data, score) {
  const rawRisk = data?.risk ?? data?.Risk ?? data?.riskLevel ?? data?.RiskLevel;
  if (typeof rawRisk === "string" && rawRisk.trim()) {
    return rawRisk.trim().toUpperCase();
  }

  if (score >= 80) return "LOW";
  if (score >= 50) return "MEDIUM";
  return "HIGH";
}

function normalizeAuditResult(target, rawData, elapsedMs) {
  const score = extractScoreFromResponse(rawData);
  const grade = extractGradeFromResponse(rawData, score);
  const risk = extractRiskFromResponse(rawData, score);
  const resolvedTarget =
    rawData?.url ||
    rawData?.Url ||
    rawData?.target ||
    rawData?.Target ||
    target;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    target: resolvedTarget,
    score,
    grade,
    risk,
    elapsedMs,
    timestamp: rawData?.scanDate || rawData?.ScanDate || new Date().toISOString(),
    details: rawData
  };
}

// ==========================================
// BLOCO 04: Requisicao de Auditoria ao Backend
// ==========================================
async function executeAuditoria(target) {
  const endpoint = `${API_BASE_URL}/api/auditoria`;
  const payload = { url: target };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  console.log("[CyberCheck] Enviando POST para:", endpoint);
  console.log("[CyberCheck] Payload enviado:", payload);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    console.log("[CyberCheck] Status HTTP recebido:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CyberCheck] Corpo de erro da API:", errorText);
      throw new Error(`Falha na API (${response.status}): ${errorText || response.statusText}`);
    }

    const jsonData = await response.json();
    console.log("[CyberCheck] Resposta JSON recebida:", jsonData);
    return jsonData;
  } catch (error) {
    console.error("[CyberCheck] Erro durante executeAuditoria:", error);
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

// ==========================================
// BLOCO 06: Renderizacao na Interface
// ==========================================
function setLoadingState(isLoading) {
  if (elements.runAuditBtn) {
    elements.runAuditBtn.disabled = isLoading;
  }
  if (elements.loadingBox) {
    elements.loadingBox.classList.toggle("is-hidden", !isLoading);
  }
}

function setModulesState(message) {
  const targets = [
    elements.virusTotalStatus,
    elements.sslStatus,
    elements.whoisStatus,
    elements.technologyList,
    elements.reconStatus,
    elements.dnsStatus,
    elements.headersStatus
  ];
  for (const el of targets) {
    if (el) el.textContent = message;
  }
}

function formatModuleValue(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "boolean") return val ? "Valido / Ativo" : "Invalido / Ausente";
  if (typeof val === "string" || typeof val === "number") return String(val);
  return JSON.stringify(val);
}

function renderAuditResult(entry) {
  const d = entry.details || {};
  const sslRaw = d.sslValid ?? d.SslValid ?? d.ssl ?? d.Ssl ?? d.sslTls ?? d.SslTls;

  if (elements.scoreValue) {
    elements.scoreValue.textContent = `${entry.score}`;
  }
  if (elements.gradeValue) {
    elements.gradeValue.textContent = `Nota ${entry.grade} - ${entry.target}`;
  }
  if (elements.riskValue) {
    elements.riskValue.textContent = entry.risk;
  }
  if (elements.analysisTime) {
    elements.analysisTime.textContent = entry.elapsedMs ? `${(entry.elapsedMs / 1000).toFixed(2)}s` : "--";
  }

  if (elements.virusTotalStatus) {
    elements.virusTotalStatus.textContent = formatModuleValue(
      d.virusTotal ?? d.VirusTotal ?? d.virustotal,
      "Nao retornado pela API atual"
    );
  }
  if (elements.sslStatus) {
    elements.sslStatus.textContent = formatModuleValue(
      sslRaw,
      "Nao retornado pela API atual"
    );
  }
  if (elements.whoisStatus) {
    elements.whoisStatus.textContent = formatModuleValue(
      d.whois ?? d.Whois,
      "Nao retornado pela API atual"
    );
  }
  if (elements.technologyList) {
    elements.technologyList.textContent = formatModuleValue(
      d.technologies ?? d.Technologies ?? d.tech ?? d.Tech,
      "Nao retornado pela API atual"
    );
  }
  if (elements.reconStatus) {
    elements.reconStatus.textContent = formatModuleValue(
      d.recon ?? d.Recon,
      "Nao retornado pela API atual"
    );
  }
  if (elements.dnsStatus) {
    elements.dnsStatus.textContent = formatModuleValue(
      d.dns ?? d.Dns,
      "Nao retornado pela API atual"
    );
  }
  if (elements.headersStatus) {
    elements.headersStatus.textContent = formatModuleValue(
      d.headers ?? d.Headers ?? d.httpHeaders ?? d.HttpHeaders,
      "Nao retornado pela API atual"
    );
  }

  if (elements.jsonResult) {
    elements.jsonResult.textContent = JSON.stringify(entry.details, null, 2);
  }
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
        <span>${escapeHtml(item.target)}</span> -
        <strong>${item.score}/100</strong> (${escapeHtml(item.grade)}) -
        <span>${new Date(item.timestamp).toLocaleString("pt-BR")}</span>
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

  console.log("[CyberCheck] Submit do formulario acionado.");

  const target = elements.targetInput?.value.trim() || "";
  if (!target) {
    console.warn("[CyberCheck] Campo urlInput vazio.");
    if (elements.jsonResult) {
      elements.jsonResult.textContent = "Erro: informe uma URL ou dominio valido para auditar.";
    }
    return;
  }

  setLoadingState(true);
  setModulesState("Analisando...");
  if (elements.gradeValue) {
    elements.gradeValue.textContent = "Executando Auditoria...";
  }
  if (elements.riskValue) {
    elements.riskValue.textContent = "RUNNING";
  }

  const startedAt = performance.now();

  try {
    const rawData = await executeAuditoria(target);
    const elapsedMs = Math.round(performance.now() - startedAt);
    const normalized = normalizeAuditResult(target, rawData, elapsedMs);
    const updatedHistory = saveAuditToHistory(normalized);

    renderAuditResult(normalized);
    renderHistory(updatedHistory);
    console.log("[CyberCheck] Auditoria concluida com sucesso em", `${elapsedMs}ms`);
  } catch (error) {
    console.error("[CyberCheck] Falha na auditoria:", error);
    setModulesState("Falha na consulta");
    if (elements.gradeValue) {
      elements.gradeValue.textContent = "Erro na Auditoria";
    }
    if (elements.riskValue) {
      elements.riskValue.textContent = "ERROR";
    }
    if (elements.jsonResult) {
      elements.jsonResult.textContent = `Erro: ${error.message}`;
    }
  } finally {
    setLoadingState(false);
  }
}

function bindQuickTargets() {
  if (!elements.quickUrlButtons || !elements.targetInput) return;

  elements.quickUrlButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const quickUrl = btn.dataset.url || "";
      elements.targetInput.value = quickUrl;
      console.log("[CyberCheck] Alvo rapido selecionado:", quickUrl);
    });
  });
}

function initAuditModule() {
  console.log("[CyberCheck] Inicializando modulo de auditoria...");
  console.log("[CyberCheck] Elementos mapeados:", {
    auditForm: Boolean(elements.auditForm),
    targetInput: Boolean(elements.targetInput),
    runAuditBtn: Boolean(elements.runAuditBtn),
    healthStatus: Boolean(elements.healthStatus),
    jsonResult: Boolean(elements.jsonResult)
  });

  const initialHistory = getAuditHistory();
  renderHistory(initialHistory);

  if (initialHistory.length > 0) {
    renderAuditResult(initialHistory[0]);
  }

  bindQuickTargets();
  checkApiHealth();

  if (elements.auditForm) {
    elements.auditForm.addEventListener("submit", handleRunAudit);
  } else {
    elements.runAuditBtn?.addEventListener("click", handleRunAudit);
  }
}

document.addEventListener("DOMContentLoaded", initAuditModule);