const lib = require('@vitejs/test-dep-cjs-falsy-primitive')

exports.ok = lib === false
