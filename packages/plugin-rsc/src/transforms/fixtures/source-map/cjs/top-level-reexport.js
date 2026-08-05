if (true) {
  module.exports = require('./cjs/use-sync-external-store.production.js')
} else {
  module.exports = require('./cjs/use-sync-external-store.development.js')
}
