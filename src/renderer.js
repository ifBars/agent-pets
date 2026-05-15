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
const ACTIVE_REFRESH_MS = 3000;
const IDLE_REFRESH_MS = 8000;
const DESKTOP_REFRESH_MS = 30000;
const DRAG_MOVE_MIN_MS = 16;
const ROAM_MIN_DELAY_MS = 6000;
const ROAM_MAX_DELAY_MS = 14000;
const ROAM_SPEED_PX_PER_SECOND = 90;

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
let petDragging = false;
let suppressNextPetClick = false;
let lastDragScreenX = 0;
let lastDragScreenY = 0;
let pendingDragDeltaX = 0;
let pendingDragDeltaY = 0;
let lastDragMoveAt = 0;
let refreshTimer = null;
let lastActivityState = "idle";
let lastActivityPetState = "idle";
let providers = [];
let providerById = new Map();
let desktopRoamingEnabled = false;
let desktopRoamingRadius = 96;
let roamOffsetX = 0;
let roamOffsetY = 0;
let roamTarget = null;
let roamTimer = null;
let roamAnimationFrame = null;
let roamLastStepAt = 0;
let interactionTimer = null;
let temporaryReactionActive = false;
let settingsRepositionFrame = null;

const petElement = document.getElementById("pet");
const petStage = document.querySelector(".pet-stage");
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
const roamingToggleRow = document.getElementById("roamingToggleRow");
const roamingToggle = document.getElementById("roamingToggle");
const roamingRadiusInput = document.getElementById("roamingRadiusInput");
const roamingRadiusRow = document.getElementById("roamingRadiusRow");
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
  applyBaseState();
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
    lastActivityPetState = activity.petState || "idle";
    applyBaseState();
  } finally {
    refreshInFlight = false;
    if (refreshQueued) {
      refreshQueued = false;
      window.setTimeout(() => refreshActivity().catch(console.error), 0);
    } else {
      scheduleNextRefresh();
    }
  }
}

function renderActivity(activity) {
  const active = activity.active;
  const sessions = activity.sessions || [];
  const isDesktop = activity.source === "desktop";
  const badgeCount = sessions.filter(isBadgeSession).length;
  lastActivityState = activity.state || "idle";
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
  const visibleSessions = isDesktop ? [] : sessions.filter((session) => !isSameSession(session, active) && isBadgeSession(session)).slice(0, 3);
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
  updateDesktopRoamingAvailability();
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

function isBadgeSession(session) {
  return session?.state === "running" || session?.state === "waiting" || session?.state === "failed";
}

function labelForSource(source) {
  return providerById.get(source)?.label || "Agent";
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
  providers = await loadProviders();
  providerById = new Map(providers.map((item) => [item.id, item]));
  renderProviderOptions();
  const settings = await window.codexPets.getSettings().catch(() => ({
    selectedPetId: "",
    selectedState: "auto",
    provider: "codex",
    petSize: 112,
    desktopRoamingEnabled: false,
    desktopRoamingRadius: 96,
    statusFile: "",
  }));
  statusFile = statusFile || settings.statusFile || "";
  provider = provider || settings.provider || "codex";
  if (!providerById.has(provider)) provider = "codex";
  petSize = petSize || settings.petSize || 112;
  desktopRoamingEnabled = settings.desktopRoamingEnabled === true;
  desktopRoamingRadius = normalizeRoamingRadius(settings.desktopRoamingRadius);
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
  roamingToggle.checked = desktopRoamingEnabled;
  roamingRadiusInput.value = String(desktopRoamingRadius);
  applyPetSize(petSize);
  updateRoamingControls();
  stateSelect.value = requestedState;
  updateProviderControls();
  setState(requestedState === "auto" ? "idle" : requestedState);
  await refreshActivity();
}

async function loadProviders() {
  const fallback = [
    { id: "codex", label: "Codex", modes: ["jsonl"], defaultRefreshMs: IDLE_REFRESH_MS },
    { id: "opencode", label: "OpenCode", modes: ["bridge-file", "command"], defaultRefreshMs: IDLE_REFRESH_MS },
    { id: "claude-code", label: "Claude Code", modes: ["jsonl"], defaultRefreshMs: IDLE_REFRESH_MS },
    { id: "t3code", label: "T3Code", modes: ["command", "jsonl"], defaultRefreshMs: IDLE_REFRESH_MS },
    { id: "json-status", label: "Status file", modes: ["bridge-file"], requiresStatusFile: true, defaultRefreshMs: IDLE_REFRESH_MS },
    { id: "desktop", label: "Desktop", modes: ["manual"], defaultRefreshMs: DESKTOP_REFRESH_MS },
  ];
  if (!window.codexPets?.listProviders) return fallback;
  const listed = await window.codexPets.listProviders().catch(() => fallback);
  return Array.isArray(listed) && listed.length ? listed : fallback;
}

function renderProviderOptions() {
  providerSelect.textContent = "";
  for (const item of providers) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    providerSelect.append(option);
  }
}

function refreshDelayForState() {
  if (lastActivityState === "running" || lastActivityState === "waiting") return ACTIVE_REFRESH_MS;
  return providerById.get(provider)?.defaultRefreshMs || IDLE_REFRESH_MS;
}

function scheduleNextRefresh() {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => refreshActivity().catch(console.error), refreshDelayForState());
}

function setWindowMousePassthrough(ignore) {
  if (!window.codexPets?.setIgnoreMouseEvents || ignoringMouseEvents === ignore) return;
  ignoringMouseEvents = ignore;
  window.codexPets.setIgnoreMouseEvents(ignore, ignore ? { forward: true } : undefined);
}

function isInteractivePoint(event) {
  if (event.buttons) return true;
  return isPointInsideElement(event, petStage) || (popoverOpen && isPointInsideElement(event, threadPopover)) || (settingsOpen && isPointInsideElement(event, settingsPopover));
}

function isPointInsideElement(event, element) {
  if (!element || element.hidden) return false;
  const rect = element.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

function updateMousePassthrough(event) {
  if (petDragging) {
    setWindowMousePassthrough(false);
    return;
  }
  setWindowMousePassthrough(!isInteractivePoint(event));
}

function beginPetDrag(event) {
  if (event.button !== 0) return;
  if (isControlEventTarget(event.target)) return;
  petDragging = true;
  cancelRoamMovement();
  lastDragScreenX = event.screenX;
  lastDragScreenY = event.screenY;
  petStage.classList.add("is-dragging");
  if (isDesktopProvider()) setState("waiting");
  setWindowMousePassthrough(false);
  event.preventDefault();
}

function updatePetDrag(event) {
  if (!petDragging) return;
  const deltaX = event.screenX - lastDragScreenX;
  const deltaY = event.screenY - lastDragScreenY;
  lastDragScreenX = event.screenX;
  lastDragScreenY = event.screenY;
  pendingDragDeltaX += deltaX;
  pendingDragDeltaY += deltaY;
  flushPetDrag(false);
}

function flushPetDrag(force) {
  if (!pendingDragDeltaX && !pendingDragDeltaY) return;
  const now = performance.now();
  if (!force && now - lastDragMoveAt < DRAG_MOVE_MIN_MS) return;
  const deltaX = pendingDragDeltaX;
  const deltaY = pendingDragDeltaY;
  pendingDragDeltaX = 0;
  pendingDragDeltaY = 0;
  lastDragMoveAt = now;
  window.codexPets.moveWindowBy(deltaX, deltaY);
}

function endPetDrag(event) {
  if (!petDragging) return;
  flushPetDrag(true);
  petDragging = false;
  suppressNextPetClick = true;
  window.setTimeout(() => {
    suppressNextPetClick = false;
  }, 0);
  petStage.classList.remove("is-dragging");
  resetRoamHomeAnchor();
  if (isDesktopProvider()) playTemporaryReaction("review", 700);
  updateMousePassthrough(event);
}

function isDesktopProvider() {
  return provider === "desktop";
}

function isControlEventTarget(target) {
  return Boolean(target?.closest?.("button, input, select, textarea"));
}

function setPopoverOpen(value) {
  popoverOpen = value;
  if (popoverOpen) setSettingsOpen(false);
  appElement.classList.toggle("activity-open", popoverOpen);
  threadPopover.classList.toggle("is-open", popoverOpen);
  threadPopover.setAttribute("aria-hidden", String(!popoverOpen));
  if (popoverOpen) positionPopover(threadPopover);
  updateDesktopRoamingAvailability();
}

function setSettingsOpen(value) {
  settingsOpen = value;
  if (settingsOpen) setPopoverOpen(false);
  appElement.classList.toggle("settings-open", settingsOpen);
  settingsPopover.classList.toggle("is-open", settingsOpen);
  settingsPopover.setAttribute("aria-hidden", String(!settingsOpen));
  if (settingsOpen) positionPopover(settingsPopover);
  else if (settingsRepositionFrame) {
    window.cancelAnimationFrame(settingsRepositionFrame);
    settingsRepositionFrame = null;
  }
  updateDesktopRoamingAvailability();
}

function applyPetSize(value) {
  petSize = Math.min(160, Math.max(72, Math.round(Number(value) || 112)));
  document.getElementById("app").style.setProperty("--pet-size", `${petSize}px`);
  petSizeInput.value = String(petSize);
  if (popoverOpen) positionPopover(threadPopover);
  if (settingsOpen) positionPopover(settingsPopover);
}

function normalizeRoamingRadius(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 96;
  return Math.min(180, Math.max(48, Math.round(parsed)));
}

function applyBaseState() {
  if (petDragging || roamTarget || temporaryReactionActive) return;
  setState(requestedState === "auto" ? lastActivityPetState || "idle" : requestedState);
}

function playTemporaryReaction(state, durationMs) {
  if (petDragging) return;
  cancelRoamMovement();
  if (interactionTimer) window.clearTimeout(interactionTimer);
  temporaryReactionActive = true;
  setState(state);
  interactionTimer = window.setTimeout(() => {
    temporaryReactionActive = false;
    interactionTimer = null;
    applyBaseState();
    scheduleRoam();
  }, durationMs);
}

function updateRoamingControls() {
  const desktopControlsVisible = provider === "desktop";
  roamingToggleRow.hidden = !desktopControlsVisible;
  roamingToggle.checked = desktopRoamingEnabled;
  roamingRadiusInput.value = String(desktopRoamingRadius);
  roamingRadiusRow.hidden = !desktopControlsVisible || !desktopRoamingEnabled;
  queueSettingsReposition();
  updateDesktopRoamingAvailability();
}

function queueSettingsReposition() {
  if (!settingsOpen || settingsRepositionFrame) return;
  settingsRepositionFrame = window.requestAnimationFrame(() => {
    settingsRepositionFrame = null;
    if (settingsOpen) positionSettingsPopover();
  });
}

function updateDesktopRoamingAvailability() {
  if (provider !== "desktop" || !desktopRoamingEnabled) {
    cancelRoamMovement();
    return;
  }
  scheduleRoam();
}

function scheduleRoam() {
  if (roamTimer) window.clearTimeout(roamTimer);
  roamTimer = null;
  if (provider !== "desktop" || !desktopRoamingEnabled || petDragging || settingsOpen || popoverOpen || temporaryReactionActive) return;
  const delay = ROAM_MIN_DELAY_MS + Math.random() * (ROAM_MAX_DELAY_MS - ROAM_MIN_DELAY_MS);
  roamTimer = window.setTimeout(startRoamMovement, delay);
}

function startRoamMovement() {
  roamTimer = null;
  if (provider !== "desktop" || !desktopRoamingEnabled || petDragging || settingsOpen || popoverOpen || temporaryReactionActive) {
    scheduleRoam();
    return;
  }
  roamTarget = pickRoamTarget();
  roamLastStepAt = performance.now();
  stepRoamMovement(roamLastStepAt);
}

function pickRoamTarget() {
  const angle = Math.random() * Math.PI * 2;
  const distance = 18 + Math.random() * Math.max(0, desktopRoamingRadius - 18);
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
  };
}

function stepRoamMovement(now) {
  roamAnimationFrame = null;
  if (!roamTarget || petDragging) {
    cancelRoamMovement();
    return;
  }
  const elapsedSeconds = Math.min(0.12, Math.max(0.016, (now - roamLastStepAt) / 1000));
  roamLastStepAt = now;
  const remainingX = roamTarget.x - roamOffsetX;
  const remainingY = roamTarget.y - roamOffsetY;
  const distance = Math.hypot(remainingX, remainingY);
  if (distance < 1) {
    roamOffsetX = roamTarget.x;
    roamOffsetY = roamTarget.y;
    roamTarget = null;
    applyBaseState();
    scheduleRoam();
    return;
  }

  const stepDistance = Math.min(distance, ROAM_SPEED_PX_PER_SECOND * elapsedSeconds);
  const deltaX = (remainingX / distance) * stepDistance;
  const deltaY = (remainingY / distance) * stepDistance;
  roamOffsetX += deltaX;
  roamOffsetY += deltaY;
  setState(deltaX > 0.25 ? "running-right" : deltaX < -0.25 ? "running-left" : "running");
  window.codexPets.moveWindowBy(deltaX, deltaY, { clampToWorkArea: true });
  roamAnimationFrame = window.requestAnimationFrame(stepRoamMovement);
}

function cancelRoamMovement() {
  if (roamTimer) window.clearTimeout(roamTimer);
  if (roamAnimationFrame) window.cancelAnimationFrame(roamAnimationFrame);
  roamTimer = null;
  roamAnimationFrame = null;
  roamTarget = null;
}

function resetRoamHomeAnchor() {
  cancelRoamMovement();
  roamOffsetX = 0;
  roamOffsetY = 0;
  applyBaseState();
  scheduleRoam();
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
  const basePetRect = layoutRectInApp(petElement);
  const petClearanceTop = visualPetClearanceTop(basePetRect);
  const availableAbove = Math.max(72, petClearanceTop - gap - margin);
  const maxHeight = Math.min(naturalHeight, availableAbove);
  const height = Math.min(naturalHeight, maxHeight);
  const left = clamp(basePetRect.left + basePetRect.width / 2 - width / 2, margin, appRect.width - width - margin);
  const top = Math.max(margin, petClearanceTop - height - gap);

  settingsPopover.style.left = `${Math.round(left)}px`;
  settingsPopover.style.top = `${Math.round(top)}px`;
  if (naturalHeight > maxHeight) {
    settingsPopover.style.maxHeight = `${Math.round(maxHeight)}px`;
    settingsPopover.style.overflowY = "auto";
  }
}

function positionThreadPopover() {
  const appRect = appElement.getBoundingClientRect();
  threadPopover.style.maxHeight = "";
  threadPopover.style.overflowY = "";

  const margin = 8;
  const gap = 12;
  const width = threadPopover.offsetWidth || 300;
  const basePetRect = layoutRectInApp(petElement);
  const petClearanceTop = visualPetClearanceTop(basePetRect);
  const availableAbove = Math.max(0, petClearanceTop - gap - margin);
  const height = fitThreadPopoverToAvailableHeight(availableAbove);
  const left = clamp(basePetRect.left + basePetRect.width / 2 - width / 2, margin, appRect.width - width - margin);
  const top = Math.max(margin, petClearanceTop - height - gap);

  threadPopover.style.left = `${Math.round(left)}px`;
  threadPopover.style.top = `${top}px`;
}

function fitThreadPopoverToAvailableHeight(availableHeight) {
  const items = Array.from(sessionList.children);
  for (const item of items) item.hidden = false;

  const measure = () => threadPopover.scrollHeight || threadPopover.offsetHeight || 96;
  let height = measure();
  for (let index = items.length - 1; index >= 0 && height > availableHeight; index -= 1) {
    items[index].hidden = true;
    height = measure();
  }
  return height;
}

function visualPetClearanceTop(rect) {
  return rect.top;
}

function layoutRectInApp(element) {
  const appRect = appElement.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - appRect.left,
    top: rect.top - appRect.top,
    width: rect.width,
    height: rect.height,
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
  statusFileRow.hidden = !providerById.get(provider)?.requiresStatusFile;
}

petSelect.addEventListener("change", () => selectPet(petSelect.value));
stateSelect.addEventListener("change", () => setRequestedState(stateSelect.value));
providerSelect.addEventListener("change", () => {
  provider = providerSelect.value;
  updateProviderControls();
  updateRoamingControls();
  window.codexPets.updateSettings({ provider }).catch(console.error);
  if (refreshTimer) window.clearTimeout(refreshTimer);
  refreshActivity().catch(console.error);
});
petSizeInput.addEventListener("input", () => {
  applyPetSize(petSizeInput.value);
});
petSizeInput.addEventListener("change", () => {
  window.codexPets.updateSettings({ petSize }).catch(console.error);
});
roamingToggle.addEventListener("change", () => {
  desktopRoamingEnabled = roamingToggle.checked;
  window.codexPets.updateSettings({ desktopRoamingEnabled }).catch(console.error);
  updateRoamingControls();
});
roamingRadiusInput.addEventListener("input", () => {
  desktopRoamingRadius = normalizeRoamingRadius(roamingRadiusInput.value);
  roamingRadiusInput.value = String(desktopRoamingRadius);
});
roamingRadiusInput.addEventListener("change", () => {
  desktopRoamingRadius = normalizeRoamingRadius(roamingRadiusInput.value);
  window.codexPets.updateSettings({ desktopRoamingRadius }).catch(console.error);
  resetRoamHomeAnchor();
});
statusFileInput.addEventListener("change", () => {
  statusFile = statusFileInput.value.trim();
  window.codexPets.updateSettings({ statusFile }).catch(console.error);
  refreshActivity().catch(console.error);
});
petStage.addEventListener("click", (event) => {
  if (suppressNextPetClick) return;
  if (!isDesktopProvider() || isControlEventTarget(event.target)) return;
  if (event.detail > 1) return;
  playTemporaryReaction("waiting", 900);
});
petStage.addEventListener("dblclick", (event) => {
  if (suppressNextPetClick) return;
  if (!isDesktopProvider() || isControlEventTarget(event.target)) return;
  playTemporaryReaction("review", 1200);
});
petStage.addEventListener("mousedown", beginPetDrag);
threadBadge.addEventListener("click", () => setPopoverOpen(!popoverOpen));
settingsButton.addEventListener("click", () => setSettingsOpen(!settingsOpen));
window.addEventListener("mousemove", (event) => {
  updatePetDrag(event);
  updateMousePassthrough(event);
});
window.addEventListener("mouseleave", () => {
  flushPetDrag(true);
  if (petDragging) {
    suppressNextPetClick = true;
    window.setTimeout(() => {
      suppressNextPetClick = false;
    }, 0);
  }
  petDragging = false;
  petStage.classList.remove("is-dragging");
  resetRoamHomeAnchor();
  setWindowMousePassthrough(true);
});
window.addEventListener("mousedown", () => setWindowMousePassthrough(false));
window.addEventListener("mouseup", endPetDrag);
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
if (window.ResizeObserver) {
  const settingsResizeObserver = new ResizeObserver(() => queueSettingsReposition());
  settingsResizeObserver.observe(settingsPopover);
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshActivity().catch(console.error);
});

boot().catch((error) => {
  console.error(error);
});
setWindowMousePassthrough(true);
