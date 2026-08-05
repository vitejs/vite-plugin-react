## Input

```js
if (true) {
  module.exports = require('./cjs/use-sync-external-store.production.js')
} else {
  module.exports = require('./cjs/use-sync-external-store.development.js')
}
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#NjE3AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIG0uX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gfHwgImRlZmF1bHQiIGluIG0gJiYgT2JqZWN0LmtleXMobSkuZXZlcnkoKGspID0+IGsgPT09ICJkZWZhdWx0IiB8fCBtW2tdID09PSBtLmRlZmF1bHRba10pID8gbS5kZWZhdWx0IDogbTt9CmlmICh0cnVlKSB7CiAgbW9kdWxlLmV4cG9ydHMgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgnLi9janMvdXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUucHJvZHVjdGlvbi5qcycpKSkKfSBlbHNlIHsKICBtb2R1bGUuZXhwb3J0cyA9IChfX2Nqc19pbnRlcm9wX18oYXdhaXQgaW1wb3J0KCcuL2Nqcy91c2Utc3luYy1leHRlcm5hbC1zdG9yZS5kZXZlbG9wbWVudC5qcycpKSkKfQoKO19fdml0ZV9zc3JfZXhwb3J0QWxsX18obW9kdWxlLmV4cG9ydHMpOwpleHBvcnQgZGVmYXVsdCBtb2R1bGUuZXhwb3J0czsKZXhwb3J0IGNvbnN0IF9fY2pzX21vZHVsZV9ydW5uZXJfdHJhbnNmb3JtID0gdHJ1ZTsKNjA4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaWYgKHRydWUpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2Nqcy91c2Utc3luYy1leHRlcm5hbC1zdG9yZS5wcm9kdWN0aW9uLmpzJylcbn0gZWxzZSB7XG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9janMvdXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUuZGV2ZWxvcG1lbnQuanMnKVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDZCQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDUCxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsNkJBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7QUFDekU7Ozs7OyJ9)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
if (true) {
  module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.production.js')))
} else {
  module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.development.js')))
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
```
