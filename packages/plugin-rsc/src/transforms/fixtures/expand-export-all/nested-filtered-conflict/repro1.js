// this doesn't fail but it should. potentially node/v8 bug.
// node packages/plugin-rsc/src/transforms/fixtures/expand-export-all/nested-filtered-conflict/repro1.js
// similar class of issue but different
// https://github.com/nodejs/node/issues/53707
// https://chromium.googlesource.com/v8/v8/+/88760dadfba1457aea76e50e6ead3b87f868c7fb
import * as ns from './entry.js'
console.log(ns.a)
