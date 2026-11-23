// ==========================================
// BLOCO 01: Configuracao da API e Seletores
// ==========================================
const API_BASE_URL = "https://aws-security-analyzer.onrender.com";
const STORAGE_KEY = "cybershield_audit_history_v1";
const THEME_STORAGE_KEY = "cybershield_theme";
const SYNC_CHANNEL_NAME = "cybercheck_audit_sync_channel";

const AUDIT_ENDPOINTS = {
  health: `${API_BASE_URL}/api/health`,
  stream: `${API_BASE_URL}/api/auditoria/stream`,
  postFallback: [
    `${API_BASE_URL}/api/audit`,
    `${API_BASE_URL}/api/auditoria`
  ]
};

const REQUEST_TIMEOUTS_MS = {
  health: 15000,
  postFallback: 30000,
  sseStream: 45000
};

const elements = {
  auditForm: document.getElementById("auditForm"),
  targetInput: document.getElementById("urlInput"),
  runAuditBtn: document.getElementById("runAuditBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  quickUrlButtons: document.querySelectorAll(".quick-url-btn"),
  themeToggleBtn: document.getElementById("themeToggle"),
  auditThemeLink: document.getElementById("audit-theme-css"),
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

let currentAuditEntry = null;

// ==========================================
// BLOCO 02: Utilitarios, Progresso e Tema
// ==========================================
function pickValue(obj, keys, fallback = undefined) {
  if (!obj || typeof obj !== "object") return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return fallback;
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function formatElapsedSeconds(elapsedMs) {
  return elapsedMs ? `${(elapsedMs / 1000).toFixed(2)}s` : "--";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyAuditTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = normalized;

  if (elements.auditThemeLink) {
    elements.auditThemeLink.href = normalized === "light"
      ? "../styles-light/audit.css"
      : "../styles-dark/audit.css";
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch (err) {
    console.warn("[CyberCheck] Nao foi possivel salvar o tema:", err?.message || err);
  }
}

function toggleAuditTheme() {
  const current = document.body.dataset.theme === "light" ? "light" : "dark";
  applyAuditTheme(current === "dark" ? "light" : "dark");
}

function setAuditProgress(percent, statusText, completed = false) {
  const box = document.getElementById("auditProgressBox") || elements.loadingBox;
  const fill =
    document.getElementById("auditProgressFill") ||
    box?.querySelector("[data-progress-fill], .progress-fill, .audit-progress-fill");
  const label =
    document.getElementById("auditProgressText") ||
    box?.querySelector("[data-progress-text], .progress-text, .audit-progress-text");
  const pctEl =
    document.getElementById("auditProgressPercent") ||
    box?.querySelector("[data-progress-percent], .progress-percent, .audit-progress-percent");

  const isDone = Boolean(completed || percent >= 100);
  const safePct = isDone ? 100 : Math.max(0, Math.min(100, Math.round(percent)));

  if (box) {
    box.classList.remove("is-hidden", "hidden");
    box.style.display = "flex";
    box.classList.toggle("is-complete", isDone);
  }

  if (fill) {
    fill.style.width = `${safePct}%`;
  }

  if (pctEl) {
    pctEl.textContent = `${safePct}%`;
  }

  if (label && statusText) {
    label.textContent = statusText;
  }
}

function resetScoreBeforeAudit() {
  if (elements.scoreValue) {
    elements.scoreValue.textContent = "0";
  }
  if (elements.gradeValue) {
    elements.gradeValue.textContent = "Aguardando analise...";
  }
  if (elements.riskValue) {
    elements.riskValue.textContent = "--";
  }
  if (elements.analysisTime) {
    elements.analysisTime.textContent = "--";
  }
}

// ==========================================
// BLOCO 03: Verificacao de Saude (Health Check)
// ==========================================
async function checkApiHealth() {
  if (!elements.healthStatus) return false;

  elements.healthStatus.textContent = "Verificando API...";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUTS_MS.health);

  try {
    const response = await fetch(AUDIT_ENDPOINTS.health, {
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

      const applicationName = pickValue(data, ["application", "Application"], "Cyber Shield API");
      const timestampValue = pickValue(data, ["timestamp", "Timestamp"], new Date().toISOString());

      elements.healthStatus.textContent = "API Online";
      if (elements.apiVersion) {
        elements.apiVersion.textContent = `Aplicacao: ${applicationName}`;
      }
      if (elements.backendType) {
        elements.backendType.textContent = `Timestamp: ${timestampValue}`;
      }
      return true;
    }
  } catch (error) {
    console.warn("[CyberCheck] Health check falhou:", error?.message || error);
  } finally {
    clearTimeout(timeoutId);
  }

  elements.healthStatus.textContent = "API Offline ou iniciando";
  return false;
}

// ==========================================
// BLOCO 04: Requisicao SSE e Fallback ao Backend
// ==========================================
function normalizeTargetUrl(rawTarget) {
  const trimmed = String(rawTarget || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function applyStreamStep(payload) {
  if (!payload || typeof payload !== "object") return;

  const stepName = String(pickValue(payload, ["step", "Step"], "")).toUpperCase();
  const statusText = String(pickValue(payload, ["status", "Status"], ""));
  const deltaScore = Number(pickValue(payload, ["deltaScore", "DeltaScore"], 0));
  const partialScore = Number(pickValue(payload, ["score", "Score"], NaN));
  const detail = String(pickValue(payload, ["detail", "Detail"], ""));

  if (Number.isFinite(partialScore) && elements.scoreValue) {
    elements.scoreValue.textContent = `${clampScore(partialScore)}`;
  }

  const deltaLabel = Number.isFinite(deltaScore) ? ` (+${deltaScore})` : "";
  const formatted = `${statusText}${deltaLabel}${detail ? ` - ${detail}` : ""}`;

  const stepTargetMap = {
    SSL: elements.sslStatus,
    HEADERS: elements.headersStatus,
    DNS: elements.dnsStatus,
    WHOIS: elements.whoisStatus,
    RECON: elements.reconStatus,
    VIRUSTOTAL: elements.virusTotalStatus
  };

  const targetEl = stepTargetMap[stepName];
  if (targetEl) {
    targetEl.textContent = formatted;
  }

  if (stepName === "SSL" || stepName === "DNS") {
    setAuditProgress(45, "Validando SSL/TLS e registros DNS...", false);
  } else if (stepName === "WHOIS" || stepName === "RECON") {
    setAuditProgress(60, "Coletando informacoes de dominio e reconhecimento...", false);
  } else if (stepName === "HEADERS" || stepName === "VIRUSTOTAL") {
    setAuditProgress(75, "Verificando cabecalhos HTTP e reputacao...", false);
  } else if (stepName) {
    setAuditProgress(85, `Processando etapa ${stepName}...`, false);
  }
}

async function executeAuditoriaPostFallback(normalizedUrl) {
  const payload = { url: normalizedUrl };
  let lastError = null;

  for (const endpoint of AUDIT_ENDPOINTS.postFallback) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUTS_MS.postFallback);

    try {
      console.log("[CyberCheck] Enviando POST para:", endpoint);
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

      if (response.status === 404) {
        lastError = new Error(`Rota nao encontrada (404) em ${endpoint}`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na API (${response.status}): ${errorText || response.statusText}`);
      }

      const jsonData = await response.json();
      console.log("[CyberCheck] Resposta JSON recebida:", jsonData);
      return jsonData;
    } catch (error) {
      if (error.name === "AbortError") {
        lastError = new Error("Tempo limite excedido ao aguardar resposta da API no Render.");
      } else {
        lastError = error;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error("Falha ao comunicar com a API.");
}

function executeAuditoriaStream(target, onProgressStep) {
  const normalizedUrl = normalizeTargetUrl(target);
  const streamUrl = `${AUDIT_ENDPOINTS.stream}?url=${encodeURIComponent(normalizedUrl)}`;

  console.log("[CyberCheck] Conectando SSE com parametro url:", streamUrl);

  return new Promise((resolve, reject) => {
    let settled = false;
    const eventSource = new EventSource(streamUrl);

    const finishResolve = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      eventSource.close();
      resolve(value);
    };

    const finishReject = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      eventSource.close();
      reject(err);
    };

    const timeoutId = setTimeout(() => {
      finishReject(new Error("Tempo limite excedido no stream SSE da auditoria."));
    }, REQUEST_TIMEOUTS_MS.sseStream);

    eventSource.addEventListener("progress", (event) => {
      try {
        const stepPayload = JSON.parse(event.data);
        console.log("[CyberCheck] Evento SSE progress:", stepPayload);
        if (typeof onProgressStep === "function") {
          onProgressStep(stepPayload);
        }
      } catch (err) {
        console.warn("[CyberCheck] Falha ao parsear evento progress:", err);
      }
    });

    eventSource.addEventListener("completed", (event) => {
      try {
        const finalPayload = JSON.parse(event.data);
        console.log("[CyberCheck] Evento SSE completed:", finalPayload);
        finishResolve(finalPayload);
      } catch (err) {
        finishReject(err);
      }
    });

    eventSource.addEventListener("error", async (event) => {
      if (settled) return;
      clearTimeout(timeoutId);
      eventSource.close();

      if (event?.data) {
        try {
          const parsedError = JSON.parse(event.data);
          settled = true;
          reject(new Error(parsedError?.error || "Erro reportado pelo stream SSE."));
          return;
        } catch (_) {
          // Segue para fallback POST
        }
      }

      console.warn("[CyberCheck] Stream SSE indisponivel; usando fallback POST.");
      setAuditProgress(45, "Validando SSL/TLS e registros DNS...", false);
      try {
        const fallbackData = await executeAuditoriaPostFallback(normalizedUrl);
        setAuditProgress(75, "Verificando cabecalhos HTTP e reputacao...", false);
        settled = true;
        resolve(fallbackData);
      } catch (fallbackErr) {
        settled = true;
        reject(fallbackErr);
      }
    });
  });
}

async function executeAuditoria(target, onProgressStep) {
  return executeAuditoriaStream(target, onProgressStep);
}

// ==========================================
// BLOCO 05: Normalizacao, Historico e Sincronizacao
// ==========================================
function inferRiskLevel(score) {
  if (score >= 85) return "LOW";
  if (score >= 60) return "MEDIUM";
  return "HIGH";
}

function inferGradeLetter(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

function normalizeAuditResult(target, rawData, elapsedMs) {
  const score = clampScore(pickValue(rawData, ["score", "Score"], 0));

  const riskRaw = pickValue(rawData, ["risk", "Risk"], "");
  const risk = typeof riskRaw === "string" && riskRaw.trim()
    ? riskRaw.trim().toUpperCase()
    : inferRiskLevel(score);

  const gradeRaw = pickValue(rawData, ["grade", "Grade"], "");
  const grade = typeof gradeRaw === "string" && gradeRaw.trim()
    ? gradeRaw.trim()
    : inferGradeLetter(score);

  const resolvedTarget = pickValue(rawData, ["target", "Target", "url", "Url"], target);
  const resolvedTimestamp = pickValue(rawData, ["scanDate", "ScanDate"], new Date().toISOString());

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    target: resolvedTarget,
    score,
    grade,
    risk,
    elapsedMs,
    timestamp: resolvedTimestamp,
    details: rawData
  };
}

function getAuditHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function notifyHistoryUpdated(updatedHistory) {
  window.dispatchEvent(new CustomEvent("cybercheck:history-updated", { detail: updatedHistory }));

  if ("BroadcastChannel" in window) {
    const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    syncChannel.postMessage({ type: "history-updated", entries: updatedHistory });
    syncChannel.close();
  }
}

function saveAuditToHistory(entry) {
  const current = getAuditHistory();
  const updated = [entry, ...current].slice(0, 25);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("[CyberCheck] Falha ao gravar historico no localStorage:", err?.message || err);
  }
  notifyHistoryUpdated(updated);
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
    const progressBox = document.getElementById("auditProgressBox");
    const isCompletedGreen = progressBox?.classList.contains("is-complete");
    if (!isLoading && isCompletedGreen) {
      elements.loadingBox.classList.remove("is-hidden");
      return;
    }
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

function formatVirusTotalSummary(vt, entry, scanDateText) {
  if (vt && typeof vt === "object") {
    const stats = vt.stats && typeof vt.stats === "object" ? vt.stats : {};
    const mal = pickValue(vt, ["malicious", "Malicious"], pickValue(stats, ["malicious"], 0));
    const susp = pickValue(vt, ["suspicious", "Suspicious"], pickValue(stats, ["suspicious"], 0));
    const harm = pickValue(vt, ["harmless", "Harmless"], pickValue(stats, ["harmless"], 0));
    const st = pickValue(vt, ["status", "Status", "summary"], "ok");
    return `Status: ${st} | Maliciosos: ${mal} | Suspeitos: ${susp} | Seguros: ${harm}`;
  }
  return `Risco geral: ${entry.risk} | Score: ${entry.score}/100 | Verificado em: ${scanDateText}`;
}

function formatSslSummary(ssl, sslValid) {
  if (ssl && typeof ssl === "object") {
    const enabled = Boolean(pickValue(ssl, ["enabled", "Enabled"], false));
    const scheme = pickValue(ssl, ["scheme", "Scheme"], "");
    const code = pickValue(ssl, ["statusCode", "StatusCode"], "");
    const detail = pickValue(ssl, ["detail", "Detail"], "");
    return `${enabled ? "HTTPS Ativo" : "Sem TLS"}${scheme ? ` (${scheme})` : ""}${code ? ` | HTTP ${code}` : ""}${detail ? ` - ${detail}` : ""}`;
  }
  if (typeof sslValid === "boolean") {
    return sslValid ? "Valido / Ativo (TLS verificado)" : "Invalido / Ausente";
  }
  return "Sem detalhes de SSL/TLS na resposta.";
}

function formatWhoisSummary(whois, target) {
  if (whois && typeof whois === "object") {
    const dom = pickValue(whois, ["domain", "Domain"], target);
    const tld = pickValue(whois, ["tld", "Tld"], "");
    const src = pickValue(whois, ["source", "Source", "registrarHint"], "");
    return `Dominio: ${dom}${tld ? ` | TLD: .${tld}` : ""}${src ? ` | Fonte: ${src}` : ""}`;
  }
  return `Alvo: ${target} | Sem registo WHOIS no payload atual`;
}

function formatTechnologiesSummary(tech) {
  if (Array.isArray(tech) && tech.length > 0) {
    return tech.join(" | ");
  }
  return "Stack nao informada na resposta atual";
}

function formatReconSummary(recon) {
  if (recon && typeof recon === "object") {
    const robots = Boolean(pickValue(recon, ["robotsReachable", "RobotsReachable", "robotsTxt"], false));
    const sitemap = Boolean(pickValue(recon, ["sitemapReachable", "SitemapReachable", "sitemapXml"], false));
    return `robots.txt: ${robots ? "Encontrado" : "Nao encontrado"} | sitemap.xml: ${sitemap ? "Encontrado" : "Nao encontrado"}`;
  }
  return "Recon detalhado nao incluido na resposta atual";
}

function formatDnsSummary(dns) {
  if (dns && typeof dns === "object") {
    const rawIps = pickValue(dns, ["addresses", "Addresses"], []);
    const ips = Array.isArray(rawIps) ? rawIps : [];
    const hostName = pickValue(dns, ["hostName", "HostName", "resolvedIp"], "");
    return `IPs: ${ips.length ? ips.join(", ") : "Nenhum"}${hostName ? ` | Host: ${hostName}` : ""}`;
  }
  return "Registos DNS nao incluidos na resposta atual";
}

function formatHeadersSummary(headers) {
  if (headers && typeof headers === "object") {
    const hsts = Boolean(pickValue(headers, ["hasStrictTransportSecurity", "HasStrictTransportSecurity", "hsts"], false));
    const csp = Boolean(pickValue(headers, ["hasContentSecurityPolicy", "HasContentSecurityPolicy", "csp"], false));
    const xfo = Boolean(pickValue(headers, ["hasXFrameOptions", "HasXFrameOptions", "xFrameOptions"], false));
    const srv = pickValue(headers, ["server", "Server"], "N/A");
    return `HSTS: ${hsts ? "Sim" : "Nao"} | CSP: ${csp ? "Sim" : "Nao"} | X-Frame-Options: ${xfo ? "Sim" : "Nao"} | Server: ${srv}`;
  }
  return "Cabecalhos HTTP nao incluidos na resposta atual";
}

function renderAuditResult(entry) {
  currentAuditEntry = entry;
  const d = entry.details || {};
  const scanDateText = entry.timestamp ? new Date(entry.timestamp).toLocaleString("pt-BR") : "--";

  if (elements.scoreValue) elements.scoreValue.textContent = `${entry.score}`;
  if (elements.gradeValue) elements.gradeValue.textContent = `Nota ${entry.grade} - ${entry.target}`;
  if (elements.riskValue) elements.riskValue.textContent = entry.risk;
  if (elements.analysisTime) elements.analysisTime.textContent = formatElapsedSeconds(entry.elapsedMs);

  const vt = pickValue(d, ["virustotal", "VirusTotal"], null);
  if (elements.virusTotalStatus) {
    elements.virusTotalStatus.textContent = formatVirusTotalSummary(vt, entry, scanDateText);
  }

  const ssl = pickValue(d, ["ssl", "Ssl"], null);
  const sslValid = pickValue(d, ["sslValid", "SslValid"], undefined);
  if (elements.sslStatus) {
    elements.sslStatus.textContent = formatSslSummary(ssl, sslValid);
  }

  const whois = pickValue(d, ["whois", "Whois"], null);
  if (elements.whoisStatus) {
    elements.whoisStatus.textContent = formatWhoisSummary(whois, entry.target);
  }

  const tech = pickValue(d, ["technologies", "Technologies"], null);
  if (elements.technologyList) {
    elements.technologyList.textContent = formatTechnologiesSummary(tech);
  }

  const recon = pickValue(d, ["recon", "Recon"], null);
  if (elements.reconStatus) {
    elements.reconStatus.textContent = formatReconSummary(recon);
  }

  const dns = pickValue(d, ["dns", "Dns"], null);
  if (elements.dnsStatus) {
    elements.dnsStatus.textContent = formatDnsSummary(dns);
  }

  const headers = pickValue(d, ["headers", "Headers"], null);
  if (elements.headersStatus) {
    elements.headersStatus.textContent = formatHeadersSummary(headers);
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
      <li class="history-item" data-id="${escapeHtml(item.id)}" role="button" tabindex="0" title="Clique para carregar esta auditoria">
        <span>${escapeHtml(item.target)}</span> -
        <strong>${item.score}/100</strong> (${escapeHtml(item.grade)}) -
        <span>${new Date(item.timestamp).toLocaleString("pt-BR")}</span>
      </li>
    `)
    .join("");

  elements.historyList.querySelectorAll(".history-item[data-id]").forEach((li) => {
    const selectItem = () => {
      const found = historyItems.find((h) => h.id === li.dataset.id);
      if (found) renderAuditResult(found);
    };
    li.addEventListener("click", selectItem);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectItem();
      }
    });
  });
}

// ==========================================
// BLOCO 07: Eventos e Inicializacao
// ==========================================
async function handleRunAudit(event) {
  if (event) event.preventDefault();

  console.log("[CyberCheck] Submit do formulario acionado.");

  const target = elements.targetInput?.value.trim() || "";
  if (!target) {
    if (elements.jsonResult) {
      elements.jsonResult.textContent = "Erro: informe uma URL ou dominio valido para auditar.";
    }
    return;
  }

  resetScoreBeforeAudit();
  setLoadingState(true);
  setModulesState("Analisando...");
  setAuditProgress(15, "Executando analise de seguranca no servidor...", false);
  if (elements.gradeValue) elements.gradeValue.textContent = "Executando Auditoria...";
  if (elements.riskValue) elements.riskValue.textContent = "RUNNING";

  const startedAt = performance.now();

  try {
    const rawData = await executeAuditoria(target, applyStreamStep);
    const elapsedMs = Math.round(performance.now() - startedAt);
    const normalized = normalizeAuditResult(target, rawData, elapsedMs);
    const updatedHistory = saveAuditToHistory(normalized);

    renderAuditResult(normalized);
    renderHistory(updatedHistory);
    setAuditProgress(100, "Analise concluida com sucesso.", true);
    console.log("[CyberCheck] Auditoria concluida com sucesso em", `${elapsedMs}ms`);
  } catch (error) {
    console.error("[CyberCheck] Falha na auditoria:", error);
    setModulesState("Falha na consulta");
    setAuditProgress(0, "Falha na execucao da auditoria.", false);
    if (elements.gradeValue) elements.gradeValue.textContent = "Erro na Auditoria";
    if (elements.riskValue) elements.riskValue.textContent = "ERROR";
    if (elements.jsonResult) elements.jsonResult.textContent = `Erro: ${error.message}`;
  } finally {
    setLoadingState(false);
  }
}

function bindTargetInputReset() {
  if (!elements.targetInput) return;
  elements.targetInput.addEventListener("input", () => {
    resetScoreBeforeAudit();
  });
}

function bindQuickTargets() {
  if (!elements.quickUrlButtons || !elements.targetInput) return;

  elements.quickUrlButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.targetInput.value = btn.dataset.url || "";
      resetScoreBeforeAudit();
    });
  });
}

function initAuditModule() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.theme || "dark";
  applyAuditTheme(savedTheme);
  elements.themeToggleBtn?.addEventListener("click", toggleAuditTheme);
  elements.exportPdfBtn?.addEventListener("click", generateAuditPdfReport);

  const initialHistory = getAuditHistory();
  renderHistory(initialHistory);
  if (initialHistory.length > 0) {
    renderAuditResult(initialHistory[0]);
  }

  bindTargetInputReset();
  bindQuickTargets();
  checkApiHealth();

  if (elements.auditForm) {
    elements.auditForm.addEventListener("submit", handleRunAudit);
  } else {
    elements.runAuditBtn?.addEventListener("click", handleRunAudit);
  }
}

// ==========================================
// BLOCO 08: Geracao de Relatorio PDF Executivo
// ==========================================
function buildFallbackRecommendations(d) {
  const list = [];
  const headers = pickValue(d, ["headers", "Headers"], null);
  const ssl = pickValue(d, ["ssl", "Ssl"], null);

  if (ssl && ssl.enabled === false) {
    list.push("CRITICO: Ativar HTTPS com certificado SSL/TLS valido.");
  }
  if (headers && typeof headers === "object") {
    if (!headers.hasStrictTransportSecurity && !headers.hsts) {
      list.push("ALTO: Configurar cabecalho Strict-Transport-Security (HSTS).");
    }
    if (!headers.hasContentSecurityPolicy && !headers.csp) {
      list.push("CRITICO: Implementar Content-Security-Policy (CSP) contra XSS.");
    }
    if (!headers.hasXFrameOptions && !headers.xFrameOptions) {
      list.push("MEDIO: Definir X-Frame-Options para mitigar clickjacking.");
    }
  }
  if (!list.length) {
    list.push("Manter monitoramento continuo de certificados, cabecalhos HTTP e registros DNS.");
  }
  return list;
}

function getRiskPalettePdf(risk) {
  const normalized = String(risk || "").toUpperCase();
  if (normalized === "LOW") {
    return { bg: [220, 252, 231], border: [34, 197, 94], text: [21, 128, 61] };
  }
  if (normalized === "MEDIUM") {
    return { bg: [254, 249, 195], border: [234, 179, 8], text: [133, 77, 14] };
  }
  return { bg: [254, 226, 226], border: [239, 68, 68], text: [153, 27, 27] };
}

function generateAuditPdfReport() {
  const entry = currentAuditEntry || getAuditHistory()[0];
  if (!entry) {
    if (elements.jsonResult) {
      elements.jsonResult.textContent = "Execute uma auditoria antes de gerar o relatorio PDF.";
    }
    return;
  }

  const jspdfLib = window.jspdf;
  if (!jspdfLib || !jspdfLib.jsPDF) {
    console.error("[CyberCheck] Biblioteca jsPDF nao carregada.");
    return;
  }

  const { jsPDF } = jspdfLib;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const d = entry.details || {};
  const scanDate = new Date(entry.timestamp).toLocaleString("pt-BR");
  const riskStyle = getRiskPalettePdf(entry.risk);
  const safeScore = clampScore(entry.score);

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 42, "F");
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 42, 210, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("CyberCheck PRO", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(125, 211, 252);
  doc.text("Relatorio Executivo de Seguranca e Postura Digital", 76, 16);

  doc.setFontSize(9.5);
  doc.setTextColor(226, 232, 240);
  const targetLines = doc.splitTextToSize(`Alvo auditado: ${entry.target}`, 182);
  doc.text(targetLines, 14, 25);

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Data/Hora: ${scanDate}   |   Duracao: ${formatElapsedSeconds(entry.elapsedMs)}`,
    14,
    37
  );

  const cardY = 51;
  const cardH = 28;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, cardY, 58, cardH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("SECURITY SCORE", 19, cardY + 7);

  doc.setFontSize(16);
  doc.setTextColor(2, 132, 199);
  doc.text(`${safeScore}/100`, 19, cardY + 16.5);

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(19, cardY + 20, 48, 3, 1.5, 1.5, "F");
  const barW = Math.max(2, (safeScore / 100) * 48);
  if (safeScore >= 85) doc.setFillColor(34, 197, 94);
  else if (safeScore >= 60) doc.setFillColor(2, 132, 199);
  else doc.setFillColor(239, 68, 68);
  doc.roundedRect(19, cardY + 20, barW, 3, 1.5, 1.5, "F");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(76, cardY, 58, cardH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("CLASSIFICACAO", 81, cardY + 7);

  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nota ${entry.grade}`, 81, cardY + 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Avaliacao consolidada", 81, cardY + 23);

  doc.setFillColor(riskStyle.bg[0], riskStyle.bg[1], riskStyle.bg[2]);
  doc.setDrawColor(riskStyle.border[0], riskStyle.border[1], riskStyle.border[2]);
  doc.roundedRect(138, cardY, 58, cardH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(riskStyle.text[0], riskStyle.text[1], riskStyle.text[2]);
  doc.text("NIVEL DE RISCO", 143, cardY + 7);

  doc.setFontSize(14);
  doc.text(String(entry.risk || "N/A"), 143, cardY + 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Exposicao identificada", 143, cardY + 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Diagnostico por Modulo de Seguranca", 14, 89);

  const sslText = elements.sslStatus?.textContent || "Nao informado";
  const headersText = elements.headersStatus?.textContent || "Nao informado";
  const dnsText = elements.dnsStatus?.textContent || "Nao informado";
  const whoisText = elements.whoisStatus?.textContent || "Nao informado";
  const reconText = elements.reconStatus?.textContent || "Nao informado";
  const vtText = elements.virusTotalStatus?.textContent || "Nao informado";
  const techText = elements.technologyList?.textContent || "Nao informado";

  doc.autoTable({
    startY: 93,
    head: [["Modulo", "Resultado / Diagnostico Tecnico"]],
    body: [
      ["SSL / TLS", sslText],
      ["Headers HTTP", headersText],
      ["DNS e Resolucao", dnsText],
      ["WHOIS / Dominio", whoisText],
      ["Recon (Robots/Sitemap)", reconText],
      ["VirusTotal / Reputacao", vtText],
      ["Tecnologias Detectadas", techText]
    ],
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9.5
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249]
    },
    styles: {
      fontSize: 8.8,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold", textColor: [15, 23, 42] },
      1: { cellWidth: 134 }
    }
  });

  let nextY = doc.lastAutoTable.finalY + 9;
  const rawRecs = pickValue(d, ["recommendations", "Recommendations"], null);
  const recommendations = Array.isArray(rawRecs) && rawRecs.length
    ? rawRecs
    : buildFallbackRecommendations(d);

  if (nextY > 250) {
    doc.addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 297, "F");
    nextY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Plano de Acao e Recomendacoes Tecnicas", 14, nextY);
  nextY += 5;

  recommendations.forEach((rec, idx) => {
    const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, 172);
    const boxHeight = Math.max(9, lines.length * 4.5 + 4);

    if (nextY + boxHeight > 276) {
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, "F");
      nextY = 20;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, nextY, 182, boxHeight, 2, 2, "FD");

    doc.setFillColor(2, 132, 199);
    doc.rect(14, nextY, 2.2, boxHeight, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(lines, 19, nextY + 5.2);

    nextY += boxHeight + 2.5;
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 285, 196, 285);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CyberCheck PRO Security Center", 14, 290);
    doc.text(`Pagina ${i} de ${totalPages}`, 174, 290);
  }

  const safeHost = entry.target.replace(/^https?:\/\//i, "").replace(/[^a-z0-9.-]/gi, "_");
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`cybercheck-relatorio-${safeHost}-${stamp}.pdf`);
}

window.generateAuditPdfReport = generateAuditPdfReport;

document.addEventListener("DOMContentLoaded", initAuditModule);