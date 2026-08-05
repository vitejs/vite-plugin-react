## Input

```js
const x1 = require("te" + "st");
const x2 = require("test")().test;
console.log(require("test"))

function test() {
  const y1 = require("te" + "st");
  const y2 = require("test")().test;
  consoe.log(require("test"))
}
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#OTA4AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIG0uX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gfHwgImRlZmF1bHQiIGluIG0gJiYgT2JqZWN0LmtleXMobSkuZXZlcnkoKGspID0+IGsgPT09ICJkZWZhdWx0IiB8fCBtW2tdID09PSBtLmRlZmF1bHRba10pID8gbS5kZWZhdWx0IDogbTt9CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8wID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgidGUiICsgInN0IikpOwpjb25zdCBfX2Nqc190b19lc21faG9pc3RfMSA9IF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoInRlc3QiKSk7CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8yID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgidGVzdCIpKTsKY29uc3QgeDEgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgidGUiICsgInN0IikpKTsKY29uc3QgeDIgPSAoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgidGVzdCIpKSkoKS50ZXN0Owpjb25zb2xlLmxvZygoX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgidGVzdCIpKSkpCgpmdW5jdGlvbiB0ZXN0KCkgewogIGNvbnN0IHkxID0gX19janNfdG9fZXNtX2hvaXN0XzA7CiAgY29uc3QgeTIgPSBfX2Nqc190b19lc21faG9pc3RfMSgpLnRlc3Q7CiAgY29uc29lLmxvZyhfX2Nqc190b19lc21faG9pc3RfMikKfQoKO19fdml0ZV9zc3JfZXhwb3J0QWxsX18obW9kdWxlLmV4cG9ydHMpOwpleHBvcnQgZGVmYXVsdCBtb2R1bGUuZXhwb3J0czsKZXhwb3J0IGNvbnN0IF9fY2pzX21vZHVsZV9ydW5uZXJfdHJhbnNmb3JtID0gdHJ1ZTsKNzgwAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgeDEgPSByZXF1aXJlKFwidGVcIiArIFwic3RcIik7XG5jb25zdCB4MiA9IHJlcXVpcmUoXCJ0ZXN0XCIpKCkudGVzdDtcbmNvbnNvbGUubG9nKHJlcXVpcmUoXCJ0ZXN0XCIpKVxuXG5mdW5jdGlvbiB0ZXN0KCkge1xuICBjb25zdCB5MSA9IHJlcXVpcmUoXCJ0ZVwiICsgXCJzdFwiKTtcbiAgY29uc3QgeTIgPSByZXF1aXJlKFwidGVzdFwiKSgpLnRlc3Q7XG4gIGNvbnNvZS5sb2cocmVxdWlyZShcInRlc3RcIikpXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsNkJBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDO0FBQy9CLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLDZCQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDOztBQUUzQixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0FBQ2pDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ25DLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG9CQUFlO0FBQzVCOzs7OzsifQ==)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
const __cjs_to_esm_hoist_0 = __cjs_interop__(await import("te" + "st"));
const __cjs_to_esm_hoist_1 = __cjs_interop__(await import("test"));
const __cjs_to_esm_hoist_2 = __cjs_interop__(await import("test"));
const x1 = (__cjs_interop__(await import("te" + "st")));
const x2 = (__cjs_interop__(await import("test")))().test;
console.log((__cjs_interop__(await import("test"))))

function test() {
  const y1 = __cjs_to_esm_hoist_0;
  const y2 = __cjs_to_esm_hoist_1().test;
  consoe.log(__cjs_to_esm_hoist_2)
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
```
