## Input

```js
if (true) {
  module.exports = require('./cjs/use-sync-external-store.production.js');
} else {
  module.exports = require('./cjs/use-sync-external-store.development.js');
}
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#NjE5AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIG0uX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gfHwgImRlZmF1bHQiIGluIG0gJiYgT2JqZWN0LmtleXMobSkuZXZlcnkoKGspID0+IGsgPT09ICJkZWZhdWx0IiB8fCBtW2tdID09PSBtLmRlZmF1bHRba10pID8gbS5kZWZhdWx0IDogbTt9CmlmICh0cnVlKSB7CiAgbW9kdWxlLmV4cG9ydHMgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgnLi9janMvdXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUucHJvZHVjdGlvbi5qcycpKSk7Cn0gZWxzZSB7CiAgbW9kdWxlLmV4cG9ydHMgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgnLi9janMvdXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUuZGV2ZWxvcG1lbnQuanMnKSkpOwp9Cgo7X192aXRlX3Nzcl9leHBvcnRBbGxfXyhtb2R1bGUuZXhwb3J0cyk7CmV4cG9ydCBkZWZhdWx0IG1vZHVsZS5leHBvcnRzOwpleHBvcnQgY29uc3QgX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gPSB0cnVlOwo2MjAAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpZiAodHJ1ZSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vY2pzL3VzZS1zeW5jLWV4dGVybmFsLXN0b3JlLnByb2R1Y3Rpb24uanMnKTtcbn0gZWxzZSB7XG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9janMvdXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUuZGV2ZWxvcG1lbnQuanMnKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyw2QkFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFDO0FBQ3pFLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDUCxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsNkJBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBQztBQUMxRTs7Ozs7In0=)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
if (true) {
  module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.production.js')));
} else {
  module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.development.js')));
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
```
