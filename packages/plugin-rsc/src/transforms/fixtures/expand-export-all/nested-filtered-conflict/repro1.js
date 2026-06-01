// this doesn't fail but it should. potentially node/v8 bug.
// node packages/plugin-rsc/src/transforms/fixtures/expand-export-all/nested-filtered-conflict/repro1.js
import * as ns from './entry.js'
console.log(ns.a)
