
"use strict";

// =============================================
// SECTION 1: GLOBAL APP STATE
// =============================================
const AppState = {
  isListening: false,
  objective: "Close the software deal at premium pricing without offering discounts.",
  openRouterKey: "",
  model: "openrouter/free",
  recognitionInstance: null,
  transcriptHistory: [],
  selectedScenarioId: null,
  lastRequestId: 0
};

// 5 Predefined Offline Demonstration Scenarios (Deterministic)
const DEMO_SCENARIOS = {
  1: {
    name: "Sales Negotiation",
    objective: "Close a \u20b95 lakh software deal without offering discounts.",
    statement: "Your competitor offers the same features for a lower price.",
    classification: "STATUS:OBJECTION",
    status: "OBJECTION",
    nudge: "Differentiate value",
    explanation: "The client introduces pricing resistance by citing a cheaper competitor. Counter by emphasizing unique ROI, enterprise support, and lower total cost of ownership rather than conceding a price discount."
  },
  2: {
    name: "Job Interview",
    objective: "Demonstrate technical skills and secure the position.",
    statement: "You don't have much industry experience.",
    classification: "STATUS:OBJECTION",
    status: "OBJECTION",
    nudge: "Highlight practical projects",
    explanation: "The interviewer doubts tenure. Pivot from chronological years to demonstrable hands-on project architectures, problem-solving speed, and recent production-grade contributions."
  },
  3: {
    name: "Customer Support",
    objective: "Resolve the customer's problem and maintain satisfaction.",
    statement: "I've contacted support three times, and nobody has solved my problem.",
    classification: "STATUS:OBJECTION",
    status: "OBJECTION",
    nudge: "Acknowledge frustration",
    explanation: "The customer is frustrated by repeated delays. De-escalate immediately with active empathy and clear personal accountability before walking through technical troubleshooting steps."
  },
  4: {
    name: "Team Meeting",
    objective: "Finalize the project plan and assign responsibilities.",
    statement: "We probably can't finish this by Friday.",
    classification: "STATUS:OBJECTION",
    status: "OBJECTION",
    nudge: "Identify blockers",
    explanation: "A team member flags a schedule risk. Uncover specific bottlenecks immediately and adjust task allocations to preserve critical sprint milestones."
  },
  5: {
    name: "Business Partnership",
    objective: "Secure a partnership with clearly defined responsibilities and timelines.",
    statement: "We can provide the technical team if you handle implementation.",
    classification: "STATUS:LEVERAGE",
    status: "LEVERAGE",
    nudge: "Define responsibilities",
    explanation: "The partner signals clear willingness to commit engineering resources. Lock down exact operational scopes, milestone owners, and governance cadences immediately."
  }
};

// =============================================
// SECTION 2: DOM HELPER
// =============================================
function el(id) { return document.getElementById(id); }

// =============================================
// SECTION 3: CLOCK ENGINE
// =============================================
function startClockEngine() {
  function tick() {
    var now = new Date();
    var lc = el("live-clock");
    if (lc) lc.textContent = String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":"+String(now.getSeconds()).padStart(2,"0");
    var fc = el("footer-clock");
    if (fc) fc.textContent = String(now.getUTCHours()).padStart(2,"0")+":"+String(now.getUTCMinutes()).padStart(2,"0")+":"+String(now.getUTCSeconds()).padStart(2,"0")+" UTC";
  }
  tick();
  setInterval(tick, 1000);
}

// =============================================
// SECTION 4: RAM COMPLIANCE BUFFER (PRIVACY REGEX)
// =============================================
function sanitizeInboundPayload(text) {
  var s = String(text);
  // Sequential regex sanitization
  s = s.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[ENCRYPTED_CARD]");
  s = s.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[ENCRYPTED_EMAIL]");
  s = s.replace(/\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g, "[ENCRYPTED_CONTACT]");
  return s;
}

// =============================================
// SECTION 5: TOAST NOTIFICATION SYSTEM
// =============================================
function showToast(message, type) {
  var container = el("toast-container");
  if (!container) return;
  var colorMap = {
    info:    "bg-blue-900/90 border-blue-700/60 text-blue-200",
    success: "bg-emerald-900/90 border-emerald-700/60 text-emerald-200",
    error:   "bg-red-900/90 border-red-700/60 text-red-200",
    warning: "bg-amber-900/90 border-amber-700/60 text-amber-200"
  };
  var toastEl = document.createElement("div");
  toastEl.className = "pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold font-mono-app shadow-xl backdrop-blur-sm " + (colorMap[type] || colorMap.info);
  toastEl.style.cssText = "opacity:0;transform:translateX(20px);transition:opacity 0.25s ease,transform 0.25s ease;";
  toastEl.setAttribute("role", "alert");

  var iconMap = {
    info:    '<svg class="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    success: '<svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    error:   '<svg class="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    warning: '<svg class="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
  };

  toastEl.innerHTML = (iconMap[type] || iconMap.info) + '<span>' + message + '</span>';
  container.appendChild(toastEl);

  requestAnimationFrame(function() {
    toastEl.style.opacity = "1";
    toastEl.style.transform = "translateX(0)";
  });

  setTimeout(function() {
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translateX(20px)";
    setTimeout(function() {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 250);
  }, 4200);
}

// =============================================
// SECTION 6: TRANSCRIPT LOG & CONSOLE
// =============================================
function appendTranscriptEntry(text, wasScrubbed, sourceTag) {
  var sa = el("transcript-scroll-area");
  if (!sa) return;
  var es = el("transcript-empty-state");
  if (es && es.parentNode) es.parentNode.removeChild(es);
  var now = new Date();
  var ts = String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":"+String(now.getSeconds()).padStart(2,"0");
  
  var row = document.createElement("div");
  row.className = "transcript-entry flex items-start gap-2 py-1 border-b border-slate-800/40";
  
  var tEl = document.createElement("span");
  tEl.className = "flex-shrink-0 text-slate-500 text-xs select-none w-14";
  tEl.textContent = ts;

  var tagEl = document.createElement("span");
  if (sourceTag === "DEMO") {
    tagEl.className = "flex-shrink-0 text-[10px] px-1.5 py-0.2 rounded bg-purple-950/70 text-purple-300 border border-purple-600/40 select-none font-bold";
    tagEl.textContent = "DEMO";
  } else {
    tagEl.className = "flex-shrink-0 text-[10px] px-1.5 py-0.2 rounded bg-blue-950/70 text-blue-300 border border-blue-600/40 select-none font-bold";
    tagEl.textContent = "LIVE";
  }

  var bEl = document.createElement("span");
  bEl.className = "text-slate-200 text-xs leading-relaxed break-words flex-1";
  bEl.textContent = text;

  row.appendChild(tEl);
  row.appendChild(tagEl);
  row.appendChild(bEl);

  if (wasScrubbed) {
    var sh = document.createElement("span");
    sh.className = "flex-shrink-0 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-600/40 select-none";
    sh.title = "PII scrubbed by RAM Compliance Buffer";
    sh.textContent = "PII-SCRUBBED";
    row.appendChild(sh);
  }

  sa.appendChild(row);
  var ce = el("transcript-count");
  if (ce) {
    var count = sa.querySelectorAll(".transcript-entry").length;
    ce.textContent = count + (count === 1 ? " entry" : " entries");
  }
  sa.scrollTop = sa.scrollHeight;
}

function clearTranscript() {
  var sa = el("transcript-scroll-area");
  if (!sa) return;
  sa.querySelectorAll(".transcript-entry").forEach(function(e) { e.parentNode.removeChild(e); });
  var es = document.createElement("div");
  es.id = "transcript-empty-state";
  es.className = "flex flex-col items-center justify-center h-full text-center py-12";
  es.innerHTML = '<svg class="w-8 h-8 text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg><p class="text-slate-500 font-medium">Awaiting live speech or demo input.</p><p class="text-slate-600 text-[11px] mt-1">Activate session above or click any Real-World Scenario below.</p>';
  sa.appendChild(es);
  var ce = el("transcript-count");
  if (ce) ce.textContent = "0 entries";
  AppState.transcriptHistory = [];
  showToast("Transcript log cleared.", "info");
}

// =============================================
// SECTION 7: STRATEGIC HUD STATE MACHINE
// =============================================
function updateHUDApiStatus(state, label) {
  var dot = el("hud-api-dot"); var lbl = el("hud-api-label");
  if (!dot || !lbl) return;
  var cm = {
    active: "bg-emerald-500",
    objection: "bg-red-500",
    leverage: "bg-emerald-500",
    pending: "bg-amber-400",
    standby: "bg-slate-700",
    demo: "bg-purple-400",
    error: "bg-red-600"
  };
  dot.className = "w-1.5 h-1.5 rounded-full transition-all duration-300 " + (cm[state] || cm.standby);
  lbl.textContent = label || "MODE: Standby";
}

function updateHUDTimestamp() {
  var e = el("hud-last-update");
  if (!e) return;
  var now = new Date();
  e.textContent = "Updated: "+String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":"+String(now.getSeconds()).padStart(2,"0");
}

function setHUDIdle() {
  var hc = el("hud-card"); if (!hc) return;
  hc.classList.remove("hud-alert-objection","hud-alert-leverage");
  hc.classList.add("hud-idle-border");
  var bw = el("hud-badge-container"); if (bw) { bw.classList.add("hidden"); bw.innerHTML = ""; }
  var sl = el("hud-status-label"); if (sl) { sl.className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 transition-all duration-300"; sl.textContent="Monitoring Conversation"; }
  var nt = el("hud-nudge-text"); if (nt) { nt.className="text-3xl font-black text-slate-600 leading-snug transition-all duration-300"; nt.textContent="— —"; }
  var st = el("hud-sub-text"); if (st) { st.className="mt-2 text-xs text-slate-600 font-mono-app max-w-md"; st.textContent="Casual dialogue detected. Strategic objective remains uncompromised."; }
  var eb = el("hud-explanation-box"); if (eb) eb.classList.add("hidden");
  updateHUDApiStatus("active","LIVE: IDLE");
}

function setHUDObjection(nudgePhrase, explanationText, isDemo) {
  var hc = el("hud-card"); if (!hc) return;
  hc.classList.remove("hud-idle-border","hud-alert-leverage");
  hc.classList.add("hud-alert-objection");
  
  var bw = el("hud-badge-container");
  if (bw) {
    bw.classList.remove("hidden");
    bw.innerHTML = "";
    var nb = document.createElement("span");
    nb.className = "badge-pop inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-red-950/80 border border-red-500 text-red-300 shadow-lg shadow-red-900/30";
    nb.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> 🚨 OBJECTION ALERT' + (isDemo ? ' <span class="text-[10px] text-red-400 font-normal">[DEMO]</span>' : '');
    bw.appendChild(nb);
  }

  var sl = el("hud-status-label");
  if (sl) {
    sl.className = "text-xs font-bold text-red-400 uppercase tracking-widest mb-2 transition-all duration-300";
    sl.textContent = "Objection Signal Detected";
  }

  var nt = el("hud-nudge-text");
  if (nt) {
    nt.className = "text-3xl font-black text-red-300 leading-snug transition-all duration-300 nudge-appear";
    nt.textContent = nudgePhrase ? nudgePhrase.trim() : "Counter Now";
  }

  var st = el("hud-sub-text");
  if (st) {
    st.className = "mt-2 text-xs text-red-400/90 font-mono-app max-w-md";
    st.textContent = "Tactical recommendation to overcome friction and protect your objective:";
  }

  var eb = el("hud-explanation-box");
  var et = el("hud-explanation-text");
  if (eb && et && explanationText) {
    et.textContent = explanationText;
    eb.className = "mt-3 max-w-md w-full px-4 py-2.5 rounded-xl bg-red-950/30 border border-red-800/50 text-xs font-mono-app text-red-200 text-left nudge-appear";
    eb.classList.remove("hidden");
  } else if (eb) {
    eb.classList.add("hidden");
  }

  updateHUDApiStatus(isDemo ? "demo" : "objection", isDemo ? "DEMO: Objection" : "LIVE: Objection");
  updateHUDTimestamp();
}

function setHUDLeverage(nudgePhrase, explanationText, isDemo) {
  var hc = el("hud-card"); if (!hc) return;
  hc.classList.remove("hud-idle-border","hud-alert-objection");
  hc.classList.add("hud-alert-leverage");

  var bw = el("hud-badge-container");
  if (bw) {
    bw.classList.remove("hidden");
    bw.innerHTML = "";
    var nb = document.createElement("span");
    nb.className = "badge-pop inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-emerald-950/80 border border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-900/30";
    nb.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ⚡ LEVERAGE CAPTURED' + (isDemo ? ' <span class="text-[10px] text-emerald-400 font-normal">[DEMO]</span>' : '');
    bw.appendChild(nb);
  }

  var sl = el("hud-status-label");
  if (sl) {
    sl.className = "text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 transition-all duration-300";
    sl.textContent = "High-Value Leverage Point";
  }

  var nt = el("hud-nudge-text");
  if (nt) {
    nt.className = "text-3xl font-black text-emerald-300 leading-snug transition-all duration-300 nudge-appear";
    nt.textContent = nudgePhrase ? nudgePhrase.trim() : "Advance Objective";
  }

  var st = el("hud-sub-text");
  if (st) {
    st.className = "mt-2 text-xs text-emerald-400/90 font-mono-app max-w-md";
    st.textContent = "Tactical exploitation recommendation to capitalize on buying signal / commitment:";
  }

  var eb = el("hud-explanation-box");
  var et = el("hud-explanation-text");
  if (eb && et && explanationText) {
    et.textContent = explanationText;
    eb.className = "mt-3 max-w-md w-full px-4 py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs font-mono-app text-emerald-200 text-left nudge-appear";
    eb.classList.remove("hidden");
  } else if (eb) {
    eb.classList.add("hidden");
  }

  updateHUDApiStatus(isDemo ? "demo" : "leverage", isDemo ? "DEMO: Leverage" : "LIVE: Leverage");
  updateHUDTimestamp();
}

function resetHUDToStandby() {
  var hc = el("hud-card"); if (!hc) return;
  hc.classList.remove("hud-alert-objection","hud-alert-leverage");
  hc.classList.add("hud-idle-border");
  var bw = el("hud-badge-container"); if (bw) { bw.classList.add("hidden"); bw.innerHTML = ""; }
  var sl = el("hud-status-label"); if (sl) { sl.className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 transition-all duration-300"; sl.textContent="Awaiting Tactical Signal"; }
  var nt = el("hud-nudge-text"); if (nt) { nt.className="text-3xl font-black text-slate-600 leading-snug transition-all duration-300"; nt.textContent="— —"; }
  var st = el("hud-sub-text"); if (st) { st.className="mt-2 text-xs text-slate-600 font-mono-app max-w-md"; st.textContent="AI copilot will surface real-time actionable cues in your peripheral vision."; }
  var eb = el("hud-explanation-box"); if (eb) eb.classList.add("hidden");
  var lu = el("hud-last-update"); if (lu) lu.textContent="—";
  updateHUDApiStatus("standby","MODE: Standby");
}

function resetDemoToStandby() {
  for (var s = 1; s <= 5; s++) {
    var card = el("scenario-card-" + s);
    if (card) card.classList.remove("scenario-card-active");
  }
  AppState.selectedScenarioId = null;
  resetHUDToStandby();
  showToast("Demo reset to standby state.", "info");
}

// =============================================
// SECTION 8: INTERACTIVE REAL-WORLD DEMO ENGINE
// =============================================
function selectAndRunScenario(scenarioId) {
  var sc = DEMO_SCENARIOS[scenarioId];
  if (!sc) return;

  for (var s = 1; s <= 5; s++) {
    var card = el("scenario-card-" + s);
    if (card) {
      if (s === scenarioId) card.classList.add("scenario-card-active");
      else card.classList.remove("scenario-card-active");
    }
  }
  AppState.selectedScenarioId = scenarioId;

  AppState.objective = sc.objective;
  var oi = el("objective-input"); if (oi) oi.value = sc.objective;
  var od = el("hud-objective-display"); if (od) od.textContent = sc.objective;

  var sanitized = sanitizeInboundPayload(sc.statement);
  appendTranscriptEntry(sanitized, false, "DEMO");

  if (sc.status === "OBJECTION") {
    setHUDObjection(sc.nudge, sc.explanation, true);
    showToast("🚨 [DEMO] " + sc.name + " objection identified: \"" + sc.nudge + "\"", "warning");
  } else if (sc.status === "LEVERAGE") {
    setHUDLeverage(sc.nudge, sc.explanation, true);
    showToast("⚡ [DEMO] " + sc.name + " leverage captured: \"" + sc.nudge + "\"", "success");
  }
}

// =============================================
// SECTION 9: QUICK TEST CASES ENGINE
// =============================================
function runQuickTest(testName, objective, statement, expectedStatus, nudge, explanation) {
  AppState.objective = objective;
  var oi = el("objective-input"); if (oi) oi.value = objective;
  var od = el("hud-objective-display"); if (od) od.textContent = objective;

  var sanitized = sanitizeInboundPayload(statement);
  var scrubbed = (sanitized !== statement);
  appendTranscriptEntry(sanitized, scrubbed, "DEMO");

  if (expectedStatus === "OBJECTION") {
    setHUDObjection(nudge, explanation, true);
    showToast("🚨 [DEMO] " + testName + " -> " + nudge, "warning");
  } else if (expectedStatus === "LEVERAGE") {
    setHUDLeverage(nudge, explanation, true);
    showToast("⚡ [DEMO] " + testName + " -> " + nudge, "success");
  }
}

// =============================================
// SECTION 10: CONTEXT-AWARE RESPONSE PARSER
// =============================================
function extractContentFromOpenRouterResponse(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.error) {
    console.error("[FocusPulse AI] OpenRouter error:", data.error);
    return "";
  }
  if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
    var c = data.choices[0];
    if (c.message) {
      if (typeof c.message.content === "string" && c.message.content.trim() !== "") {
        return c.message.content;
      }
      if (Array.isArray(c.message.content)) {
        return c.message.content.map(function(p) { return (p && p.text) ? p.text : (typeof p === "string" ? p : ""); }).join(" ").trim();
      }
      if (typeof c.message.reasoning === "string" && c.message.reasoning.trim() !== "") {
        return c.message.reasoning;
      }
    }
    if (typeof c.text === "string" && c.text.trim() !== "") {
      return c.text;
    }
  }
  return "";
}

function classifyTextLocally(text) {
  var s = text.toLowerCase();
  
  // 1. Objection Patterns (including phonetic STT approximations like 'cam probability' for competitor)
  if (s.includes("competitor") || s.includes("lower price") || s.includes("cheaper") || s.includes("cam probab") || s.includes("same features for a lower") || s.includes("less price") || s.includes("too high") || s.includes("expensive") || s.includes("cost") || s.includes("budget") || s.includes("discount") || s.includes("price")) {
    return {
      status: "OBJECTION",
      nudge: "Differentiate value",
      explanation: "Pricing or competitor friction identified. Highlight ROI, enterprise reliability, and lower total cost of ownership."
    };
  }
  if (s.includes("experience") || s.includes("tenure") || s.includes("not much") || s.includes("junior") || s.includes("background")) {
    return {
      status: "OBJECTION",
      nudge: "Highlight practical projects",
      explanation: "Experience objection raised. Pivot from chronological years to demonstrable hands-on architectures and problem-solving velocity."
    };
  }
  if (s.includes("three times") || s.includes("contacted support") || s.includes("nobody has solved") || s.includes("frustrated") || s.includes("unresolved") || s.includes("complaining") || s.includes("outage") || s.includes("disruption")) {
    return {
      status: "OBJECTION",
      nudge: "Acknowledge frustration",
      explanation: "Customer friction detected. De-escalate with active empathy and personal accountability before troubleshooting."
    };
  }
  if (s.includes("can't finish") || s.includes("cannot finish") || s.includes("by friday") || s.includes("blocker") || s.includes("delayed") || s.includes("behind schedule") || s.includes("slip")) {
    return {
      status: "OBJECTION",
      nudge: "Identify blockers",
      explanation: "Schedule risk surfaced. Identify specific dependency bottlenecks and reallocate sprint tasks immediately."
    };
  }
  if (s.includes("nobody was assigned") || s.includes("unclear") || s.includes("who will handle") || s.includes("ownership")) {
    return {
      status: "OBJECTION",
      nudge: "Assign clear lead",
      explanation: "Role ambiguity detected. Assign a designated task owner immediately to avoid delivery friction."
    };
  }

  // 2. Leverage Patterns
  if (s.includes("provide the technical team") || s.includes("handle implementation") || s.includes("we can provide") || s.includes("partner") || s.includes("collaborat")) {
    return {
      status: "LEVERAGE",
      nudge: "Define responsibilities",
      explanation: "Partner resource commitment captured. Formalize operational boundaries, milestones, and governance cadences."
    };
  }
  if (s.includes("save") || s.includes("hours every week") || s.includes("time saving") || s.includes("efficiency") || s.includes("great value")) {
    return {
      status: "LEVERAGE",
      nudge: "Reiterate time savings",
      explanation: "Quantified value realization from client. Anchor these exact metrics into your proposal summary."
    };
  }
  if (s.includes("bring our vp") || s.includes("bring our cto") || s.includes("decision maker") || s.includes("leadership")) {
    return {
      status: "LEVERAGE",
      nudge: "Schedule VP call",
      explanation: "Stakeholder expansion signal. Lock the follow-up meeting date immediately while engagement is high."
    };
  }
  if (s.includes("approved the sla") || s.includes("approved") || s.includes("ready to proceed") || s.includes("send the contract") || s.includes("sign today") || s.includes("let's do it")) {
    return {
      status: "LEVERAGE",
      nudge: "Send contract now",
      explanation: "Final compliance barrier cleared. Deliver signature-ready paperwork immediately."
    };
  }
  if (s.includes("personally take ownership") || s.includes("by wednesday") || s.includes("commit") || s.includes("i will do it")) {
    return {
      status: "LEVERAGE",
      nudge: "Confirm target date",
      explanation: "Direct accountability volunteered. Document milestone and deliverables into the project tracker."
    };
  }
  if (s.includes("schedule the kickoff") || s.includes("monday at") || s.includes("calendar invite") || s.includes("next steps")) {
    return {
      status: "LEVERAGE",
      nudge: "Lock calendar invite",
      explanation: "Explicit milestone alignment. Dispatch calendar invite on the call to secure the timeslot."
    };
  }

  return { status: "IDLE", nudge: "", explanation: "" };
}

function parseAndDispatchAPIResponse(responseText) {
  if (!responseText || typeof responseText !== "string" || responseText.trim() === "") {
    setHUDIdle();
    return;
  }
  var payload = String(responseText).trim();
  var upper = payload.toUpperCase();

  var hasObjection = upper.includes("OBJECTION") || upper.includes("STATUS:OBJECTION") || upper.includes("STATUS: OBJECTION") || upper.includes("RESISTANCE") || upper.includes("BLOCKER");
  var hasLeverage = upper.includes("LEVERAGE") || upper.includes("STATUS:LEVERAGE") || upper.includes("STATUS: LEVERAGE") || upper.includes("BUYING SIGNAL") || upper.includes("COMMITMENT");

  var nudge = "";
  var m = payload.match(new RegExp("NUDGE\\s*:\\s*([^\\n\\r\\|]+)", "i")) || payload.match(new RegExp("ACTION\\s*:\\s*([^\\n\\r\\|]+)", "i")) || payload.match(new RegExp("SUGGESTION\\s*:\\s*([^\\n\\r\\|]+)", "i"));
  if (m && m[1]) {
    nudge = m[1].replace(/[\*\[\]"`]/g, "").trim().split(/\s+/).slice(0, 4).join(" ");
  }

  if (hasObjection && !hasLeverage) {
    var finalNudge = nudge || "Address Objection";
    setHUDObjection(finalNudge, "AI identified conversational friction opposing your strategic objective.", false);
    showToast("🚨 Objection identified: " + finalNudge, "warning");
    return;
  }

  if (hasLeverage && !hasObjection) {
    var finalNudge = nudge || "Advance Objective";
    setHUDLeverage(finalNudge, "AI identified positive momentum, commitment, or strategic buying signal.", false);
    showToast("⚡ Leverage captured: " + finalNudge, "success");
    return;
  }

  setHUDIdle();
}

// =============================================
// SECTION 11: LIVE INTELLIGENCE LAYER (AI + LOCAL)
// =============================================
async function processLiveIntelligence(sanitizedText) {
  // Step 1: Immediate real-time local semantic classification for sub-millisecond HUD reactivity
  var localRes = classifyTextLocally(sanitizedText);
  if (localRes.status === "OBJECTION") {
    setHUDObjection(localRes.nudge, localRes.explanation, false);
    showToast("🚨 Objection detected: " + localRes.nudge, "warning");
  } else if (localRes.status === "LEVERAGE") {
    setHUDLeverage(localRes.nudge, localRes.explanation, false);
    showToast("⚡ Leverage captured: " + localRes.nudge, "success");
  } else {
    setHUDIdle();
  }

  // Step 2: If OpenRouter API key is configured, query deep AI classification
  var apiKey = String(AppState.openRouterKey || (el("apikey-input") ? el("apikey-input").value : "")).trim();
  if (apiKey && apiKey.length > 5) {
    callOpenRouterIntelLayer(sanitizedText);
  }
}

async function callOpenRouterIntelLayer(transcriptLine) {
  var apiKey    = String(AppState.openRouterKey || (el("apikey-input") ? el("apikey-input").value : "")).trim();
  var objective = String(AppState.objective);
  var userModel = String(AppState.model || "openrouter/free");
  var line      = String(transcriptLine);
  if (!apiKey) return;

  var requestId = ++AppState.lastRequestId;

  var recentContext = "";
  if (AppState.transcriptHistory.length > 1) {
    var historyWindow = AppState.transcriptHistory.slice(-4, -1);
    if (historyWindow.length > 0) {
      recentContext = "Recent Conversation History:
" + historyWindow.map(function(t, idx) { return (idx + 1) + ". " + t; }).join("
") + "

";
    }
  }

  var systemPrompt =
    "You are FocusPulse AI, an invisible, hyper-focused conversational copilot running in a peripheral vision HUD.
" +
    "The user's defined strategic objective is: "" + objective + ""

" +
    "Evaluate the latest conversational utterance against this objective. (Note: audio transcription may contain phonetic speech-to-text approximations).

" +
    "STRICT OUTPUT PROTOCOL (Choose exactly ONE):
" +
    "1. If casual banter, filler, greeting, or neutral dialogue:
" +
    "STATUS:IDLE

" +
    "2. If friction, resistance, competitor comparison, budget obstacle, delay, or dissatisfaction:
" +
    "STATUS:OBJECTION | NUDGE: [Max 3-word tactical counter recommendation]

" +
    "3. If buying signal, agreement, resource commitment, alignment, or approval:
" +
    "STATUS:LEVERAGE | NUDGE: [Max 3-word tactical exploitation tip]

" +
    "Rules: Output plain text string only. No markdown, quotes, preamble, or explanations.";

  var userPromptContent = recentContext + "Latest Speaker Statement to Classify:
"" + line + """;

  var modelsToTry = [userModel];
  var defaultFallbacks = ["openrouter/free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-lightning:free"];
  for (var f = 0; f < defaultFallbacks.length; f++) {
    if (!modelsToTry.includes(defaultFallbacks[f])) modelsToTry.push(defaultFallbacks[f]);
  }

  updateHUDApiStatus("pending", "LIVE: AI Querying...");

  for (var mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    if (requestId !== AppState.lastRequestId) return;

    var curModel = modelsToTry[mIdx];
    var requestBody = JSON.stringify({
      model: curModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptContent }
      ],
      max_tokens: 60,
      temperature: 0.1
    });

    try {
      var response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "FocusPulse AI PR007"
        },
        body: requestBody
      });

      if (requestId !== AppState.lastRequestId) return;

      if (!response.ok) {
        if (response.status === 404 && mIdx < modelsToTry.length - 1) {
          continue;
        }
        updateHUDApiStatus("active", "LIVE: Local Active");
        return;
      }

      var data = await response.json();
      var content = extractContentFromOpenRouterResponse(data);
      if (content) {
        parseAndDispatchAPIResponse(content);
      }
      return;
    } catch (netErr) {
      console.warn("[FocusPulse AI] Network attempt failed:", netErr);
    }
  }
}

// =============================================
// SECTION 12: BROWSER SPEECH RECOGNITION ENGINE
// =============================================
function buildSpeechRecognitionEngine() {
  var SRAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SRAPI) {
    showToast("Speech Recognition requires Google Chrome or Microsoft Edge.", "error");
    return null;
  }
  var recognition = new SRAPI();
  recognition.continuous     = true;
  recognition.interimResults = false;
  recognition.lang           = "en-US";

  recognition.onresult = function(event) {
    var i = event.resultIndex; var len = event.results.length;
    while (i < len) {
      if (event.results[i].isFinal) {
        var rawText = String(event.results[i][0].transcript).trim();
        if (rawText.length > 0) {
          var sanitized = sanitizeInboundPayload(rawText);
          var wasScrubbed = (sanitized !== rawText);
          AppState.transcriptHistory.push(sanitized);
          appendTranscriptEntry(sanitized, wasScrubbed, "LIVE");
          // Dispatch to live intelligence pipeline
          processLiveIntelligence(sanitized);
        }
      }
      i++;
    }
  };

  recognition.onend = function() {
    if (AppState.isListening) {
      try { recognition.start(); } catch (re) {
        setTimeout(function() {
          if (AppState.isListening) {
            try { recognition.start(); } catch (se) {
              console.warn("[FocusPulse AI] Speech restart deferred:", se.message);
            }
          }
        }, 400);
      }
    }
  };

  recognition.onerror = function(event) {
    var et = String(event.error);
    if (et === "no-speech") return;
    if (et === "audio-capture" || et === "not-allowed") {
      showToast("Microphone note: " + et, "warning");
    }
  };

  recognition.onstart = function() {
    console.info("[FocusPulse AI] Speech recognition listening.");
  };

  return recognition;
}

// =============================================
// SECTION 13: SESSION LIFECYCLE CONTROLS
// =============================================
function validateSessionInputs() {
  var oi = el("objective-input");
  var ov = String(oi ? oi.value : "").trim();
  if (!ov || ov.length < 3) {
    if (oi) oi.value = "Close the software deal at premium pricing without offering discounts.";
    AppState.objective = "Close the software deal at premium pricing without offering discounts.";
  }
  return null;
}

function startFreshNewSession() {
  terminateSession();
  clearTranscript();
  resetHUDToStandby();
  var ai = el("apikey-input");
  if (ai) AppState.openRouterKey = ai.value.trim();
  showToast("Fresh new session initialized. Ready for speech or scenarios.", "success");
}

function activateSession() {
  var btn=el("session-toggle-btn"); var ic=el("btn-idle-content"); var ac=el("btn-active-content"); var ve=el("validation-error");
  var cl=el("console-listen-label"); var cd=el("console-listen-dot"); var hd=el("header-status-dot"); var ht=el("header-status-text");
  var oi=el("objective-input"); var ai=el("apikey-input"); var ms=el("model-select"); var od=el("hud-objective-display");
  
  validateSessionInputs();
  if (ve) ve.classList.add("hidden");

  AppState.objective = oi ? String(oi.value).trim() : "Close the software deal at premium pricing without offering discounts.";
  AppState.openRouterKey = ai ? String(ai.value).trim() : "";
  AppState.model = ms ? String(ms.value).trim() : "openrouter/free";
  AppState.isListening = true;
  AppState.transcriptHistory = [];
  if (od) od.textContent = AppState.objective;
  var amd = el("active-model-display");
  if (amd) amd.textContent = "MODEL: " + AppState.model;

  if (btn) {
    btn.className = "relative flex-1 min-w-[200px] h-14 rounded-2xl font-bold text-sm sm:text-base tracking-widest uppercase bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white shadow-lg shadow-red-500/40 border border-red-500/40 transition-all duration-300 ease-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-500/30 session-active cursor-pointer";
    btn.setAttribute("aria-pressed","true"); btn.setAttribute("aria-label","Terminate session");
  }
  if (ic) ic.classList.add("hidden"); if (ac) ac.classList.remove("hidden");
  if (hd) hd.className="w-2 h-2 rounded-full bg-red-500 animate-pulse transition-all duration-300"; if (ht) ht.textContent="TRACKING";
  if (cl) cl.textContent="Microphone active — listening"; if (cd) cd.className="w-2 h-2 rounded-full bg-red-500 animate-pulse transition-all duration-300";

  if (AppState.recognitionInstance) {
    try { AppState.recognitionInstance.abort(); } catch(e){}
    AppState.recognitionInstance = null;
  }

  var engine = buildSpeechRecognitionEngine();
  if (engine) {
    AppState.recognitionInstance = engine;
    try {
      engine.start();
      if (AppState.openRouterKey && AppState.openRouterKey.length > 5) {
        showToast("Live session active with OpenRouter model: " + AppState.model, "success");
      } else {
        showToast("Live microphone streaming. Speak or test scenarios!", "info");
      }
    } catch (se) {
      console.warn("[FocusPulse AI] Recognition start exception:", se);
      if (se.name === "InvalidStateError") {
        showToast("Microphone already active.", "info");
      } else {
        showToast("Microphone: " + se.message, "info");
      }
    }
  } else {
    showToast("Live Session tracking active (Simulated/Scenario mode).", "info");
  }
}

function terminateSession() {
  AppState.isListening = false;
  if (AppState.recognitionInstance) {
    try { AppState.recognitionInstance.stop(); } catch (e) { console.warn("[FocusPulse AI] Stop warning:", e.message); }
    AppState.recognitionInstance = null;
  }

  var btn=el("session-toggle-btn");
  if (btn) {
    btn.className="relative flex-1 min-w-[200px] h-14 rounded-2xl font-bold text-sm sm:text-base tracking-widest uppercase bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30 transition-all duration-300 ease-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/30 cursor-pointer";
    btn.setAttribute("aria-pressed","false"); btn.setAttribute("aria-label","Start session");
  }
  var ic=el("btn-idle-content"); var ac=el("btn-active-content");
  if (ic) ic.classList.remove("hidden"); if (ac) ac.classList.add("hidden");
  var hd=el("header-status-dot"); var ht=el("header-status-text");
  if (hd) hd.className="w-2 h-2 rounded-full bg-slate-600 transition-all duration-300"; if (ht) ht.textContent="IDLE";
  var cl=el("console-listen-label"); var cd=el("console-listen-dot");
  if (cl) cl.textContent="Microphone standby"; if (cd) cd.className="w-2 h-2 rounded-full bg-slate-700 transition-all duration-300";

  resetHUDToStandby();
  showToast("Live session paused.", "info");
}

function toggleSession() {
  if (AppState.isListening) terminateSession();
  else activateSession();
}

function simulateLiveSpeechInput() {
  var inp = el("live-speech-simulator-input");
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;
  
  inp.value = "";
  var sanitized = sanitizeInboundPayload(text);
  var wasScrubbed = (sanitized !== text);
  AppState.transcriptHistory.push(sanitized);
  appendTranscriptEntry(sanitized, wasScrubbed, "LIVE");

  processLiveIntelligence(sanitized);
}

// =============================================
// SECTION 14: UI UTILITIES & KEY UNMASKING
// =============================================
function toggleKeyVisibility() {
  var input = el("apikey-input");
  var icon = el("eye-icon-show");
  var lbl = el("eye-btn-label");
  var badge = el("key-visibility-badge");
  if (!input) return;
  
  var currentType = input.type || input.getAttribute("type");
  if (currentType === "password") {
    input.type = "text";
    input.setAttribute("type", "text");
    if (icon) icon.textContent = "🔒";
    if (lbl) lbl.textContent = "Hide";
    if (badge) {
      badge.textContent = "UNMASKED";
      badge.className = "text-[10px] font-mono-app px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-600/50 font-bold";
    }
    showToast("API key unmasked.", "info");
  } else {
    input.type = "password";
    input.setAttribute("type", "password");
    if (icon) icon.textContent = "👁️";
    if (lbl) lbl.textContent = "Show";
    if (badge) {
      badge.textContent = "MASKED";
      badge.className = "text-[10px] font-mono-app px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700";
    }
    showToast("API key masked.", "info");
  }
}

// =============================================
// SECTION 15: PRIVACY & RAM SCRUBBING GUARD
// =============================================
window.addEventListener("beforeunload", function() {
  AppState.isListening = false;
  AppState.openRouterKey = "";
  AppState.transcriptHistory = [];
  if (AppState.recognitionInstance) {
    try { AppState.recognitionInstance.stop(); } catch(e){}
    AppState.recognitionInstance = null;
  }
});

// =============================================
// SECTION 16: OBJECTIVE & MODEL SYNC
// =============================================
function initObjectiveSync() {
  var oi=el("objective-input"); var od=el("hud-objective-display"); var ms=el("model-select"); var amd=el("active-model-display");
  var ai=el("apikey-input");
  if (oi && od) {
    oi.addEventListener("input", function() {
      var v=String(oi.value).trim();
      od.textContent = v.length > 0 ? v : "No objective defined.";
      AppState.objective = v;
    });
  }
  if (ai) {
    ai.addEventListener("input", function() {
      AppState.openRouterKey = String(ai.value).trim();
    });
  }
  if (ms && amd) {
    ms.addEventListener("change", function() {
      AppState.model = ms.value;
      amd.textContent = "MODEL: " + ms.value;
    });
  }
}

// =============================================
// SECTION 17: BROWSER COMPATIBILITY
// =============================================
function checkBrowserCompatibility() {
  var SRAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SRAPI) {
    showToast("Speech Recognition requires Chrome/Edge. Interactive Demo mode is fully active.", "warning");
    var btn=el("session-toggle-btn");
    if(btn){
      btn.title="Live speech requires Chrome or Edge. Use interactive demo mode below.";
    }
  }
}

// =============================================
// SECTION 18: BOOTSTRAP INITIALIZATION
// =============================================
document.addEventListener("DOMContentLoaded", function() {
  startClockEngine();
  initObjectiveSync();
  checkBrowserCompatibility();
  console.info("%c[FocusPulse AI] PR 007 | DEFINE 4.0\n%cRAM Compliance Buffer: ACTIVE | Real-World Scenarios: LOADED | AI Gateway: openrouter.ai","color:#10b981;font-weight:bold;font-size:13px;","color:#64748b;font-size:11px;");
  showToast("FocusPulse AI ready. Try the Real-World Scenarios below or activate live mic.", "info");
});
  