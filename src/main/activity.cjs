const { readProviderActivity } = require("./providers/index.cjs");

async function readActivity(options) {
  return readProviderActivity(options);
}

module.exports = {
  readActivity,
};
