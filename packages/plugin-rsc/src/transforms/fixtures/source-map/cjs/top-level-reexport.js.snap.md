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

[Source map visualization](https://evanw.github.io/source-map-visualization/#Njk2AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmV4cG9ydCBjb25zdCBfX2Nqc19tb2R1bGVfcnVubmVyX2dldF9leHBvcnRzID0gKCkgPT4gbW9kdWxlLmV4cG9ydHM7CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIHR5cGVvZiBtLl9fY2pzX21vZHVsZV9ydW5uZXJfZ2V0X2V4cG9ydHMgPT09ICJmdW5jdGlvbiIgPyBtLl9fY2pzX21vZHVsZV9ydW5uZXJfZ2V0X2V4cG9ydHMoKSA6ICJkZWZhdWx0IiBpbiBtICYmIE9iamVjdC5rZXlzKG0pLmV2ZXJ5KChrKSA9PiBrID09PSAiZGVmYXVsdCIgfHwgbVtrXSA9PT0gbS5kZWZhdWx0W2tdKSA/IG0uZGVmYXVsdCA6IG07fQppZiAodHJ1ZSkgewogIG1vZHVsZS5leHBvcnRzID0gKF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJy4vY2pzL3VzZS1zeW5jLWV4dGVybmFsLXN0b3JlLnByb2R1Y3Rpb24uanMnKSkpCn0gZWxzZSB7CiAgbW9kdWxlLmV4cG9ydHMgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgnLi9janMvdXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUuZGV2ZWxvcG1lbnQuanMnKSkpCn0KCjtfX3ZpdGVfc3NyX2V4cG9ydEFsbF9fKG1vZHVsZS5leHBvcnRzKTsKZXhwb3J0IGRlZmF1bHQgbW9kdWxlLmV4cG9ydHM7CjYwOAB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImlmICh0cnVlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9janMvdXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUucHJvZHVjdGlvbi5qcycpXG59IGVsc2Uge1xuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vY2pzL3VzZS1zeW5jLWV4dGVybmFsLXN0b3JlLmRldmVsb3BtZW50LmpzJylcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsNkJBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7QUFDeEUsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNQLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyw2QkFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztBQUN6RTs7OzsifQ==)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
export const __cjs_module_runner_get_exports = () => module.exports;
function __cjs_interop__(m) {return typeof m.__cjs_module_runner_get_exports === "function" ? m.__cjs_module_runner_get_exports() : "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
if (true) {
  module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.production.js')))
} else {
  module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.development.js')))
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
```
