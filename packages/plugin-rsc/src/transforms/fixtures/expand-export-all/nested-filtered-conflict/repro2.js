// this fails as expected.
// node packages/plugin-rsc/src/transforms/fixtures/expand-export-all/nested-filtered-conflict/repro2.js
import { a } from './entry.js'
console.log(a)
