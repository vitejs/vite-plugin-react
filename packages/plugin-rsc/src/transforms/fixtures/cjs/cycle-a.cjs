module.exports = { phase: 'before requiring B' }

const b = require('./cycle-b.cjs')

module.exports = { phase: 'after requiring B', capturedByB: b.captured }
