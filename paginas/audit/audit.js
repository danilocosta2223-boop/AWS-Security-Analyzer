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

  const stepName = String(payload.step ?? payload.Step ?? "").toUpperCase();
  const statusText = String(payload.status ?? payload.Status ?? "");
  const deltaScore = Number(payload.deltaScore ?? payload.DeltaScore ?? 0);
  const partialScore = Number(payload.score ?? payload.Score);
  const detail = String(payload.detail ?? payload.Detail ?? "");

  if (Number.isFinite(partialScore) && elements.scoreValue) {
    elements.scoreValue.textContent = `${Math.max(0, Math.min(100, Math.round(partialScore)))}`;
  }

  const deltaLabel = Number.isFinite(deltaScore) ? ` (+${deltaScore})` : "";
  const formatted = `${statusText}${deltaLabel}${detail ? ` - ${detail}` : ""}`;

  if (stepName === "SSL" && elements.sslStatus) {
    elements.sslStatus.textContent = formatted;
  } else if (stepName === "HEADERS" && elements.headersStatus) {
    elements.headersStatus.textContent = formatted;
  } else if (stepName === "DNS" && elements.dnsStatus) {
    elements.dnsStatus.textContent = formatted;
  } else if (stepName === "WHOIS" && elements.whoisStatus) {
    elements.whoisStatus.textContent = formatted;
  } else if (stepName === "RECON" && elements.reconStatus) {
    elements.reconStatus.textContent = formatted;
  } else if (stepName === "VIRUSTOTAL" && elements.virusTotalStatus) {
    elements.virusTotalStatus.textContent = formatted;
  }
}

async function executeAuditoriaPostFallback(normalizedUrl) {
  const payload = { url: normalizedUrl };
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

function executeAuditoriaStream(target, onProgressStep) {
  const normalizedUrl = normalizeTargetUrl(target);
  const streamUrl = `${API_BASE_URL}/api/auditoria/stream?url=${encodeURIComponent(normalizedUrl)}`;

  console.log("[CyberCheck] Conectando SSE com parametro url:", streamUrl);

  return new Promise((resolve, reject) => {
    let settled = false;
    const eventSource = new EventSource(streamUrl);

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        eventSource.close();
        reject(new Error("Tempo limite excedido no stream SSE da auditoria."));
      }
    }, 45000);

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
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      eventSource.close();
      try {
        const finalPayload = JSON.parse(event.data);
        console.log("[CyberCheck] Evento SSE completed:", finalPayload);
        resolve(finalPayload);
      } catch (err) {
        reject(err);
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
      try {
        const fallbackData = await executeAuditoriaPostFallback(normalizedUrl);
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
  currentAuditEntry = entry;
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
      const st = vt.status ?? vt.Status ?? vt.summary ?? "ok";
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
      const src = whois.source ?? whois.Source ?? whois.registrarHint ?? "";
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
      const robots = Boolean(recon.robotsReachable ?? recon.RobotsReachable ?? recon.robotsTxt);
      const sitemap = Boolean(recon.sitemapReachable ?? recon.SitemapReachable ?? recon.sitemapXml);
      elements.reconStatus.textContent = `robots.txt: ${robots ? "Encontrado" : "Nao encontrado"} | sitemap.xml: ${sitemap ? "Encontrado" : "Nao encontrado"}`;
    } else {
      elements.reconStatus.textContent = "Recon detalhado nao incluido na resposta atual";
    }
  }

  const dns = d.dns ?? d.Dns;
  if (elements.dnsStatus) {
    if (dns && typeof dns === "object") {
      const ips = Array.isArray(dns.addresses ?? dns.Addresses) ? (dns.addresses ?? dns.Addresses) : [];
      const hostName = dns.hostName ?? dns.HostName ?? dns.resolvedIp ?? "";
      elements.dnsStatus.textContent = `IPs: ${ips.length ? ips.join(", ") : "Nenhum"}${hostName ? ` | Host: ${hostName}` : ""}`;
    } else {
      elements.dnsStatus.textContent = "Registos DNS nao incluidos na resposta atual";
    }
  }

  const headers = d.headers ?? d.Headers;
  if (elements.headersStatus) {
    if (headers && typeof headers === "object") {
      const hsts = Boolean(headers.hasStrictTransportSecurity ?? headers.HasStrictTransportSecurity ?? headers.hsts);
      const csp = Boolean(headers.hasContentSecurityPolicy ?? headers.HasContentSecurityPolicy ?? headers.csp);
      const xfo = Boolean(headers.hasXFrameOptions ?? headers.HasXFrameOptions ?? headers.xFrameOptions);
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
  if (elements.scoreValue) elements.scoreValue.textContent = "0";
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
  elements.exportPdfBtn?.addEventListener("click", generateAuditPdfReport);

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

// ==========================================
// BLOCO 08: Geracao de Relatorio PDF Executivo
// ==========================================
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

  // Cabecalho escuro institucional
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CyberCheck PRO - Relatorio de Auditoria", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Alvo analisado: ${entry.target}`, 14, 24);
  doc.text(`Data/Hora: ${scanDate} | Tempo de resposta: ${entry.elapsedMs ? (entry.elapsedMs / 1000).toFixed(2) + "s" : "--"}`, 14, 30);

  // Cartao de Resumo (Score, Nota e Risco)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, 182, 24, 3, 3, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Security Score: ${entry.score}/100`, 20, 52);
  doc.text(`Classificacao: Nota ${entry.grade}`, 86, 52);

  if (entry.risk === "LOW") doc.setTextColor(22, 101, 52);
  else if (entry.risk === "MEDIUM") doc.setTextColor(161, 98, 7);
  else doc.setTextColor(185, 28, 28);
  doc.text(`Nivel de Risco: ${entry.risk}`, 142, 52);

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Resumo consolidado das verificacoes tecnicas automatizadas.", 20, 60);

  // Tabela dos Modulos Auditados
  const sslText = elements.sslStatus?.textContent || "Nao informado";
  const headersText = elements.headersStatus?.textContent || "Nao informado";
  const dnsText = elements.dnsStatus?.textContent || "Nao informado";
  const whoisText = elements.whoisStatus?.textContent || "Nao informado";
  const reconText = elements.reconStatus?.textContent || "Nao informado";
  const vtText = elements.virusTotalStatus?.textContent || "Nao informado";
  const techText = elements.technologyList?.textContent || "Nao informado";

  doc.autoTable({
    startY: 72,
    head: [["Modulo", "Resultado / Diagnostico"]],
    body: [
      ["SSL / TLS", sslText],
      ["Headers HTTP", headersText],
      ["DNS e E-mail", dnsText],
      ["WHOIS / Dominio", whoisText],
      ["Recon (Robots/Sitemap)", reconText],
      ["VirusTotal", vtText],
      ["Tecnologias Detectadas", techText]
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold" }, 1: { cellWidth: 134 } }
  });

  // Recomendacoes Tecnicas
  let nextY = doc.lastAutoTable.finalY + 10;
  const recommendations = Array.isArray(d.recommendations ?? d.Recommendations)
    ? (d.recommendations ?? d.Recommendations)
    : buildFallbackRecommendations(d);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Recomendacoes de Seguranca", 14, nextY);
  nextY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  recommendations.forEach((rec) => {
    const lines = doc.splitTextToSize(`- ${rec}`, 180);
    if (nextY + lines.length * 5 > 275) {
      doc.addPage();
      nextY = 20;
    }
    doc.text(lines, 14, nextY);
    nextY += lines.length * 5 + 2;
  });

  // Rodape em todas as paginas
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CyberCheck PRO Security Center | Pagina ${i} de ${totalPages}`,
      14,
      290
    );
  }

  const safeHost = entry.target.replace(/^https?:\/\//i, "").replace(/[^a-z0-9.-]/gi, "_");
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`cybercheck-relatorio-${safeHost}-${stamp}.pdf`);
}

function buildFallbackRecommendations(d) {
  const list = [];
  const headers = d.headers ?? d.Headers;
  const ssl = d.ssl ?? d.Ssl;

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

window.generateAuditPdfReport = generateAuditPdfReport;

document.addEventListener("DOMContentLoaded", initAuditModule);


window.dispatchEvent(new CustomEvent("cybercheck:history-updated", { detail: updatedHistory }));

if ("BroadcastChannel" in window) {
  const syncChannel = new BroadcastChannel("cybercheck_audit_sync_channel");
  syncChannel.postMessage({ type: "history-updated", entries: updatedHistory });
  syncChannel.close();
}