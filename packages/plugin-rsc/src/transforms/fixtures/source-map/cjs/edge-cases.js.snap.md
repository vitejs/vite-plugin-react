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

[Source map visualization](https://evanw.github.io/source-map-visualization/#OTA0AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIG0uX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gfHwgImRlZmF1bHQiIGluIG0gJiYgT2JqZWN0LmtleXMobSkuZXZlcnkoKGspID0+IGsgPT09ICJkZWZhdWx0IiB8fCBtW2tdID09PSBtLmRlZmF1bHRba10pID8gbS5kZWZhdWx0IDogbTt9CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8wID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgndGUnICsgJ3N0JykpOwpjb25zdCBfX2Nqc190b19lc21faG9pc3RfMSA9IF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJ3Rlc3QnKSk7CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8yID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgndGVzdCcpKTsKY29uc3QgeDEgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgndGUnICsgJ3N0JykpKQpjb25zdCB4MiA9IChfX2Nqc19pbnRlcm9wX18oYXdhaXQgaW1wb3J0KCd0ZXN0JykpKSgpLnRlc3QKY29uc29sZS5sb2coKF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJ3Rlc3QnKSkpKQoKZnVuY3Rpb24gdGVzdCgpIHsKICBjb25zdCB5MSA9IF9fY2pzX3RvX2VzbV9ob2lzdF8wCiAgY29uc3QgeTIgPSBfX2Nqc190b19lc21faG9pc3RfMSgpLnRlc3QKICBjb25zb2UubG9nKF9fY2pzX3RvX2VzbV9ob2lzdF8yKQp9Cgo7X192aXRlX3Nzcl9leHBvcnRBbGxfXyhtb2R1bGUuZXhwb3J0cyk7CmV4cG9ydCBkZWZhdWx0IG1vZHVsZS5leHBvcnRzOwpleHBvcnQgY29uc3QgX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gPSB0cnVlOwo3MzcAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCB4MSA9IHJlcXVpcmUoJ3RlJyArICdzdCcpXG5jb25zdCB4MiA9IHJlcXVpcmUoJ3Rlc3QnKSgpLnRlc3RcbmNvbnNvbGUubG9nKHJlcXVpcmUoJ3Rlc3QnKSlcblxuZnVuY3Rpb24gdGVzdCgpIHtcbiAgY29uc3QgeTEgPSByZXF1aXJlKCd0ZScgKyAnc3QnKVxuICBjb25zdCB5MiA9IHJlcXVpcmUoJ3Rlc3QnKSgpLnRlc3RcbiAgY29uc29lLmxvZyhyZXF1aXJlKCd0ZXN0JykpXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsNkJBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM5QixLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyw2QkFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUM7O0FBRTNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBZSxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBZTtBQUM1Qjs7Ozs7In0=)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
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
export const __cjs_module_runner_transform = true;
```
