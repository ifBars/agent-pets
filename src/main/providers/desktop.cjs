function readDesktopActivity(options = {}) {
  const now = options.now || new Date();
  return {
    source: "desktop",
    state: "idle",
    petState: "idle",
    active: {
      id: "desktop",
      title: "Desktop Pet",
      detail: "Manual companion mode",
      state: "idle",
      petState: "idle",
      updatedAt: now.toISOString(),
      latestEvent: "Manual companion mode",
    },
    sessions: [],
    updatedAt: now.toISOString(),
  };
}

module.exports = {
  readDesktopActivity,
};
