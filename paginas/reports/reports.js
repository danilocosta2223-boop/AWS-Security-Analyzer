/* ==========================================
   BLOCO 01: Configuracoes Globais, Chaves e Seletores
   ========================================== */
const HISTORY_STORAGE_KEY = "cybershield_audit_history_v1";
const THEME_STORAGE_KEY = "cybershield_theme";
const HISTORY_UPDATED_EVENT = "cybercheck:history-updated";
const HISTORY_CHANNEL_NAME = "cybercheck_audit_sync_channel";

const state = {
  entries: [],
  selectedId: "",
  lastRawSnapshot: "",
  channel: null
};

const dom = {
  themeToggle: document.getElementById("themeToggle"),
  reportsThemeCss: document.getElementById("reports-theme-css"),
  reportAuditSelect: document.getElementById("reportAuditSelect"),
  exportSingleJsonBtn: document.getElementById("exportSingleJsonBtn"),
  exportAllJsonBtn: document.getElementById("exportAllJsonBtn"),
  exportReportPdfBtn: document.getElementById("exportReportPdfBtn"),
  reportTarget: document.getElementById("reportTarget"),
  reportScore: document.getElementById("reportScore"),
  reportGrade: document.getElementById("reportGrade"),
  reportRisk: document.getElementById("reportRisk"),
  reportModulesList: document.getElementById("reportModulesList"),
  reportRecommendationsList: document.getElementById("reportRecommendationsList"),
  reportJsonPreview: document.getElementById("reportJsonPreview")
};

/* ==========================================
   BLOCO 02: Gerenciamento de Tema (Dark / Light)
   ========================================== */
function getCurrentTheme() {
  return document.body.dataset.theme === "light" || document.body.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function applyTheme(themeName) {
  const normalized = themeName === "light" ? "light" : "dark";
  document.body.dataset.theme = normalized;
  document.body.setAttribute("data-theme", normalized);

  if (dom.reportsThemeCss) {
    dom.reportsThemeCss.setAttribute(
      "href",
      normalized === "light"
        ? "../styles-light/dashboard.css"
        : "../styles-dark/dashboard.css"
    );
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch (err) {
    console.warn("[CyberCheck] Falha ao guardar tema:", err);
  }
}

function toggleTheme() {
  applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
}

/* ==========================================
   BLOCO 03: Normalizacao e Leitura do Historico
   ========================================== */
function normalizeRisk(riskValue, score) {
  const raw = String(riskValue || "").trim().toUpperCase();
  if (raw === "HIGH" || raw === "ALTO" || raw === "CRITICAL") return "HIGH";
  if (raw === "MEDIUM" || raw === "MEDIO" || raw === "MÉDIO") return "MEDIUM";
  if (raw === "LOW" || raw === "BAIXO") return "LOW";
  if (score >= 85) return "LOW";
  if (score >= 60) return "MEDIUM";
  return "HIGH";
}

function normalizeReportEntry(entry) {
  const rawScore = Number(entry?.score ?? entry?.Score ?? 0);
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;
  const risk = normalizeRisk(entry?.risk ?? entry?.Risk, score);
  const grade = String(
    entry?.grade ??
      entry?.Grade ??
      (score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F")
  ).trim();

  return {
    id: String(entry?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    target: String(entry?.target || entry?.url || entry?.domain || "alvo-desconhecido"),
    score,
    grade,
    risk,
    elapsedMs: Number(entry?.elapsedMs) || 0,
    timestamp: entry?.timestamp || entry?.scanDate || entry?.analyzedAt || new Date().toISOString(),
    details: entry?.details && typeof entry.details === "object" ? entry.details : (entry || {})
  };
}

function readRawSnapshot() {
  try {
    return localStorage.getItem(HISTORY_STORAGE_KEY) || "";
  } catch (_) {
    return "";
  }
}

function loadReportEntries() {
  try {
    const raw = readRawSnapshot();
    state.lastRawSnapshot = raw;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeReportEntry) : [];
  } catch (err) {
    console.warn("[CyberCheck] Falha ao ler historico para relatorios:", err);
    return [];
  }
}

function getSelectedEntry() {
  if (!state.entries.length) return null;
  return state.entries.find((item) => item.id === state.selectedId) || state.entries[0];
}

/* ==========================================
   BLOCO 04: Extracao de Modulos e Recomendacoes
   ========================================== */
function extractModulesSummary(entry) {
  const d = entry.details || {};
  const modules = [];

  const vt = d.virustotal ?? d.VirusTotal;
  if (vt && typeof vt === "object") {
    const mal = vt.malicious ?? vt.Malicious ?? vt.stats?.malicious ?? 0;
    const susp = vt.suspicious ?? vt.Suspicious ?? vt.stats?.suspicious ?? 0;
    const harm = vt.harmless ?? vt.Harmless ?? vt.stats?.harmless ?? 0;
    modules.push(`VirusTotal: Maliciosos ${mal} | Suspeitos ${susp} | Seguros ${harm}`);
  } else {
    modules.push(`VirusTotal: Risco ${entry.risk} | Score ${entry.score}/100`);
  }

  const ssl = d.ssl ?? d.Ssl;
  if (ssl && typeof ssl === "object") {
    const enabled = Boolean(ssl.enabled ?? ssl.Enabled);
    const scheme = ssl.scheme ?? ssl.Scheme ?? "";
    const detail = ssl.detail ?? ssl.Detail ?? "";
    modules.push(`SSL/TLS: ${enabled ? "Ativo" : "Inativo"}${scheme ? ` (${scheme})` : ""}${detail ? ` - ${detail}` : ""}`);
  } else if (typeof (d.sslValid ?? d.SslValid) === "boolean") {
    modules.push(`SSL/TLS: ${(d.sslValid ?? d.SslValid) ? "Valido" : "Invalido"}`);
  } else {
    modules.push("SSL/TLS: Sem detalhes adicionais");
  }

  const headers = d.headers ?? d.Headers;
  if (headers && typeof headers === "object") {
    const hsts = Boolean(headers.hasStrictTransportSecurity ?? headers.HasStrictTransportSecurity ?? headers.hsts);
    const csp = Boolean(headers.hasContentSecurityPolicy ?? headers.HasContentSecurityPolicy ?? headers.csp);
    const xfo = Boolean(headers.hasXFrameOptions ?? headers.HasXFrameOptions ?? headers.xFrameOptions);
    modules.push(`Headers HTTP: HSTS ${hsts ? "Sim" : "Nao"} | CSP ${csp ? "Sim" : "Nao"} | X-Frame-Options ${xfo ? "Sim" : "Nao"}`);
  } else {
    modules.push("Headers HTTP: Sem detalhes adicionais");
  }

  const dns = d.dns ?? d.Dns;
  if (dns && typeof dns === "object") {
    const ips = Array.isArray(dns.addresses ?? dns.Addresses) ? (dns.addresses ?? dns.Addresses) : [];
    modules.push(`DNS: ${ips.length ? ips.join(", ") : "Sem IPs listados"}`);
  } else {
    modules.push("DNS: Sem detalhes adicionais");
  }

  const whois = d.whois ?? d.Whois;
  if (whois && typeof whois === "object") {
    modules.push(`WHOIS: Dominio ${whois.domain ?? whois.Domain ?? entry.target}`);
  } else {
    modules.push(`WHOIS: Alvo ${entry.target}`);
  }

  const tech = d.technologies ?? d.Technologies;
  if (Array.isArray(tech) && tech.length > 0) {
    modules.push(`Tecnologias: ${tech.join(" | ")}`);
  }

  return modules;
}

function extractRecommendations(entry) {
  const d = entry.details || {};
  const provided = d.recommendations ?? d.Recommendations;
  if (Array.isArray(provided) && provided.length > 0) {
    return provided.map((item) => String(item));
  }

  const recs = [];
  const ssl = d.ssl ?? d.Ssl;
  const headers = d.headers ?? d.Headers;

  if (ssl && ssl.enabled === false) {
    recs.push("CRITICO: Ativar HTTPS com certificado SSL/TLS valido.");
  }
  if (headers && typeof headers === "object") {
    if (!headers.hasStrictTransportSecurity && !headers.hsts) {
      recs.push("ALTO: Configurar cabecalho Strict-Transport-Security (HSTS).");
    }
    if (!headers.hasContentSecurityPolicy && !headers.csp) {
      recs.push("CRITICO: Definir Content-Security-Policy (CSP) para reduzir riscos de XSS.");
    }
    if (!headers.hasXFrameOptions && !headers.xFrameOptions) {
      recs.push("MEDIO: Adicionar X-Frame-Options para mitigar clickjacking.");
    }
  }
  if (!recs.length) {
    recs.push("Manter monitorizacao continua de certificados TLS, cabecalhos HTTP e registos DNS.");
  }
  return recs;
}

/* ==========================================
   BLOCO 05: Renderizacao da Interface e Selecao
   ========================================== */
function populateAuditSelect(entries, activeId) {
  if (!dom.reportAuditSelect) return;
  dom.reportAuditSelect.innerHTML = "";

  if (!entries.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nenhuma auditoria disponivel no historico";
    dom.reportAuditSelect.appendChild(opt);
    return;
  }

  entries.forEach((item, index) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    const dateText = new Date(item.timestamp).toLocaleString("pt-PT");
    opt.textContent = `#${index + 1} - ${item.target} (${item.score}/100 | ${item.risk}) - ${dateText}`;
    if (item.id === activeId) {
      opt.selected = true;
    }
    dom.reportAuditSelect.appendChild(opt);
  });
}

function renderListItems(listEl, items, emptyText) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = emptyText;
    listEl.appendChild(li);
    return;
  }

  items.forEach((text) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const span = document.createElement("span");
    span.textContent = text;
    li.appendChild(span);
    listEl.appendChild(li);
  });
}

function renderSelectedReport() {
  const entry = getSelectedEntry();

  if (!entry) {
    if (dom.reportTarget) dom.reportTarget.textContent = "--";
    if (dom.reportScore) dom.reportScore.textContent = "--";
    if (dom.reportGrade) dom.reportGrade.textContent = "--";
    if (dom.reportRisk) dom.reportRisk.textContent = "--";
    renderListItems(dom.reportModulesList, [], "Nenhuma auditoria selecionada.");
    renderListItems(dom.reportRecommendationsList, [], "Sem recomendacoes carregadas.");
    if (dom.reportJsonPreview) dom.reportJsonPreview.textContent = "{}";
    return;
  }

  state.selectedId = entry.id;
  if (dom.reportTarget) dom.reportTarget.textContent = entry.target;
  if (dom.reportScore) dom.reportScore.textContent = `${entry.score}/100`;
  if (dom.reportGrade) dom.reportGrade.textContent = entry.grade;
  if (dom.reportRisk) dom.reportRisk.textContent = entry.risk;

  renderListItems(dom.reportModulesList, extractModulesSummary(entry), "Sem modulos disponiveis.");
  renderListItems(dom.reportRecommendationsList, extractRecommendations(entry), "Sem recomendacoes.");

  if (dom.reportJsonPreview) {
    dom.reportJsonPreview.textContent = JSON.stringify(entry.details, null, 2);
  }
}

/* ==========================================
   BLOCO 06: Exportacao JSON, PDF e Sincronizacao
   ========================================== */
function downloadJsonFile(dataObj, filenamePrefix) {
  const content = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleExportSingleJson() {
  const entry = getSelectedEntry();
  if (!entry) return;
  const safeHost = entry.target.replace(/^https?:\/\//i, "").replace(/[^a-z0-9.-]/gi, "_");
  downloadJsonFile(entry, `cybercheck-relatorio-${safeHost}`);
}

function handleExportAllJson() {
  if (!state.entries.length) return;
  downloadJsonFile(state.entries, "cybercheck-relatorios-todos");
}

function handleExportPdf() {
  const entry = getSelectedEntry();
  if (!entry) return;

  const jspdfLib = window.jspdf;
  if (!jspdfLib || !jspdfLib.jsPDF) {
    console.warn("[CyberCheck] Biblioteca jsPDF nao disponivel.");
    return;
  }

  const { jsPDF } = jspdfLib;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const scanDate = new Date(entry.timestamp).toLocaleString("pt-PT");

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("CyberCheck PRO - Relatorio de Auditoria", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Alvo: ${entry.target} | Data: ${scanDate}`, 14, 24);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Score: ${entry.score}/100   |   Nota: ${entry.grade}   |   Risco: ${entry.risk}`, 14, 44);

  const moduleRows = extractModulesSummary(entry).map((line) => {
    const idx = line.indexOf(":");
    if (idx > -1) {
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }
    return ["Modulo", line];
  });

  if (typeof doc.autoTable === "function") {
    doc.autoTable({
      startY: 50,
      head: [["Modulo", "Resultado"]],
      body: moduleRows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 }
    });
  }

  let nextY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 62;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Recomendacoes Tecnicas", 14, nextY);
  nextY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  extractRecommendations(entry).forEach((rec) => {
    const lines = doc.splitTextToSize(`- ${rec}`, 180);
    if (nextY + lines.length * 5 > 280) {
      doc.addPage();
      nextY = 20;
    }
    doc.text(lines, 14, nextY);
    nextY += lines.length * 5 + 2;
  });

  const safeHost = entry.target.replace(/^https?:\/\//i, "").replace(/[^a-z0-9.-]/gi, "_");
  doc.save(`cybercheck-relatorio-${safeHost}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function refreshReportsView(force = false) {
  const snapshot = readRawSnapshot();
  if (!force && snapshot === state.lastRawSnapshot) return;

  state.entries = loadReportEntries();
  const stillExists = state.entries.some((item) => item.id === state.selectedId);
  if (!stillExists) {
    state.selectedId = state.entries[0]?.id || "";
  }

  populateAuditSelect(state.entries, state.selectedId);
  renderSelectedReport();
}

function setupRealtimeSync() {
  if ("BroadcastChannel" in window) {
    state.channel = new BroadcastChannel(HISTORY_CHANNEL_NAME);
    state.channel.addEventListener("message", (event) => {
      if (event?.data?.type === "history-updated") {
        refreshReportsView(true);
      }
    });
  }

  window.addEventListener(HISTORY_UPDATED_EVENT, () => refreshReportsView(true));
  window.addEventListener("focus", () => refreshReportsView(false));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshReportsView(false);
  });

  setInterval(() => refreshReportsView(false), 1500);
}

/* ==========================================
   BLOCO 07: Eventos e Inicializacao
   ========================================== */
function bindEvents() {
  dom.themeToggle?.addEventListener("click", toggleTheme);

  dom.reportAuditSelect?.addEventListener("change", (e) => {
    state.selectedId = e.target.value;
    renderSelectedReport();
  });

  dom.exportSingleJsonBtn?.addEventListener("click", handleExportSingleJson);
  dom.exportAllJsonBtn?.addEventListener("click", handleExportAllJson);
  dom.exportReportPdfBtn?.addEventListener("click", handleExportPdf);

  window.addEventListener("storage", (event) => {
    if (event.key === HISTORY_STORAGE_KEY) {
      refreshReportsView(true);
    } else if (event.key === THEME_STORAGE_KEY) {
      applyTheme(event.newValue || "dark");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  let savedTheme = "dark";
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.theme || "dark";
  } catch (_) {
    savedTheme = "dark";
  }

  applyTheme(savedTheme);
  bindEvents();
  setupRealtimeSync();
  refreshReportsView(true);
});