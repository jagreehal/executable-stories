// CJS shim for Cypress reporter (Cypress uses require() without package.json exports support)
module.exports = require("./dist/reporter.cjs");
