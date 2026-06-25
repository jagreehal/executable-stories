// CJS shim for Cypress reporter (Cypress uses require() without package.json exports support).
// Mocha requires this module to BE the reporter constructor, so export the
// default (createReporter) directly — not the { default, ... } namespace object,
// which Mocha rejects as "invalid reporter '[object Object]'".
module.exports = require("./dist/reporter.cjs").default;
