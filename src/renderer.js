const COLUMNS = 8;
const ROWS = 9;
const IDLE_FRAMES = [
  { rowIndex: 0, columnIndex: 0, frameDurationMs: 280 },
  { rowIndex: 0, columnIndex: 1, frameDurationMs: 110 },
  { rowIndex: 0, columnIndex: 2, frameDurationMs: 110 },
  { rowIndex: 0, columnIndex: 3, frameDurationMs: 140 },
  { rowIndex: 0, columnIndex: 4, frameDurationMs: 140 },
  { rowIndex: 0, columnIndex: 5, frameDurationMs: 320 },
];
const LONG_IDLE_FRAMES = IDLE_FRAMES.map((frame) => ({
  ...frame,
  frameDurationMs: frame.frameDurationMs * 6,
}));
const STATE_FRAMES = {
  idle: IDLE_FRAMES,
  "running-right": rowFrames(1, 8, 120, 220),
  "running-left": rowFrames(2, 8, 120, 220),
  waving: rowFrames(3, 4, 140, 280),
  jumping: rowFrames(4, 5, 140, 280),
  failed: rowFrames(5, 8, 140, 240),
  waiting: rowFrames(6, 6, 150, 260),
  running: rowFrames(7, 6, 120, 220),
  review: rowFrames(8, 6, 150, 280),
};

const params = new URLSearchParams(location.search);
const codexHome = params.get("codexHome") || "";
const initialPetId = params.get("pet") || "";
const initialState = params.get("state") || "";
let provider = params.get("provider") || "";
let petSize = Number(params.get("petSize")) || 0;
let currentState = initialState || "auto";
let requestedState = "auto";
let timer = null;
let pets = [];
let statusFile = params.get("statusFile") || "";
let popoverOpen = false;
let settingsOpen = false;
let refreshInFlight = false;
let refreshQueued = false;
let ignoringMouseEvents = null;

const petElement = document.getElementById("pet");
const threadBadge = document.getElementById("threadBadge");
const threadPopover = document.getElementById("threadPopover");
const settingsButton = document.getElementById("settingsButton");
const settingsPopover = document.getElementById("settingsPopover");
const petSelect = document.getElementById("petSelect");
const stateSelect = document.getElementById("stateSelect");
const providerSelect = document.getElementById("providerSelect");
const statusFileInput = document.getElementById("statusFileInput");
const statusFileRow = document.getElementById("statusFileRow");
const petSizeInput = document.getElementById("petSizeInput");
const activeTitle = document.getElementById("activeTitle");
const activeDetail = document.getElementById("activeDetail");
const activeDot = document.getElementById("activeDot");
const statusPill = document.getElementById("statusPill");
const sessionList = document.getElementById("sessionList");
const sourceLabel = document.getElementById("sourceLabel");
const appElement = document.getElementById("app");

function rowFrames(rowIndex, frameCount, frameDurationMs, finalFrameDurationMs) {
  return Array.from({ length: frameCount }, (_value, columnIndex) => ({
    rowIndex,
    columnIndex,
    frameDurationMs: columnIndex === frameCount - 1 ? finalFrameDurationMs : frameDurationMs,
  }));
}

function backgroundPosition(frame) {
  return `${(frame.columnIndex / (COLUMNS - 1)) * 100}% ${(frame.rowIndex / (ROWS - 1)) * 100}%`;
}

function animationForState(state) {
  const frames = STATE_FRAMES[state] || STATE_FRAMES.idle;
  if (state === "idle") return { frames: LONG_IDLE_FRAMES, loopStartIndex: 0 };
  return { frames, loopStartIndex: 0 };
}

function setState(state) {
  if (state === currentState && timer) return;
  currentState = state;
  startAnimation(state);
}

function setRequestedState(state) {
  requestedState = state;
  stateSelect.value = state;
  window.codexPets.updateSettings({ selectedState: state }).catch(console.error);
  if (state !== "auto") setState(state);
}

function startAnimation(state) {
  if (timer) window.clearTimeout(timer);
  const animation = animationForState(state);
  let index = 0;
  const tick = () => {
    const frame = animation.frames[index];
    petElement.style.backgroundPosition = backgroundPosition(frame);
    timer = window.setTimeout(() => {
      index += 1;
      if (index >= animation.frames.length) index = animation.loopStartIndex ?? 0;
      tick();
    }, frame.frameDurationMs);
  };
  tick();
}

function selectPet(petId) {
  const pet = pets.find((item) => item.id === petId) || pets[0];
  if (!pet) {
    petElement.style.backgroundImage = "";
    return;
  }
  petElement.style.backgroundImage = `url(${pet.spritesheetDataUrl})`;
  petSelect.value = pet.id;
  window.codexPets.updateSettings({ selectedPetId: pet.id }).catch(console.error);
}

async function refreshActivity() {
  if (refreshInFlight) {
    refreshQueued = true;
    return;
  }
  refreshInFlight = true;
  try {
    const activity = await window.codexPets.readActivity({ codexHome, statusFile, provider });
    renderActivity(activity);
    if (requestedState === "auto") setState(activity.petState || "idle");
  } finally {
    refreshInFlight = false;
    if (refreshQueued) {
      refreshQueued = false;
      window.setTimeout(() => refreshActivity().catch(console.error), 0);
    }
  }
}

function renderActivity(activity) {
  const active = activity.active;
  const sessions = activity.sessions || [];
  const isDesktop = activity.source === "desktop";
  const activeCount = sessions.filter((session) => session.state && session.state !== "idle").length;
  const badgeCount = activeCount || sessions.length || 0;
  appElement.classList.toggle("desktop-mode", isDesktop);
  threadBadge.hidden = isDesktop;
  if (isDesktop && popoverOpen) setPopoverOpen(false);
  sourceLabel.hidden = true;
  sourceLabel.textContent = "";
  threadBadge.textContent = isDesktop ? "0" : String(Math.min(99, badgeCount));
  threadBadge.className = `thread-badge ${isDesktop ? "idle" : activity.state || "idle"}`;
  threadBadge.title = isDesktop ? "Desktop pet controls" : `${badgeCount} ${badgeCount === 1 ? "thread" : "threads"}`;
  activeTitle.textContent = active ? displayTitle(active, activity.source) : isDesktop ? "Desktop Pet" : `No ${labelForSource(activity.source)} sessions found`;
  activeDot.hidden = isDesktop || !active;
  activeDot.className = `session-dot active-dot ${active?.state || activity.state || "idle"}`;
  statusPill.hidden = isDesktop;
  statusPill.textContent = "";
  statusPill.title = isDesktop ? "" : labelForState(activity.state);
  statusPill.className = `status-pill ${activity.state || "idle"}`;

  sessionList.textContent = "";
  const visibleSessions = isDesktop ? [] : sessions.filter((session) => !isSameSession(session, active)).slice(0, 3);
  const summary = isDesktop ? "" : active ? statusText(active) : `No active ${labelForSource(activity.source)} activity`;
  activeDetail.hidden = !summary;
  activeDetail.textContent = summary;
  for (const session of visibleSessions) {
    const item = document.createElement("li");
    item.className = "session-item";

    const dot = document.createElement("span");
    dot.className = `session-dot ${session.state}`;
    item.append(dot);

    const body = document.createElement("span");
    body.className = "session-body";

    const title = document.createElement("strong");
    title.className = "session-title";
    title.textContent = displayTitle(session, activity.source);
    body.append(title);

    const detail = document.createElement("span");
    detail.className = "session-detail";
    detail.textContent = statusText(session);
    body.append(detail);
    item.append(body);

    const time = document.createElement("span");
    time.className = "session-time";
    time.textContent = relativeTime(session.updatedAt);
    item.append(time);

    sessionList.append(item);
  }
  if (popoverOpen) positionPopover(threadPopover);
}

function isSameSession(left, right) {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;
  if (left.sessionPath && right.sessionPath && left.sessionPath === right.sessionPath) return true;
  return false;
}

function displayTitle(session, source) {
  const title = String(session?.title || "").trim();
  if (!title || isInternalId(title)) return `${labelForSource(source)} thread`;
  return title;
}

function isInternalId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function statusText(session) {
  const state = session?.state || "idle";
  const raw = String(session?.latestEvent || session?.detail || "").trim();
  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (state === "running") return "Working now";
  if (state === "waiting") return "Needs your input";
  if (state === "failed") return "Needs attention";
  if (state === "review") return "Ready for review";
  if (!raw) return labelForState(state);
  if (["task complete", "complete", "completed", "done", "finished: stop", "session idle", "assistant response"].includes(normalized)) return "Ready for review";
  if (["message updated", "message part updated", "assistant running", "response text"].includes(normalized)) return "Working now";
  if (normalized.startsWith("tool:")) return "Using a tool";
  if (normalized === "tool output") return "Tool finished";
  return labelForState(state);
}

function labelForSource(source) {
  return {
    codex: "Codex",
    opencode: "OpenCode",
    "claude-code": "Claude Code",
    t3code: "T3Code",
    "json-status": "Status file",
    desktop: "Desktop",
  }[source] || "Agent";
}

function labelForState(state) {
  return {
    running: "Running",
    waiting: "Waiting",
    failed: "Failed",
    review: "Review",
    idle: "Idle",
  }[state] || "Idle";
}

function relativeTime(value) {
  const date = new Date(value);
  const deltaMs = Date.now() - date.getTime();
  if (!Number.isFinite(deltaMs)) return "";
  const minutes = Math.max(0, Math.round(deltaMs / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

async function boot() {
  const settings = await window.codexPets.getSettings().catch(() => ({
    selectedPetId: "",
    selectedState: "auto",
    provider: "codex",
    petSize: 112,
    statusFile: "",
  }));
  statusFile = statusFile || settings.statusFile || "";
  provider = provider || settings.provider || "codex";
  petSize = petSize || settings.petSize || 112;
  requestedState = initialState || settings.selectedState || "auto";
  pets = await window.codexPets.listPets(codexHome);
  petSelect.textContent = "";
  for (const pet of pets) {
    const option = document.createElement("option");
    option.value = pet.id;
    option.textContent = pet.displayName;
    petSelect.append(option);
  }
  selectPet(initialPetId || settings.selectedPetId);
  statusFileInput.value = statusFile;
  providerSelect.value = provider;
  petSizeInput.value = String(petSize);
  applyPetSize(petSize);
  stateSelect.value = requestedState;
  updateProviderControls();
  setState(requestedState === "auto" ? "idle" : requestedState);
  await refreshActivity();
  window.setInterval(() => refreshActivity().catch(console.error), 1500);
}

function setWindowMousePassthrough(ignore) {
  if (!window.codexPets?.setIgnoreMouseEvents || ignoringMouseEvents === ignore) return;
  ignoringMouseEvents = ignore;
  window.codexPets.setIgnoreMouseEvents(ignore, ignore ? { forward: true } : undefined);
}

function isInteractivePoint(event) {
  if (event.buttons) return true;
  const elements = document.elementsFromPoint(event.clientX, event.clientY);
  return elements.some((element) => {
    if (!(element instanceof Element)) return false;
    if (element.closest(".pet-stage")) return true;
    if (popoverOpen && element.closest(".thread-popover")) return true;
    if (settingsOpen && element.closest(".settings-popover")) return true;
    return false;
  });
}

function updateMousePassthrough(event) {
  setWindowMousePassthrough(!isInteractivePoint(event));
}

function setPopoverOpen(value) {
  popoverOpen = value;
  if (popoverOpen) setSettingsOpen(false);
  appElement.classList.toggle("activity-open", popoverOpen);
  threadPopover.classList.toggle("is-open", popoverOpen);
  threadPopover.setAttribute("aria-hidden", String(!popoverOpen));
  if (popoverOpen) positionPopover(threadPopover);
}

function setSettingsOpen(value) {
  settingsOpen = value;
  if (settingsOpen) setPopoverOpen(false);
  appElement.classList.toggle("settings-open", settingsOpen);
  settingsPopover.classList.toggle("is-open", settingsOpen);
  settingsPopover.setAttribute("aria-hidden", String(!settingsOpen));
  if (settingsOpen) positionPopover(settingsPopover);
  else appElement.style.setProperty("--pet-shift", "0px");
}

function applyPetSize(value) {
  petSize = Math.min(160, Math.max(72, Math.round(Number(value) || 112)));
  document.getElementById("app").style.setProperty("--pet-size", `${petSize}px`);
  petSizeInput.value = String(petSize);
  if (popoverOpen) positionPopover(threadPopover);
  if (settingsOpen) positionPopover(settingsPopover);
}

function positionPopover(popover) {
  if (popover === threadPopover) {
    positionThreadPopover();
    return;
  }
  if (popover === settingsPopover) {
    positionSettingsPopover();
    return;
  }
  const appRect = document.getElementById("app").getBoundingClientRect();
  const petRect = petElement.getBoundingClientRect();
  popover.style.maxHeight = "";
  popover.style.overflowY = "";
  const layout = calculatePopoverLayout({
    appWidth: appRect.width,
    petRect: {
      left: petRect.left,
      top: petRect.top,
      width: petRect.width,
      height: petRect.height,
    },
    popoverWidth: popover.offsetWidth || 276,
    popoverHeight: popover.scrollHeight || popover.offsetHeight || 96,
    constrainAbove: popover === settingsPopover,
  });
  popover.style.left = `${layout.left}px`;
  popover.style.top = `${layout.top}px`;
  if (layout.maxHeight !== null) {
    popover.style.maxHeight = `${layout.maxHeight}px`;
    popover.style.overflowY = "auto";
  }
}

function positionSettingsPopover() {
  const appRect = appElement.getBoundingClientRect();
  settingsPopover.style.maxHeight = "";
  settingsPopover.style.overflowY = "";

  const margin = 8;
  const gap = 12;
  const width = settingsPopover.offsetWidth || 276;
  const naturalHeight = settingsPopover.scrollHeight || settingsPopover.offsetHeight || 96;
  const maxHeight = Math.max(96, appRect.height - margin * 2);
  const height = Math.min(naturalHeight, maxHeight);
  const basePetRect = layoutRectInApp(petElement);
  const left = clamp(basePetRect.left + basePetRect.width / 2 - width / 2, margin, appRect.width - width - margin);
  const top = margin;
  const requiredPetShift = Math.max(0, top + height + gap - basePetRect.top);

  settingsPopover.style.left = `${Math.round(left)}px`;
  settingsPopover.style.top = `${top}px`;
  if (naturalHeight > maxHeight) {
    settingsPopover.style.maxHeight = `${Math.round(maxHeight)}px`;
    settingsPopover.style.overflowY = "auto";
  }
  appElement.style.setProperty("--pet-shift", `${Math.round(requiredPetShift)}px`);
}

function positionThreadPopover() {
  const appRect = appElement.getBoundingClientRect();
  threadPopover.style.maxHeight = "";
  threadPopover.style.overflowY = "";

  const margin = 8;
  const gap = 12;
  const width = threadPopover.offsetWidth || 300;
  const height = threadPopover.scrollHeight || threadPopover.offsetHeight || 96;
  const basePetRect = layoutRectInApp(petElement);
  const left = clamp(basePetRect.left + basePetRect.width / 2 - width / 2, margin, appRect.width - width - margin);
  const top = Math.max(margin, basePetRect.top - height - gap);

  threadPopover.style.left = `${Math.round(left)}px`;
  threadPopover.style.top = `${top}px`;
  appElement.style.setProperty("--pet-shift", "0px");
}

function layoutRectInApp(element) {
  let left = 0;
  let top = 0;
  let node = element;
  while (node && node !== appElement) {
    left += node.offsetLeft || 0;
    top += node.offsetTop || 0;
    node = node.offsetParent;
  }
  return {
    left,
    top,
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
}

function calculatePopoverLayout(options) {
  const gap = options.gap ?? 8;
  const margin = options.margin ?? 8;
  const width = Math.min(options.popoverWidth, Math.max(0, options.appWidth - margin * 2));
  const availableAbove = Math.max(0, options.petRect.top - gap - margin);
  const needsConstraint = Boolean(options.constrainAbove && options.popoverHeight > availableAbove);
  const height = needsConstraint ? availableAbove : options.popoverHeight;
  const left = clamp(
    options.petRect.left + options.petRect.width / 2 - width / 2,
    margin,
    options.appWidth - width - margin,
  );
  const top = Math.max(margin, options.petRect.top - height - gap);

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
    maxHeight: needsConstraint ? Math.round(height) : null,
  };
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function updateProviderControls() {
  statusFileRow.hidden = provider !== "json-status";
}

petSelect.addEventListener("change", () => selectPet(petSelect.value));
stateSelect.addEventListener("change", () => setRequestedState(stateSelect.value));
providerSelect.addEventListener("change", () => {
  provider = providerSelect.value;
  updateProviderControls();
  window.codexPets.updateSettings({ provider }).catch(console.error);
  refreshActivity().catch(console.error);
});
petSizeInput.addEventListener("input", () => {
  applyPetSize(petSizeInput.value);
});
petSizeInput.addEventListener("change", () => {
  window.codexPets.updateSettings({ petSize }).catch(console.error);
});
statusFileInput.addEventListener("change", () => {
  statusFile = statusFileInput.value.trim();
  window.codexPets.updateSettings({ statusFile }).catch(console.error);
  refreshActivity().catch(console.error);
});
petElement.addEventListener("dblclick", () => setState("waving"));
threadBadge.addEventListener("click", () => setPopoverOpen(!popoverOpen));
settingsButton.addEventListener("click", () => setSettingsOpen(!settingsOpen));
window.addEventListener("mousemove", updateMousePassthrough);
window.addEventListener("mouseleave", () => setWindowMousePassthrough(true));
window.addEventListener("mousedown", () => setWindowMousePassthrough(false));
window.addEventListener("mouseup", (event) => updateMousePassthrough(event));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setPopoverOpen(false);
    setSettingsOpen(false);
  }
});
window.addEventListener("focus", () => refreshActivity().catch(console.error));
window.addEventListener("resize", () => {
  if (popoverOpen) positionPopover(threadPopover);
  if (settingsOpen) positionPopover(settingsPopover);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshActivity().catch(console.error);
});

boot().catch((error) => {
  console.error(error);
});
setWindowMousePassthrough(true);
