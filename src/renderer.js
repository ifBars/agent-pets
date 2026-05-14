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
const statusPill = document.getElementById("statusPill");
const sessionList = document.getElementById("sessionList");
const sourceLabel = document.getElementById("sourceLabel");

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
  const repeated = [...frames, ...frames, ...frames];
  return { frames: [...repeated, ...LONG_IDLE_FRAMES], loopStartIndex: repeated.length };
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
  sourceLabel.textContent = labelForSource(activity.source);
  threadBadge.textContent = isDesktop ? "0" : String(Math.min(99, badgeCount));
  threadBadge.className = `thread-badge ${isDesktop ? "idle" : activity.state || "idle"}`;
  threadBadge.title = isDesktop ? "Desktop pet controls" : `${badgeCount} ${badgeCount === 1 ? "thread" : "threads"}`;
  activeTitle.textContent = active?.title || (isDesktop ? "Desktop Pet" : `No ${labelForSource(activity.source)} sessions found`);
  statusPill.hidden = isDesktop;
  statusPill.textContent = isDesktop ? "" : labelForState(activity.state);
  statusPill.className = `status-pill ${activity.state || "idle"}`;

  sessionList.textContent = "";
  const visibleSessions = isDesktop ? [] : sessions.filter((session) => !active || session.id !== active.id).slice(0, 3);
  const summary = isDesktop ? "" : summarizeActivity(active, visibleSessions.length, activity.source);
  activeDetail.hidden = !summary;
  activeDetail.textContent = summary;
  for (const session of visibleSessions) {
    const item = document.createElement("li");
    item.className = "session-item";

    const dot = document.createElement("span");
    dot.className = `session-dot ${session.state}`;
    item.append(dot);

    const title = document.createElement("span");
    title.className = "session-title";
    title.textContent = session.title;
    item.append(title);

    const time = document.createElement("span");
    time.className = "session-time";
    time.textContent = relativeTime(session.updatedAt);
    item.append(time);

    sessionList.append(item);
  }
  if (popoverOpen) positionPopover(threadPopover);
}

function summarizeActivity(active, otherCount, source) {
  if (!active) return `No active ${labelForSource(source)} activity`;
  return otherCount > 0 ? `${otherCount} more ${otherCount === 1 ? "session" : "sessions"}` : "";
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

function setPopoverOpen(value) {
  popoverOpen = value;
  if (popoverOpen) setSettingsOpen(false);
  threadPopover.classList.toggle("is-open", popoverOpen);
  threadPopover.setAttribute("aria-hidden", String(!popoverOpen));
  if (popoverOpen) positionPopover(threadPopover);
}

function setSettingsOpen(value) {
  settingsOpen = value;
  if (settingsOpen) setPopoverOpen(false);
  settingsPopover.classList.toggle("is-open", settingsOpen);
  settingsPopover.setAttribute("aria-hidden", String(!settingsOpen));
  if (settingsOpen) positionPopover(settingsPopover);
}

function applyPetSize(value) {
  petSize = Math.min(160, Math.max(72, Math.round(Number(value) || 112)));
  document.getElementById("app").style.setProperty("--pet-size", `${petSize}px`);
  petSizeInput.value = String(petSize);
  if (popoverOpen) positionPopover(threadPopover);
  if (settingsOpen) positionPopover(settingsPopover);
}

function positionPopover(popover) {
  const appRect = document.getElementById("app").getBoundingClientRect();
  const petRect = petElement.getBoundingClientRect();
  const width = popover.offsetWidth || 276;
  const height = popover.offsetHeight || 96;
  const gap = 8;
  const left = Math.min(appRect.width - width - 8, Math.max(8, petRect.left + petRect.width / 2 - width / 2));
  const top = Math.max(8, petRect.top - height - gap);
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
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
