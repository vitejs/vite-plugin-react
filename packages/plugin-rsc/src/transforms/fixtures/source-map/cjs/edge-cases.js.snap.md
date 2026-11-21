## Input

```js
const x1 = require('te' + 'st')
const x2 = require('test')().test
console.log(require('test'))

function test() {
  const y1 = require('te' + 'st')
  const y2 = require('test')().test
  consoe.log(require('test'))
}
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#OTgzAGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmV4cG9ydCBjb25zdCBfX2Nqc19tb2R1bGVfcnVubmVyX2dldF9leHBvcnRzID0gKCkgPT4gbW9kdWxlLmV4cG9ydHM7CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIHR5cGVvZiBtLl9fY2pzX21vZHVsZV9ydW5uZXJfZ2V0X2V4cG9ydHMgPT09ICJmdW5jdGlvbiIgPyBtLl9fY2pzX21vZHVsZV9ydW5uZXJfZ2V0X2V4cG9ydHMoKSA6ICJkZWZhdWx0IiBpbiBtICYmIE9iamVjdC5rZXlzKG0pLmV2ZXJ5KChrKSA9PiBrID09PSAiZGVmYXVsdCIgfHwgbVtrXSA9PT0gbS5kZWZhdWx0W2tdKSA/IG0uZGVmYXVsdCA6IG07fQpjb25zdCBfX2Nqc190b19lc21faG9pc3RfMCA9IF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJ3RlJyArICdzdCcpKTsKY29uc3QgX19janNfdG9fZXNtX2hvaXN0XzEgPSBfX2Nqc19pbnRlcm9wX18oYXdhaXQgaW1wb3J0KCd0ZXN0JykpOwpjb25zdCBfX2Nqc190b19lc21faG9pc3RfMiA9IF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJ3Rlc3QnKSk7CmNvbnN0IHgxID0gKF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJ3RlJyArICdzdCcpKSkKY29uc3QgeDIgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgndGVzdCcpKSkoKS50ZXN0CmNvbnNvbGUubG9nKChfX2Nqc19pbnRlcm9wX18oYXdhaXQgaW1wb3J0KCd0ZXN0JykpKSkKCmZ1bmN0aW9uIHRlc3QoKSB7CiAgY29uc3QgeTEgPSBfX2Nqc190b19lc21faG9pc3RfMAogIGNvbnN0IHkyID0gX19janNfdG9fZXNtX2hvaXN0XzEoKS50ZXN0CiAgY29uc29lLmxvZyhfX2Nqc190b19lc21faG9pc3RfMikKfQoKO19fdml0ZV9zc3JfZXhwb3J0QWxsX18obW9kdWxlLmV4cG9ydHMpOwpleHBvcnQgZGVmYXVsdCBtb2R1bGUuZXhwb3J0czsKNzM3AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgeDEgPSByZXF1aXJlKCd0ZScgKyAnc3QnKVxuY29uc3QgeDIgPSByZXF1aXJlKCd0ZXN0JykoKS50ZXN0XG5jb25zb2xlLmxvZyhyZXF1aXJlKCd0ZXN0JykpXG5cbmZ1bmN0aW9uIHRlc3QoKSB7XG4gIGNvbnN0IHkxID0gcmVxdWlyZSgndGUnICsgJ3N0JylcbiAgY29uc3QgeTIgPSByZXF1aXJlKCd0ZXN0JykoKS50ZXN0XG4gIGNvbnNvZS5sb2cocmVxdWlyZSgndGVzdCcpKVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyw2QkFBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzlCLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLDZCQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQzs7QUFFM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFlLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG9CQUFlO0FBQzVCOzs7OyJ9)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
export const __cjs_module_runner_get_exports = () => module.exports;
function __cjs_interop__(m) {return typeof m.__cjs_module_runner_get_exports === "function" ? m.__cjs_module_runner_get_exports() : "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
const __cjs_to_esm_hoist_0 = __cjs_interop__(await import('te' + 'st'));
const __cjs_to_esm_hoist_1 = __cjs_interop__(await import('test'));
const __cjs_to_esm_hoist_2 = __cjs_interop__(await import('test'));
const x1 = (__cjs_interop__(await import('te' + 'st')))
const x2 = (__cjs_interop__(await import('test')))().test
console.log((__cjs_interop__(await import('test'))))

function test() {
  const y1 = __cjs_to_esm_hoist_0
  const y2 = __cjs_to_esm_hoist_1().test
  consoe.log(__cjs_to_esm_hoist_2)
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
```
