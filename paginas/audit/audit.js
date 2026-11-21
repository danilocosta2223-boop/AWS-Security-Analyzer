// ==========================================
// BLOCO 01: Configuracao da API e Seletores
// ==========================================
const API_BASE_URL = "https://aws-security-analyzer.onrender.com";
const STORAGE_KEY = "cybershield_audit_history_v1";
const THEME_STORAGE_KEY = "cybershield_theme";

const elements = {
  auditForm: document.getElementById("auditForm"),
  targetInput: document.getElementById("urlInput"),
  runAuditBtn: document.getElementById("runAuditBtn"),
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

// ==========================================
// BLOCO 02: Alternancia de Tema
// ==========================================
function applyAuditTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = normalized;

  if (elements.auditThemeLink) {
    elements.auditThemeLink.href = normalized === "light"
      ? "../styles-light/audit.css"
      : "../styles-dark/audit.css";
  }

  localStorage.setItem(THEME_STORAGE_KEY, normalized);
}

function toggleAuditTheme() {
  const current = document.body.dataset.theme === "light" ? "light" : "dark";
  applyAuditTheme(current === "dark" ? "light" : "dark");
}

// ==========================================
// BLOCO 03: Verificacao de Saude (Health Check)
// ==========================================
async function checkApiHealth() {
  if (!elements.healthStatus) return false;

  elements.healthStatus.textContent = "Verificando API...";
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
      try { data = await response.json(); } catch (_) { data = null; }

      elements.healthStatus.textContent = "API Online";
      if (elements.apiVersion) {
        elements.apiVersion.textContent = `Aplicacao: ${data?.application || data?.Application || "Cyber Shield API"}`;
      }
      if (elements.backendType) {
        elements.backendType.textContent = `Timestamp: ${data?.timestamp || data?.Timestamp || new Date().toISOString()}`;
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
// BLOCO 04: Requisicao de Auditoria ao Backend
// ==========================================
async function executeAuditoria(target) {
  const payload = { url: target };
  const endpoints = [`${API_BASE_URL}/api/audit`, `${API_BASE_URL}/api/auditoria`];
  let lastError = null;

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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

// ==========================================
// BLOCO 05: Normalizacao e Historico Local
// ==========================================
function normalizeAuditResult(target, rawData, elapsedMs) {
  const scoreRaw = rawData?.score ?? rawData?.Score ?? 0;
  const score = Math.max(0, Math.min(100, Math.round(Number(scoreRaw) || 0)));

  const riskRaw = rawData?.risk ?? rawData?.Risk;
  const risk = typeof riskRaw === "string" && riskRaw.trim()
    ? riskRaw.trim().toUpperCase()
    : score >= 85 ? "LOW" : score >= 60 ? "MEDIUM" : "HIGH";

  const gradeRaw = rawData?.grade ?? rawData?.Grade;
  const grade = typeof gradeRaw === "string" && gradeRaw.trim()
    ? gradeRaw.trim()
    : score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F";

  const resolvedTarget = rawData?.target ?? rawData?.Target ?? rawData?.url ?? rawData?.Url ?? target;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    target: resolvedTarget,
    score,
    grade,
    risk,
    elapsedMs,
    timestamp: rawData?.scanDate ?? rawData?.ScanDate ?? new Date().toISOString(),
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

function renderAuditResult(entry) {
  const d = entry.details || {};
  const scanDateText = entry.timestamp ? new Date(entry.timestamp).toLocaleString("pt-BR") : "--";

  if (elements.scoreValue) elements.scoreValue.textContent = `${entry.score}`;
  if (elements.gradeValue) elements.gradeValue.textContent = `Nota ${entry.grade} - ${entry.target}`;
  if (elements.riskValue) elements.riskValue.textContent = entry.risk;
  if (elements.analysisTime) {
    elements.analysisTime.textContent = entry.elapsedMs ? `${(entry.elapsedMs / 1000).toFixed(2)}s` : "--";
  }

  const vt = d.virustotal ?? d.VirusTotal;
  if (elements.virusTotalStatus) {
    if (vt && typeof vt === "object") {
      const mal = vt.malicious ?? vt.Malicious ?? vt.stats?.malicious ?? 0;
      const susp = vt.suspicious ?? vt.Suspicious ?? vt.stats?.suspicious ?? 0;
      const harm = vt.harmless ?? vt.Harmless ?? vt.stats?.harmless ?? 0;
      const st = vt.status ?? vt.Status ?? "ok";
      elements.virusTotalStatus.textContent = `Status: ${st} | Maliciosos: ${mal} | Suspeitos: ${susp} | Seguros: ${harm}`;
    } else {
      elements.virusTotalStatus.textContent = `Risco geral: ${entry.risk} | Score: ${entry.score}/100 | Verificado em: ${scanDateText}`;
    }
  }

  const ssl = d.ssl ?? d.Ssl;
  const sslValid = d.sslValid ?? d.SslValid;
  if (elements.sslStatus) {
    if (ssl && typeof ssl === "object") {
      const enabled = Boolean(ssl.enabled ?? ssl.Enabled);
      const scheme = ssl.scheme ?? ssl.Scheme ?? "";
      const code = ssl.statusCode ?? ssl.StatusCode;
      const detail = ssl.detail ?? ssl.Detail ?? "";
      elements.sslStatus.textContent = `${enabled ? "HTTPS Ativo" : "Sem TLS"}${scheme ? ` (${scheme})` : ""}${code ? ` | HTTP ${code}` : ""}${detail ? ` - ${detail}` : ""}`;
    } else if (typeof sslValid === "boolean") {
      elements.sslStatus.textContent = sslValid ? "Valido / Ativo (TLS verificado)" : "Invalido / Ausente";
    } else {
      elements.sslStatus.textContent = "Sem detalhes de SSL/TLS na resposta.";
    }
  }

  const whois = d.whois ?? d.Whois;
  if (elements.whoisStatus) {
    if (whois && typeof whois === "object") {
      const dom = whois.domain ?? whois.Domain ?? entry.target;
      const tld = whois.tld ?? whois.Tld ?? "";
      const src = whois.source ?? whois.Source ?? "";
      elements.whoisStatus.textContent = `Dominio: ${dom}${tld ? ` | TLD: .${tld}` : ""}${src ? ` | Fonte: ${src}` : ""}`;
    } else {
      elements.whoisStatus.textContent = `Alvo: ${entry.target} | Sem registo WHOIS no payload atual`;
    }
  }

  const tech = d.technologies ?? d.Technologies;
  if (elements.technologyList) {
    if (Array.isArray(tech) && tech.length > 0) {
      elements.technologyList.textContent = tech.join(" | ");
    } else {
      elements.technologyList.textContent = "Stack nao informada na resposta atual";
    }
  }

  const recon = d.recon ?? d.Recon;
  if (elements.reconStatus) {
    if (recon && typeof recon === "object") {
      const robots = Boolean(recon.robotsReachable ?? recon.RobotsReachable);
      const sitemap = Boolean(recon.sitemapReachable ?? recon.SitemapReachable);
      elements.reconStatus.textContent = `robots.txt: ${robots ? "Encontrado" : "Nao encontrado"} | sitemap.xml: ${sitemap ? "Encontrado" : "Nao encontrado"}`;
    } else {
      elements.reconStatus.textContent = "Recon detalhado nao incluido na resposta atual";
    }
  }

  const dns = d.dns ?? d.Dns;
  if (elements.dnsStatus) {
    if (dns && typeof dns === "object") {
      const ips = Array.isArray(dns.addresses ?? dns.Addresses) ? (dns.addresses ?? dns.Addresses) : [];
      const hostName = dns.hostName ?? dns.HostName ?? "";
      elements.dnsStatus.textContent = `IPs: ${ips.length ? ips.join(", ") : "Nenhum"}${hostName ? ` | Host: ${hostName}` : ""}`;
    } else {
      elements.dnsStatus.textContent = "Registos DNS nao incluidos na resposta atual";
    }
  }

  const headers = d.headers ?? d.Headers;
  if (elements.headersStatus) {
    if (headers && typeof headers === "object") {
      const hsts = Boolean(headers.hasStrictTransportSecurity ?? headers.HasStrictTransportSecurity);
      const csp = Boolean(headers.hasContentSecurityPolicy ?? headers.HasContentSecurityPolicy);
      const xfo = Boolean(headers.hasXFrameOptions ?? headers.HasXFrameOptions);
      const srv = headers.server ?? headers.Server ?? "N/A";
      elements.headersStatus.textContent = `HSTS: ${hsts ? "Sim" : "Nao"} | CSP: ${csp ? "Sim" : "Nao"} | X-Frame-Options: ${xfo ? "Sim" : "Nao"} | Server: ${srv}`;
    } else {
      elements.headersStatus.textContent = "Cabecalhos HTTP nao incluidos na resposta atual";
    }
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
    if (elements.jsonResult) {
      elements.jsonResult.textContent = "Erro: informe uma URL ou dominio valido para auditar.";
    }
    return;
  }

  setLoadingState(true);
  setModulesState("Analisando...");
  if (elements.gradeValue) elements.gradeValue.textContent = "Executando Auditoria...";
  if (elements.riskValue) elements.riskValue.textContent = "RUNNING";

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
    if (elements.gradeValue) elements.gradeValue.textContent = "Erro na Auditoria";
    if (elements.riskValue) elements.riskValue.textContent = "ERROR";
    if (elements.jsonResult) elements.jsonResult.textContent = `Erro: ${error.message}`;
  } finally {
    setLoadingState(false);
  }
}

function bindQuickTargets() {
  if (!elements.quickUrlButtons || !elements.targetInput) return;

  elements.quickUrlButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.targetInput.value = btn.dataset.url || "";
    });
  });
}

function initAuditModule() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.theme || "dark";
  applyAuditTheme(savedTheme);
  elements.themeToggleBtn?.addEventListener("click", toggleAuditTheme);

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