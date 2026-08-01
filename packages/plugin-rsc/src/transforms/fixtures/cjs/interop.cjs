// Node require(esm) interop semantics:
// https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require
const callable = require('./marker-callable.mjs')
const falsy = require('./marker-falsy.mjs')
const defaultOnlyNull = require('./null-default-only.mjs')
const genuineEsm = require('./null-default.mjs')

exports.markerCallable = callable() === 'ok'
exports.markerFalsy = falsy === false
exports.defaultOnlyNull = defaultOnlyNull === null
exports.nullDefaultNamespace =
  genuineEsm.default === null && genuineEsm.named === 'ok'
